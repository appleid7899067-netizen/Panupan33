import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { selectToolsForTask, inferTaskIntent } from "@/lib/tool-registry";
import { runGitHubAgent } from "@/lib/github-agent-tools.server";
import { executeAgentCode, runAgentLoop } from "@/lib/agent-loop";
import { runCodexAgent } from "@/lib/codex-runner.server";

const loopSchema = z.object({
  prompt: z.string().min(1).max(60_000),
  maxIterations: z.number().int().min(1).max(8).optional(),
  authToken: z.string().min(20).max(10000).optional(),
  githubToken: z.string().min(20).max(10000).optional(),
  context: z.string().max(45_000).optional(),
  model: z.string().min(1).max(200).optional(),
});
const codeSchema = z.object({ language: z.string().min(1).max(40), code: z.string().max(500_000) });

function prefersAuthenticatedGitHub(prompt: string): boolean {
  return /github|repository|repo|pull request|branch|commit|workflow|actions|502|500|503|bug|error|debug|deploy|ดีพลอย|แก้โค้ด|แก้ไฟล์|ล่ม/.test(prompt.toLowerCase());
}

function hasServerCodexCredential(): boolean {
  return Boolean(process.env.CODEX_ACCESS_TOKEN || process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY);
}

export const runAgent = createServerFn({ method: "POST" })
  .validator(loopSchema)
  .handler(async ({ data }) => {
    const taskPrompt = data.context ? `${data.context}\n\nCurrent user request:\n${data.prompt}` : data.prompt;
    const intent = inferTaskIntent(data.prompt);
    // Codex-style: only tools for this intent (max 3)
    const selected = await selectToolsForTask(taskPrompt, 3);
    const selectedNames = selected.slice(0, 8).map((tool) => String(tool.name ?? "")).filter(Boolean);
    const registryStep = {
      phase: "plan" as const,
      detail: `Intent: ${intent} · tools (${selectedNames.length}): ${selectedNames.join(", ") || "ไม่มี — ตอบตรงเจตนา"}`,
    };

    // Pure chat intent → no agent loop
    if (intent === "chat" || selected.length === 0) {
      return {
        ok: true,
        text: "",
        steps: [registryStep, { phase: "verify" as const, detail: "ไม่เปิด toolbox — ตอบตามเจตนาผู้ใช้" }],
        verified: true,
        skipAgent: true as const,
      };
    }

    const prefersCodex = /แก้|เขียน|สร้าง|fix|bug|debug|repair|refactor|typescript|runtime|error|code|โค้ด|taskContext|deploy/i.test(data.prompt);
    if (prefersCodex && hasServerCodexCredential()) {
      const result = await runCodexAgent(taskPrompt, data.githubToken, data.authToken, (detail) => undefined);
      if (result.ok) {
        return {
          ok: true,
          text: result.text,
          steps: [registryStep, { phase: "act" as const, detail: "🤖 Codex เป็น coding agent หลักและลงมือใน workspace จริง" }, { phase: "verify" as const, detail: result.evidence || "Codex verification ผ่าน" }],
          verified: result.verified,
        };
      }
      if (/Missing CODEX_API_KEY|OPENAI_API_KEY/.test(result.error || "")) {
        return { ok: false, text: result.text, steps: [registryStep, { phase: "verify" as const, detail: "Codex ยังไม่มี server API key จึงหยุดโดยไม่แอบอ้างว่าสำเร็จ" }], verified: false };
      }
    }

    const registryHasGitHub = selected.some((tool) => String(tool.name ?? "").toLowerCase().includes("github"));
    if ((data.githubToken && intent === "github") || (registryHasGitHub && prefersAuthenticatedGitHub(data.prompt))) {
      const result = await runGitHubAgent(taskPrompt, data.authToken, data.model, data.githubToken);
      if (!result.ok) {
        return {
          ok: false,
          text: result.error,
          steps: [
            registryStep,
            { phase: "observe" as const, detail: `GitHub Agent failed: ${result.error.slice(0, 300)}` },
            { phase: "verify" as const, detail: "GitHub Agent ยังไม่มีหลักฐาน verification สำเร็จ" },
          ],
          verified: false,
        };
      }
      const verificationStep = result.verified
        ? { phase: "verify" as const, detail: "GitHub Agent มีหลักฐาน verification จริงจาก workflow/web health check" }
        : { phase: "verify" as const, detail: "GitHub Agent ยังไม่มีหลักฐาน verification สำเร็จ" };
      return {
        ok: result.verified || !/แก้|เขียน|สร้าง|ลบ|update|write|fix|repair|deploy|ดีพลอย|modify|change/i.test(data.prompt),
        text: result.text,
        steps: [
          registryStep,
          { phase: "act" as const, detail: `Authenticated GitHub Agent executed ${result.toolCalls.length} tool calls.` },
          { phase: "observe" as const, detail: "GitHub tool results were returned and checked before completion." },
          verificationStep,
        ],
        verified: result.verified,
      };
    }

    // Fewer iterations by default — Codex-like focused loops
    const iterations = data.maxIterations ?? (intent === "github" || intent === "deploy" ? 5 : 3);
    const result = await runAgentLoop(taskPrompt, selected, iterations, data.authToken, undefined, data.model);
    return { ...result, steps: [registryStep, ...result.steps] };
  });

export const runAgentSandbox = createServerFn({ method: "POST" })
  .validator(codeSchema)
  .handler(async ({ data }) => executeAgentCode(data.language, data.code));

export type AgentStreamEvent =
  | { type: "step"; step: import("@/lib/agent-loop").AgentStep }
  | { type: "done"; result: import("@/lib/agent-loop").AgentRunResult };

