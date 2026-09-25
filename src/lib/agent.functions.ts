import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { selectToolsForTask, inferTaskIntent } from "@/lib/tool-registry";
import { runGitHubAgent } from "@/lib/github-agent-tools.server";
import { executeAgentCode, runAgentLoop, type AgentStep } from "@/lib/agent-loop";
import type { ToolExecutionResult } from "@/lib/puter-tool-loader";
import {
  bootstrapBoss,
  bossPromptPrefix,
  onToolResults,
  recordPreview,
  resumeSummary,
  githubLoopSummary,
  persistInstructions,
  selectToolsFromRouter,
  type BossContext,
  type GitHubLoopState,
} from "@/lib/boss-engine";
import { loadBossBlob, saveBossBlob } from "@/lib/boss-engine/puter-kv.server";
import { parseRepoRef, runGitHubLoopDriver, wantsGitHubMutation } from "@/lib/boss-engine/github-loop-driver";
import { createHttpGitHubDriver, createPuterModelDriver } from "@/lib/boss-engine/github-loop-driver.server";
import { webLearningPrompt } from "@/lib/boss-engine/web-development-learning";
import { coworkerPromptBlock } from "@/lib/boss-engine/coworker-path";

const loopSchema = z.object({
  prompt: z.string().min(1).max(60_000),
  maxIterations: z.number().int().min(1).max(10).optional(),
  authToken: z.string().min(20).max(10000).optional(),
  githubToken: z.string().min(20).max(10000).optional(),
  context: z.string().max(45_000).optional(),
  model: z.string().min(1).max(200).optional(),
  threadId: z.string().min(1).max(128).optional(),
  agentSettings: z.object({
    autonomy: z.enum(["balanced", "high", "supervised"]).optional(),
    maxIterations: z.number().int().min(1).max(10).optional(),
    requireVerification: z.boolean().optional(),
    autoRepair: z.boolean().optional(),
    autoTools: z.boolean().optional(),
    webAccess: z.boolean().optional(),
    sandboxAccess: z.boolean().optional(),
    githubAccess: z.boolean().optional(),
    mcpAccess: z.boolean().optional(),
    showProgress: z.boolean().optional(),
    rememberContext: z.boolean().optional(),
  }).optional(),
});
const codeSchema = z.object({ language: z.string().min(1).max(40), code: z.string().max(500_000) });

type LoopData = z.infer<typeof loopSchema>;

function prefersAuthenticatedGitHub(prompt: string): boolean {
  return /github|repository|repo|pull request|branch|commit|workflow|actions|502|500|503|bug|error|debug|deploy|ดีพลอย|แก้โค้ด|แก้ไฟล์|ล่ม/.test(prompt.toLowerCase());
}

/** Bootstrap the Boss context and resume any memory persisted for this thread. */
async function prepareBossRun(data: LoopData) {
  const basePrompt = data.context ? `${data.context}\n\nCurrent user request:\n${data.prompt}` : data.prompt;
  const boss = await bootstrapBoss(data.prompt, data.threadId);
  const saved = data.authToken ? await loadBossBlob(data.authToken, data.threadId) : null;
  const resumeParts: string[] = [];
  if (saved?.task) {
    resumeParts.push(`RESUMED TASK MEMORY (thread ${data.threadId ?? "default"} — จากเซสชันก่อนหน้า):\n${resumeSummary(saved.task)}`);
  }
  if (saved?.githubLoop) {
    resumeParts.push(`RESUMED GITHUB LOOP:\n${githubLoopSummary(saved.githubLoop)}`);
  }
  if (saved?.preview) {
    resumeParts.push(`Last preview: ${saved.preview.url} (verified=${saved.preview.verified})`);
  }
  const learningContext = /\b(html|css|javascript|typescript|react|dom|web development|เว็บ|เว็บไซต์|หน้าเว็บ|frontend|ฟรอนต์เอนด์|เว็บแอป)\b/i.test(data.prompt)
    ? "\n\n=== WEB DEVELOPMENT LEARNING CAPABILITY ===\n" + webLearningPrompt()
    : "";
  const coworkerBlock = coworkerPromptBlock(data.prompt);
  const taskPrompt =
    bossPromptPrefix(boss) +
    "\n\n" +
    coworkerBlock +
    "\n\n" +
    persistInstructions(data.threadId) +
    (resumeParts.length ? "\n\n" + resumeParts.join("\n\n") : "") +
    "\n\n=== AGENT SETTINGS ===\n" +
    JSON.stringify(data.agentSettings ?? {}) +
    "\nUse these settings as hard execution preferences: obey disabled tool families, honor maxIterations, repair when enabled, and do not claim mutation success without verification when requireVerification=true." +
    "\n\n=== CURRENT REQUEST ===\n" +
    basePrompt;
  return { basePrompt, boss, saved, taskPrompt };
}

