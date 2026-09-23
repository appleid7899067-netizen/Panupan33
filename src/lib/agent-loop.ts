/**
 * Efficient Agent Loop
 * - Adaptive iteration budget by task type
 * - Early exit when evidence answers the goal
 * - Duplicate tool-call detection (no identical retries)
 * - Compact prompts (no tool-list spam every refine)
 * - Failure budget: stop after N consecutive hard fails
 */
import {
  callWithFallback,
  loadCodingFleetTools,
  type CodingFleetTool,
  type ToolExecutionResult,
} from "@/lib/puter-tool-loader";
import { runInSandbox, type SandboxResult } from "@/lib/sandbox";

export type AgentPhase = "plan" | "select" | "act" | "observe" | "refine" | "verify";
export type AgentStep = { phase: AgentPhase; detail: string };
export type AgentRunResult = {
  ok: boolean;
  text: string;
  steps: AgentStep[];
  sandbox?: SandboxResult;
  verified?: boolean;
};

type ToolCall = { name: string; arguments?: Record<string, unknown> };

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
    for (const key of ["text", "content", "message", "error", "detail", "reason", "stdout"]) {
      const nested = safeText(record[key]);
      if (nested) return nested;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return fallback;
    }
  }
  return String(value);
}

function summarizeResults(results: ToolExecutionResult[], limit = 4): string {
  if (!results.length) return "(no tool results)";
  return results
    .slice(-limit)
    .map((r) => {
      if (!r.ok) return `❌ ${r.name}: ${safeText(r.error ?? r.result, "failed").slice(0, 500)}`;
      return `✓ ${r.name}: ${safeText(r.result, "ok").slice(0, 600)}`;
    })
    .join("\n");
}

function isEvidenceTool(name: string): boolean {
  return /web_search|web_browse|web_check|web_fetch|sandbox_run|sandbox_install|github_|builder_|test|verify|build|ci|workflow|health|deploy/i.test(
    name,
  );
}

function toolSucceeded(r: ToolExecutionResult): boolean {
  if (!r.ok) return false;
  if (!r.result || typeof r.result !== "object") return true;
  const rec = r.result as Record<string, unknown>;
  if (rec.ok === false) return false;
  if (typeof rec.status === "number" && (rec.status < 200 || rec.status >= 400)) return false;
  return true;
}

function hasUsefulEvidence(results: ToolExecutionResult[]): boolean {
  return results.some((r) => toolSucceeded(r) && isEvidenceTool(r.name));
}

function looksLikeMutation(prompt: string): boolean {
  return /แก้|เขียน|สร้าง|ลบ|update|write|fix|repair|deploy|ดีพลอย|modify|change|commit|ทำให้|ติดตั้ง/i.test(
    prompt,
  );
}

function looksLikeVerification(prompt: string): boolean {
  return /test|verify|ตรวจ|เช็ก|build|ci|ผ่าน|ทำงานไหม|ใช้งานได้/i.test(prompt);
}

function looksLikeSearch(prompt: string): boolean {
  return /ค้น|search|หา|ข่าว|ราคา|what |who |where |when |why |how |อะไร|ใคร|ที่ไหน|เมื่อ/i.test(prompt);
}

/** Adaptive budget: cheap tasks finish in 1–2 outer loops. */
function iterationBudget(prompt: string, requested?: number): number {
  if (requested && requested > 0) return Math.min(10, requested);
  if (looksLikeMutation(prompt) || /github|deploy|ดีพลอย|repo/i.test(prompt)) return 6;
  if (looksLikeVerification(prompt) || /code|โค้ด|debug|bug|sandbox/i.test(prompt)) return 4;
  if (looksLikeSearch(prompt)) return 2;
  return 3;
}

function activityLabel(name: string, ok: boolean): string {
  if (!ok) return `⚠️ ${name}`;
  if (/web_/.test(name)) return `🌐 ${name}`;
  if (/sandbox/.test(name)) return `▶️ ${name}`;
  if (/github/.test(name)) return `📦 ${name}`;
  if (/builder_/.test(name)) return `🏗️ ${name}`;
  return `⚙️ ${name}`;
}

function fingerprintCall(call: ToolCall): string {
  try {
    return `${call.name}::${JSON.stringify(call.arguments ?? {})}`;
  } catch {
    return call.name;
  }
}

