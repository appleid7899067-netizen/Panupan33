import { callWithFallback, loadCodingFleetTools, type CodingFleetTool, type ToolExecutionResult } from "@/lib/puter-tool-loader";
import { runInSandbox, type SandboxResult } from "@/lib/sandbox";
import { bootstrapBoss, bossPromptPrefix, onToolResults, shouldStopAsVerified } from "@/lib/boss-engine";

export type AgentPhase = "plan" | "select" | "act" | "observe" | "refine" | "verify";
export type AgentStep = { phase: AgentPhase; detail: string };
export type AgentRunResult = {
  ok: boolean;
  text: string;
  steps: AgentStep[];
  sandbox?: SandboxResult;
  verified?: boolean;
};

function safeText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") {
    const text = value.trim();
    return text && text !== "[object Object]" ? text : fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((v) => safeText(v)).filter(Boolean).join("\n") || fallback;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["text", "content", "message", "error", "detail", "reason"]) {
      const nested = safeText(record[key]);
      if (nested) return nested;
    }
    try { return JSON.stringify(value, null, 2); } catch { return fallback; }
  }
  return String(value);
}

function summarizeFailure(results: ToolExecutionResult[]): string {
  const failures = results.filter((r) => !r.ok);
  if (failures.length) {
    return failures.map((r) => `❌ ${r.name}: ${safeText(r.error ?? r.result, "unknown error").slice(0, 1000)}`).join("\n");
  }
  const observed = results.slice(-5).map((r) => {
    const text = safeText(r.result);
    return text ? `• ${r.name}: ${text.slice(0, 700)}` : "";
  }).filter(Boolean);
  return observed.length ? observed.join("\n") : "ยังไม่มีผลลัพธ์จากเครื่องมือ";
}

function isVerificationTool(name: string): boolean {
  return /test|verify|build|lint|typecheck|ci|workflow|health|http|status|deploy|sandbox_run|web_check|web_search/i.test(name);
}

function hasSuccessfulVerification(results: ToolExecutionResult[]): boolean {
  return results.some((r) => {
    if (!r.ok || !isVerificationTool(r.name)) return false;
    if (!r.result || typeof r.result !== "object") return true;
    const record = r.result as Record<string, unknown>;
    return record.ok === true || record.success === true || record.verified === true ||
      (typeof record.status === "number" && record.status >= 200 && record.status < 400);
  });
}

function activityLabel(name: string, ok: boolean): string {
  if (!ok) return `⚠️ error จาก ${name}`;
  if (/builder_/.test(name)) return `🏗️ Builder: ${name}`;
  if (/web_search|web_browse|web_/.test(name)) return `🌐 Web: ${name}`;
  if (/sandbox/.test(name)) return `▶️ Sandbox: ${name}`;
  if (/github/.test(name)) return `📦 GitHub: ${name}`;
  return `⚙️ ${name}`;
}

function looksLikeMutation(prompt: string): boolean {
  return /แก้|เขียน|สร้าง|ลบ|update|write|fix|repair|deploy|ดีพลอย|modify|change|commit|ทำให้/i.test(prompt);
}

function looksLikeVerification(prompt: string): boolean {
  return /test|verify|ตรวจ|เช็ก|build|ci|ผ่าน|ทำงานไหม|ใช้งานได้/i.test(prompt);
}

function buildAutonomousPrompt(prompt: string, tools: CodingFleetTool[]): string {
  const toolNames = tools.map((t) => String(t.name ?? t.slug ?? t.id ?? "")).filter(Boolean).join(", ");
  return `=== BOSS AUTONOMOUS AGENT ===
You are the execution agent, not a chatbot that merely explains how to do work.

USER GOAL:
${prompt}

AVAILABLE TOOLS:
${toolNames || "none"}

OPERATING RULES:
1. Understand the user's goal from normal human language. Do not require the user to describe implementation details.
2. Decide which tool to use yourself from the current goal and the result of previous tool calls.
3. Work result-first, not plan-first. Do not spend turns describing a plan when an available tool can perform the next useful action.
4. Start with the smallest useful real action. Read current state before changing it when inspection is needed.
5. After every tool result, reassess. The next tool must be chosen from the actual result, not from a hardcoded workflow.
6. For coding/debugging: inspect → reproduce when useful → edit → run a real check/test → inspect failures → edit again → verify.
7. For web research: search the live web, then inspect useful sources when needed. Do not claim to have searched unless the search tool actually returned a result.
8. For GitHub work: read the real repository/file first, make the requested change, then use the real repository checks/Actions when available.
9. If a tool fails, diagnose the actual error and change the approach. Do not repeat the identical failed call without a meaningful change.
10. Never bypass authentication, permissions, rate limits, paywalls, security controls, or access restrictions.
11. Never invent files, URLs, commits, test results, HTTP statuses, search results, deployments, or successful actions.
12. Do not stop merely because one route failed. If another legitimate available route exists, try it.
13. Do not ask the user to perform a tool operation that you can perform with the available tools.
14. Keep tool use economical, but do not starve yourself of needed tools.
15. Only skip tools for pure greetings. Factual, code, web, or action tasks MUST use tools when available — never invent results.
`;
}