type DriverOutcome = {
  ok: boolean;
  text: string;
  steps: AgentStep[];
  verified: boolean;
  githubLoop: GitHubLoopState;
};

/**
 * Deterministic GitHub loop (branch→edit→PR→CI→diagnose→repair→verify) —
 * the state machine drives the phases, the model only writes files.
 * Returns null when the request is not a full-loop GitHub mutation.
 */
async function tryGitHubLoopDriver(
  data: LoopData,
  basePrompt: string,
  onStep?: (step: AgentStep) => void,
): Promise<DriverOutcome | null> {
  // "Continue" prompts embed the original request — those resume via persisted
  // memory (RESUMED GITHUB LOOP) instead of starting a fresh branch.
  if (/^ทำงานต่อ|^continue\b/i.test(data.prompt.trim())) return null;
  if (inferTaskIntent(data.prompt) !== "github" || !wantsGitHubMutation(data.prompt)) return null;
  const repoRef = parseRepoRef(data.prompt);
  if (!repoRef) return null;

  const steps: AgentStep[] = [];
  const pushStep = (step: AgentStep) => {
    steps.push(step);
    onStep?.(step);
  };
  pushStep({
    phase: "plan",
    detail: `📦 GitHub Loop driver: ${repoRef.owner}/${repoRef.repo} — state machine คุม branch→PR→CI (ไม่เดา phase)`,
  });

  const driverResult = await runGitHubLoopDriver({
    prompt: basePrompt,
    owner: repoRef.owner,
    repo: repoRef.repo,
    github: createHttpGitHubDriver(data.githubToken),
    model: createPuterModelDriver(data.authToken, data.model),
    onStep: (phase, detail) => {
      const mapped: AgentStep["phase"] = phase === "plan" ? "plan" : phase === "verify" ? "verify" : "observe";
      pushStep({ phase: mapped, detail });
    },
  });

  pushStep({
    phase: "verify",
    detail: driverResult.verified
      ? "✓ CI ผ่าน — loop เสร็จแบบ verified"
      : driverResult.ok
        ? "⚠️ loop เสร็จจริง แต่ยังไม่มี CI ที่ผ่านให้ verify"
        : "❌ loop ไม่สำเร็จ — ดู diagnosis ด้านล่าง",
  });
  return { ok: driverResult.ok, text: driverResult.text, steps, verified: driverResult.verified, githubLoop: driverResult.state };
}

/** Save Boss task memory to Puter KV (best-effort, never blocks the answer). */
async function persistBossMemory(data: LoopData, boss: BossContext, githubLoop: GitHubLoopState | null): Promise<void> {
  if (!data.authToken) return;
  const preview = boss.task.lastPreview;
  await Promise.race([
    saveBossBlob(data.authToken, data.threadId, {
      task: boss.task,
      githubLoop: githubLoop ?? undefined,
      preview: preview
        ? {
            projectId: "default",
            threadId: data.threadId,
            url: preview.url,
            provider: "puter",
            lastCommit: preview.commit,
            verified: preview.verified,
            updatedAt: Date.now(),
          }
        : undefined,
    }),
    new Promise((resolve) => setTimeout(resolve, 10_000)),
  ]);
}