function buildKickoffPrompt(prompt: string, tools: CodingFleetTool[]): string {
  const names = tools
    .map((t) => String(t.name ?? ""))
    .filter(Boolean)
    .slice(0, 20)
    .join(", ");
  return `You are Boss — an efficient execution agent.

GOAL:
${prompt}

TOOLS (use only what you need): ${names || "none"}

RULES:
- Act with tools when facts or actions are required. Do not invent results.
- Prefer 1–3 high-value tool calls, then answer from real results.
- If a tool fails, change approach — do not repeat the exact same call.
- When the goal is satisfied by tool evidence, stop and answer clearly.
- Pure greeting only: answer without tools.
`;
}

function buildContinuePrompt(
  prompt: string,
  results: ToolExecutionResult[],
  mode: "retry" | "continue" | "verify",
): string {
  const summary = summarizeResults(results, 5);
  if (mode === "verify") {
    return `GOAL: ${prompt}

EVIDENCE SO FAR:
${summary}

Still need real verification (web_check / sandbox_run / github check). Call one verification tool, then answer.`;
  }
  if (mode === "retry") {
    return `GOAL: ${prompt}

PREVIOUS FAILURES:
${summary}

Diagnose and retry with a DIFFERENT tool or different arguments. Do not repeat the identical call.`;
  }
  return `GOAL: ${prompt}

LATEST RESULTS:
${summary}

If the goal is done, answer now from the evidence. Otherwise take the next minimal useful tool action.`;
}

/** Goal satisfied? Search/browse/check success is enough for non-mutation tasks. */
function goalSatisfied(
  prompt: string,
  results: ToolExecutionResult[],
  finalText: string,
  hadToolCalls: boolean,
): { done: boolean; verified: boolean } {
  const mutation = looksLikeMutation(prompt);
  const needVerify = looksLikeVerification(prompt) || mutation;
  const evidence = hasUsefulEvidence(results);

  // Successful search/browse for Q&A
  if (!mutation && looksLikeSearch(prompt) && evidence) {
    return { done: true, verified: true };
  }

  // Model finished with no more tools
  if (!hadToolCalls) {
    if (!needVerify) return { done: true, verified: evidence || Boolean(finalText.trim()) };
    return { done: evidence, verified: evidence };
  }

  // All tools succeeded and we have evidence
  if (results.length && results.every(toolSucceeded) && evidence) {
    if (!needVerify) return { done: true, verified: true };
    return { done: true, verified: true };
  }

  return { done: false, verified: evidence };
}