export async function runAgentLoop(
  prompt: string,
  tools: CodingFleetTool[],
  _maxIterations = 6,
  authToken?: string,
  onStep?: (step: AgentStep) => void,
  model = "gpt-5.6-luna",
  githubToken?: string,
): Promise<AgentRunResult> {
  const steps: AgentStep[] = [];
  const emit = (step: AgentStep) => { steps.push(step); onStep?.(step); };
  const maxIterations = Math.max(1, Math.min(_maxIterations, 10));

  let bossCtx = null as Awaited<ReturnType<typeof bootstrapBoss>> | null;
  try {
    bossCtx = await bootstrapBoss(prompt);
    emit({ phase: "plan", detail: "Boss Engine online" });
  } catch {
    /* optional */
  }

  const available = tools.length ? tools : await loadCodingFleetTools();
  emit({ phase: "select", detail: `tools: ${available.slice(0, 12).map((t) => t.name).filter(Boolean).join(", ")}` });

  const prefix = bossCtx ? bossPromptPrefix(bossCtx) + "\n\n" : "";
  let currentPrompt = `${prefix}${buildAutonomousPrompt(prompt, available)}`;
  let last = "";
  let lastResults: ToolExecutionResult[] = [];
  const mutation = looksLikeMutation(prompt);
  const needVerify = looksLikeVerification(prompt) || mutation;

  for (let i = 0; i < maxIterations; i++) {
    emit({ phase: "act", detail: `รอบ ${i + 1}/${maxIterations}` });
    const result = await callWithFallback(
      currentPrompt,
      available,
      [model],
      (lines) => lines.forEach((d) => emit({ phase: "observe", detail: d })),
      authToken,
      githubToken,
    );
    if (!result.ok) {
      emit({ phase: "observe", detail: safeText(result.error, "model failed") });
      return { ok: false, text: safeText(result.error, summarizeFailure(lastResults)), steps, verified: false };
    }
    last = result.text;
    lastResults = result.toolResults;
    if (bossCtx) bossCtx = onToolResults(bossCtx, result.toolResults.map((tr) => ({ name: tr.name, ok: tr.ok, result: tr.result, error: tr.error })));

    for (const tr of result.toolResults) {
      emit({ phase: "observe", detail: activityLabel(tr.name, tr.ok) });
    }

    if (!result.toolCalls.length) {
      const verified = !needVerify || hasSuccessfulVerification(lastResults) || (bossCtx ? shouldStopAsVerified(bossCtx) : false);
      emit({ phase: "verify", detail: verified ? "✓ มีหลักฐานจาก tool/runtime" : "ยังต้องการ verification" });
      if (!verified && i < maxIterations - 1) {
        currentPrompt = `${prompt}\n\nVerification required: call a real verification or search tool before finishing.`;
        continue;
      }
      return { ok: verified || !needVerify, text: last, steps, verified };
    }

    const failed = result.toolResults.filter((r) => !r.ok);
    if (failed.length) {
      emit({ phase: "refine", detail: `ซ่อมจาก error: ${failed.map((f) => f.name).join(", ")}` });
      currentPrompt = `${prompt}\n\nPrevious tool errors:\n${summarizeFailure(result.toolResults)}\n\nDiagnose and retry with a different approach.`;
    } else {
      emit({ phase: "refine", detail: "ต่อจากผล tool ล่าสุด" });
      currentPrompt = `${prompt}\n\nLast tool results:\n${summarizeFailure(result.toolResults)}\n\nContinue toward the user goal.`;
    }
  }

  return { ok: false, text: last || summarizeFailure(lastResults), steps, verified: hasSuccessfulVerification(lastResults) };
}

export async function executeAgentCode(language: string, code: string) {
  return runInSandbox({ language, code });
}