export const runAgentStream = createServerFn({ method: "POST" })
  .validator(loopSchema)
  .handler(async function* ({ data }) {
    const taskPrompt = data.context ? `${data.context}\n\nCurrent user request:\n${data.prompt}` : data.prompt;
    const intent = inferTaskIntent(data.prompt);
    const selected = await selectToolsForTask(taskPrompt, 3);
    const selectedNames = selected.slice(0, 8).map((tool) => String(tool.name ?? "")).filter(Boolean);
    const registryStep = {
      phase: "plan" as const,
      detail: `Intent: ${intent} · tools (${selectedNames.length}): ${selectedNames.join(", ") || "ไม่มี"}`,
    };
    yield { type: "step", step: registryStep };

    if (intent === "chat" || selected.length === 0) {
      yield {
        type: "done",
        result: {
          ok: true,
          text: "",
          steps: [registryStep],
          verified: true,
        },
      };
      return;
    }

    const prefersCodex = /แก้|เขียน|สร้าง|fix|bug|debug|repair|refactor|typescript|runtime|error|code|โค้ด|taskContext|deploy/i.test(data.prompt);
    if (prefersCodex && hasServerCodexCredential()) {
      yield { type: "step", step: { phase: "act", detail: "🤖 Codex กำลังเข้าประจำการเป็น coding agent หลัก..." } };
      const result = await runCodexAgent(taskPrompt, data.githubToken, data.authToken, (detail) => {
        // Keep the server generator valid; detailed subprocess output is handled by the runner.
      });
      if (result.ok) {
        yield { type: "step", step: { phase: "verify", detail: result.evidence || "✓ Codex verification ผ่าน" } };
      } else {
        yield { type: "step", step: { phase: "observe", detail: "⚠️ Codex: " + result.text.slice(0, 500) } };
      }
      yield { type: "done", result: { ok: result.ok, text: result.text, steps: [registryStep, { phase: "act", detail: "🤖 Codex coding agent" }, { phase: result.ok ? "verify" : "observe", detail: result.evidence || result.error || "Codex จบการทำงาน" }], verified: result.verified } };
      return;
    }

    // IMPORTANT: streamed chat must use the same authenticated GitHub path as runAgent.
    if (prefersCodex && !hasServerCodexCredential()) {
      yield { type: "step", step: { phase: "act", detail: "🧠 ไม่มี Codex API credential บน Render → ใช้ Puter + โมเดลที่เลือกเป็น Agent driver แทน" } };
    }

    // Otherwise requests such as "เปิด repo แบบ Codex" fall back to the generic Puter
    // tool loop, which may expose tools but cannot actually open the user's repository.
    const registryHasGitHub = selected.some((tool) => String(tool.name ?? "").toLowerCase().includes("github"));
    if (registryHasGitHub && prefersAuthenticatedGitHub(data.prompt)) {
      yield {
        type: "step",
        step: { phase: "act", detail: "🔐 กำลังเปิด GitHub Agent ที่เชื่อม repo จริง..." },
      };
      const result = await runGitHubAgent(taskPrompt, data.authToken, data.model, data.githubToken);
      if (!result.ok) {
        yield {
          type: "step",
          step: { phase: "observe", detail: `GitHub Agent ล้มเหลว: ${result.error.slice(0, 300)}` },
        };
        yield {
          type: "done",
          result: {
            ok: false,
            text: result.error,
            steps: [registryStep, { phase: "act", detail: "🔐 GitHub Agent" }, { phase: "observe", detail: `GitHub Agent ล้มเหลว: ${result.error.slice(0, 300)}` }],
            verified: false,
          },
        };
        return;
      }
      yield {
        type: "step",
        step: {
          phase: "verify",
          detail: result.verified
            ? "✓ GitHub Agent ได้ผลจาก repo จริงและผ่าน verification"
            : "⚠️ GitHub Agent ได้ผลจาก repo จริง แต่ยังไม่มีหลักฐาน verification",
        },
      };
      yield {
        type: "done",
        result: {
          ok: result.verified || !/แก้|เขียน|สร้าง|ลบ|update|write|fix|repair|deploy|ดีพลอย|modify|change/i.test(data.prompt),
          text: result.text,
          steps: [
            registryStep,
            { phase: "act", detail: "🔐 GitHub Agent เปิด repo และทำงานผ่าน GitHub App" },
            { phase: "verify", detail: result.verified ? "✓ verification ผ่าน" : "⚠️ ยังไม่มี verification gate" },
          ],
          verified: result.verified,
        },
      };
      return;
    }

    const queue: AgentStreamEvent[] = [];
    let wake: (() => void) | null = null;
    let finished = false;
    let finalResult: import("@/lib/agent-loop").AgentRunResult | null = null;

    const push = (event: AgentStreamEvent) => {
      queue.push(event);
      wake?.();
      wake = null;
    };

    const iterations = data.maxIterations ?? (intent === "github" || intent === "deploy" ? 5 : 3);
    const runner = runAgentLoop(
      taskPrompt,
      selected,
      iterations,
      data.authToken,
      (step) => push({ type: "step", step }),
      data.model,
    ).then((result) => {
      finalResult = { ...result, steps: [registryStep, ...result.steps] };
      finished = true;
      wake?.();
      wake = null;
    });

    while (!finished || queue.length) {
      if (!queue.length) {
        await new Promise<void>((resolve) => { wake = resolve; });
      }
      while (queue.length) {
        yield queue.shift()!;
      }
    }
    await runner;
    yield { type: "done", result: finalResult! };
  });