export async function runAgentLoop(
  prompt: string,
  tools: CodingFleetTool[],
  maxIterations?: number,
  authToken?: string,
  onStep?: (step: AgentStep) => void,
  model = "gpt-5.6-luna",
  githubToken?: string,
): Promise<AgentRunResult> {
  const steps: AgentStep[] = [];
  const emit = (step: AgentStep) => {
    steps.push(step);
    onStep?.(step);
  };

  const budget = iterationBudget(prompt, maxIterations);
  const available = tools.length ? tools : await loadCodingFleetTools();
  const seenCalls = new Set<string>();
  let consecutiveFails = 0;
  const FAIL_LIMIT = 3;

  emit({ phase: "plan", detail: `budget ${budget} rounds · tools ${available.length}` });
  emit({
    phase: "select",
    detail: available
      .slice(0, 10)
      .map((t) => t.name)
      .filter(Boolean)
      .join(", "),
  });

  let currentPrompt = buildKickoffPrompt(prompt, available);
  let last = "";
  let lastResults: ToolExecutionResult[] = [];
  let allResults: ToolExecutionResult[] = [];

  for (let i = 0; i < budget; i++) {
    emit({ phase: "act", detail: `รอบ ${i + 1}/${budget}` });

    const result = await callWithFallback(
      currentPrompt,
      available,
      [model],
      (lines) => lines.forEach((d) => emit({ phase: "observe", detail: d })),
      authToken,
      githubToken,
    );

    if (!result.ok) {
      consecutiveFails += 1;
      emit({ phase: "observe", detail: safeText(result.error, "model failed") });
      if (consecutiveFails >= FAIL_LIMIT) {
        return {
          ok: false,
          text: safeText(result.error, summarizeResults(allResults)),
          steps,
          verified: hasUsefulEvidence(allResults),
        };
      }
      currentPrompt = buildContinuePrompt(prompt, allResults, "retry");
      continue;
    }

    consecutiveFails = 0;
    last = result.text;
    lastResults = result.toolResults;
    allResults = allResults.concat(result.toolResults);

    // Duplicate-call detection
    let duplicateOnly = result.toolCalls.length > 0;
    for (const call of result.toolCalls as ToolCall[]) {
      const fp = fingerprintCall(call);
      if (!seenCalls.has(fp)) duplicateOnly = false;
      seenCalls.add(fp);
      emit({ phase: "observe", detail: activityLabel(call.name, true) });
    }
    for (const tr of result.toolResults) {
      emit({ phase: "observe", detail: activityLabel(tr.name, tr.ok) });
    }

    if (duplicateOnly && result.toolCalls.length) {
      emit({ phase: "refine", detail: "หยุดวน tool ซ้ำ — สรุปจากหลักฐานที่มี" });
      return {
        ok: hasUsefulEvidence(allResults),
        text: last || summarizeResults(allResults),
        steps,
        verified: hasUsefulEvidence(allResults),
      };
    }

    // No further tool calls → decide stop / verify / continue
    if (!result.toolCalls.length) {
      const { done, verified } = goalSatisfied(prompt, allResults, last, false);
      if (done) {
        emit({ phase: "verify", detail: verified ? "✓ จบด้วยหลักฐาน" : "✓ จบ" });
        return { ok: true, text: last, steps, verified };
      }
      if (i < budget - 1 && (looksLikeMutation(prompt) || looksLikeVerification(prompt))) {
        emit({ phase: "refine", detail: "ขอ verification เพิ่ม" });
        currentPrompt = buildContinuePrompt(prompt, allResults, "verify");
        continue;
      }
      emit({ phase: "verify", detail: verified ? "✓" : "จบแบบมีหลักฐานจำกัด" });
      return { ok: verified || Boolean(last.trim()), text: last, steps, verified };
    }

    // Tools ran — check early exit
    const failed = result.toolResults.filter((r) => !r.ok);
    if (!failed.length && hasUsefulEvidence(result.toolResults)) {
      const { done, verified } = goalSatisfied(prompt, allResults, last, true);
      // For search-style tasks, one good evidence pass is enough
      if (done || (looksLikeSearch(prompt) && !looksLikeMutation(prompt))) {
        emit({ phase: "verify", detail: "✓ ได้หลักฐานเพียงพอ — จบเร็ว" });
        // One short synthesis pass only if model gave empty text
        if (!last.trim() && i < budget - 1) {
          currentPrompt = buildContinuePrompt(prompt, allResults, "continue") +
            "\n\nAnswer the user now from the evidence above. No more tools unless critical.";
          const synth = await callWithFallback(
            currentPrompt,
            [], // no tools — force answer
            [model],
            undefined,
            authToken,
            githubToken,
          );
          if (synth.ok && synth.text.trim()) last = synth.text;
          else last = summarizeResults(allResults, 6);
        }
        return {
          ok: true,
          text: last || summarizeResults(allResults),
          steps,
          verified: verified || true,
        };
      }
    }

    if (failed.length) {
      consecutiveFails += 1;
      emit({ phase: "refine", detail: `error: ${failed.map((f) => f.name).join(", ")}` });
      if (consecutiveFails >= FAIL_LIMIT) {
        return {
          ok: false,
          text: last || summarizeResults(allResults),
          steps,
          verified: hasUsefulEvidence(allResults),
        };
      }
      currentPrompt = buildContinuePrompt(prompt, allResults, "retry");
    } else {
      emit({ phase: "refine", detail: "ต่อจากผลลัพธ์" });
      currentPrompt = buildContinuePrompt(prompt, allResults, "continue");
    }
  }

  return {
    ok: hasUsefulEvidence(allResults),
    text: last || summarizeResults(allResults),
    steps,
    verified: hasUsefulEvidence(allResults),
  };
}

export async function executeAgentCode(language: string, code: string) {
  return runInSandbox({ language, code });
}