export const runAgent = createServerFn({ method: "POST" })
  .validator(loopSchema)
  .handler(async ({ data }) => {
    const { basePrompt, boss: initialBoss, saved, taskPrompt } = await prepareBossRun(data);
    let boss = initialBoss;
    const intent = inferTaskIntent(data.prompt);
    // tools selected by intent (up to 24 — do not starve the agent)
    const engineSelected = selectToolsFromRouter(boss);
    const selected = engineSelected.length ? engineSelected : await selectToolsForTask(taskPrompt, 24);
    const settings = data.agentSettings ?? {};
    const filteredSelected = selected.filter((tool) => {
      const name = String(tool.name ?? "").toLowerCase();
      if (settings.autoTools === false) return false;
      if (settings.webAccess === false && /^web_/.test(name)) return false;
      if (settings.sandboxAccess === false && /^sandbox_/.test(name)) return false;
      if (settings.githubAccess === false && /^github_/.test(name)) return false;
      if (settings.mcpAccess === false && /^mcp/.test(name)) return false;
      return true;
    });
    const effectiveSelected = filteredSelected;
    const selectedNames = effectiveSelected.slice(0, 12).map((tool) => String(tool.name ?? "")).filter(Boolean);
    const registryStep = {
      phase: "plan" as const,
      detail: `Intent: ${intent} · tools (${selectedNames.length}): ${selectedNames.join(", ") || "ไม่มี — ตอบตรงเจตนา"}`,
    };

    // Pure greeting chat only → no agent loop
    if (intent === "chat") {
      return {
        ok: true,
        text: "",
        steps: [registryStep, { phase: "verify" as const, detail: "ไม่เปิด toolbox — ทักทายสั้น" }],
        verified: true,
        skipAgent: true as const,
      };
    }

    // Deterministic GitHub loop first — state machine drives the phases.
    let driver: DriverOutcome | null = null;
    let driverFallbackError: string | null = null;
    try {
      driver = data.agentSettings?.githubAccess === false ? null : await tryGitHubLoopDriver(data, basePrompt);
    } catch (e) {
      driverFallbackError = e instanceof Error ? e.message : String(e);
    }
    if (driver) {
      if (data.authToken) await persistBossMemory(data, boss, driver.githubLoop);
      return { ok: driver.ok, text: driver.text, steps: [registryStep, ...driver.steps], verified: driver.verified };
    }

    const registryHasGitHub = selected.some((tool) => String(tool.name ?? "").toLowerCase().includes("github"));
    if (data.agentSettings?.githubAccess !== false && ((data.githubToken && intent === "github") || (registryHasGitHub && prefersAuthenticatedGitHub(data.prompt)))) {
      const result = await runGitHubAgent(taskPrompt, data.authToken, data.model, data.githubToken);
      if (!result.ok) {
        return {
          ok: false,
          text: driverFallbackError ? `GitHub Loop driver ล้มเหลว (${driverFallbackError.slice(0, 200)}) แล้ว GitHub Agent ก็ไม่สำเร็จ: ${result.error}` : result.error,
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
          ...(driverFallbackError
            ? [{ phase: "observe" as const, detail: `GitHub Loop driver สกิด (${driverFallbackError.slice(0, 200)}) — โยนต่อให้ GitHub Agent` }]
            : []),
          { phase: "act" as const, detail: `Authenticated GitHub Agent executed ${result.toolCalls.length} tool calls.` },
          { phase: "observe" as const, detail: "GitHub tool results were returned and checked before completion." },
          verificationStep,
        ],
        verified: result.verified,
      };
    }

    const iterations = data.agentSettings?.maxIterations ?? data.maxIterations ?? (intent === "github" || intent === "deploy" ? 8 : 6);
    const result = await runAgentLoop(
      taskPrompt,
      effectiveSelected,
      iterations,
      data.authToken,
      undefined,
      data.model,
      data.githubToken,
      { threadId: data.threadId },
      (results: ToolExecutionResult[]) => {
        for (const r of results) {
          const rec = r.result && typeof r.result === "object" ? (r.result as Record<string, unknown>) : null;
          const av = rec?.autoVerify as { url?: string; ok?: boolean; httpStatus?: number } | undefined;
          if (av?.url) {
            boss = { ...boss, task: recordPreview(boss.task, { url: av.url, verified: Boolean(av.ok), statusCode: av.httpStatus }) };
          }
        }
        boss = onToolResults(boss, results);
      },
    );
    if (data.authToken) await persistBossMemory(data, boss, saved?.githubLoop ?? null);
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
    const { basePrompt, boss: initialBoss, saved, taskPrompt } = await prepareBossRun(data);
    let boss = initialBoss;
    const intent = inferTaskIntent(data.prompt);
    const engineSelected = selectToolsFromRouter(boss);
    const selected = engineSelected.length ? engineSelected : await selectToolsForTask(taskPrompt, 24);
    const settings = data.agentSettings ?? {};
    const filteredSelected = selected.filter((tool) => {
      const name = String(tool.name ?? "").toLowerCase();
      if (settings.autoTools === false) return false;
      if (settings.webAccess === false && /^(web_|google)/.test(name)) return false;
      if (settings.sandboxAccess === false && /^sandbox_/.test(name)) return false;
      if (settings.githubAccess === false && /^github_/.test(name)) return false;
      if (settings.mcpAccess === false && /^mcp/.test(name)) return false;
      return true;
    });
    const effectiveSelected = filteredSelected;
    const selectedNames = effectiveSelected.slice(0, 12).map((tool) => String(tool.name ?? "")).filter(Boolean);
    const registryStep = {
      phase: "plan" as const,
      detail: `Intent: ${intent} · tools (${selectedNames.length}): ${selectedNames.join(", ") || "ไม่มี"}`,
    };
    yield { type: "step", step: registryStep };

    if (intent === "chat") {
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

    const queue: AgentStreamEvent[] = [];
    let wake: (() => void) | null = null;
    let finished = false;
    let finalResult: import("@/lib/agent-loop").AgentRunResult | null = null;

    const push = (event: AgentStreamEvent) => {
      queue.push(event);
      wake?.();
      wake = null;
    };

    // Deterministic GitHub loop first — state machine drives the phases.
    let driver: DriverOutcome | null = null;
    let driverFallbackError: string | null = null;
    try {
      driver = data.agentSettings?.githubAccess === false ? null : await tryGitHubLoopDriver(data, basePrompt, (step) => push({ type: "step", step }));
    } catch (e) {
      driverFallbackError = e instanceof Error ? e.message : String(e);
    }
    if (driver) {
      if (data.authToken) await persistBossMemory(data, boss, driver.githubLoop);
      yield { type: "done", result: { ok: driver.ok, text: driver.text, steps: [registryStep, ...driver.steps], verified: driver.verified } };
      return;
    }

    const registryHasGitHub = selected.some((tool) => String(tool.name ?? "").toLowerCase().includes("github"));
    if (data.agentSettings?.githubAccess !== false && registryHasGitHub && prefersAuthenticatedGitHub(data.prompt)) {
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
            text: driverFallbackError ? `GitHub Loop driver สกิด (${driverFallbackError.slice(0, 200)}) แล้ว GitHub Agent ไม่สำเร็จ: ${result.error}` : result.error,
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
            ...(driverFallbackError
              ? [{ phase: "observe" as const, detail: `GitHub Loop driver สกิด (${driverFallbackError.slice(0, 200)}) — โยนต่อให้ GitHub Agent` }]
              : []),
            { phase: "act", detail: "🔐 GitHub Agent เปิด repo และทำงานผ่าน GitHub App" },
            { phase: "verify", detail: result.verified ? "✓ verification ผ่าน" : "⚠️ ยังไม่มี verification gate" },
          ],
          verified: result.verified,
        },
      };
      return;
    }

    const iterations = data.agentSettings?.maxIterations ?? data.maxIterations ?? (intent === "github" || intent === "deploy" ? 8 : 6);
    const runner = runAgentLoop(
      taskPrompt,
      effectiveSelected,
      iterations,
      data.authToken,
      (step) => push({ type: "step", step }),
      data.model,
      data.githubToken,
      { threadId: data.threadId },
      (results: ToolExecutionResult[]) => {
        for (const r of results) {
          const rec = r.result && typeof r.result === "object" ? (r.result as Record<string, unknown>) : null;
          const av = rec?.autoVerify as { url?: string; ok?: boolean; httpStatus?: number } | undefined;
          if (av?.url) {
            boss = { ...boss, task: recordPreview(boss.task, { url: av.url, verified: Boolean(av.ok), statusCode: av.httpStatus }) };
          }
        }
        boss = onToolResults(boss, results);
      },
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
    if (data.authToken) await persistBossMemory(data, boss, saved?.githubLoop ?? null);
    yield { type: "done", result: finalResult! };
  });
