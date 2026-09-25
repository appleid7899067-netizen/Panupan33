/**
 * Efficient Agent Loop — decisive (anti tool-shopping)
 * - Adaptive iteration budget by task type (short)
 * - Early exit when evidence answers the goal
 * - Cap tools exposed (≤6) and expand at most once
 * - HARD: prefer 1 tool, max 2 per turn, then answer
 */
import { createEvidenceEngine, type EvidenceEngine } from "@/lib/boss-engine/boss-evidence";
import { createRecoveryEngine, type RecoveryEngine } from "@/lib/boss-engine/boss-recovery";
import {
  callWithFallback,
  loadCodingFleetTools,
  type CodingFleetTool,
  type PublishCtx,
  type ToolExecutionResult,
} from "@/lib/puter-tool-loader";
import { runInSandbox, type SandboxResult } from "@/lib/sandbox";
import {
  buildAgentFoundation,
  foundationPrompt,
  createAgentMemory,
  actionKey,
  shouldRetry,
  recordFailure as recordFoundationFailure,
  recordEvidence as recordFoundationEvidence,
  hasVerifiedEvidence as hasFoundationEvidence,
  type AgentMemory,
} from "@/lib/boss-engine/agent-foundation";
import { routeToolsForTask } from "@/lib/boss-engine/boss-tool-router";
import {
  createAgentKernel,
  recordAction as kernelRecordAction,
  recordObservation as kernelRecordObservation,
  recordFailure as kernelRecordFailure,
  decideNext as kernelDecideNext,
  kernelSummary,
  recoveryHint,
  shouldAvoidAction,
  recordAccessDenied,
  rememberKnowledge,
  type AgentKernelState,
} from "@/lib/boss-engine/agent-kernel";

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
  return /web_search|web_browse|web_check|web_fetch|sandbox_run|programming_lab|terminal_execute|sandbox_install|github_|builder_|test|verify|build|ci|workflow|health|deploy/i.test(
    name,
  );
}

function isAccessDeniedResult(r: ToolExecutionResult): boolean {
  const raw = safeText(r.error ?? r.result, "").toLowerCase();
  return /(^|\D)(401|403)(\D|$)|access denied|forbidden|unauthorized|permission denied|not authorized|authentication required/.test(raw);
}

function knowledgeFacts(r: ToolExecutionResult): string[] {
  if (!r.ok) return [];
  const summary = safeText(r.result, "").replace(/\s+/g, " ").trim();
  return summary ? [summary.slice(0, 700)] : [];
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

/** Adaptive budget: finish fast — do not tool-shop for rounds. */
function iterationBudget(prompt: string, requested?: number): number {
  if (requested && requested > 0) return Math.min(6, requested);
  if (looksLikeMutation(prompt) || /github|deploy|ดีพลอย|repo/i.test(prompt)) return 4;
  if (looksLikeVerification(prompt) || /code|โค้ด|debug|bug|sandbox/i.test(prompt)) return 3;
  if (looksLikeSearch(prompt)) return 1;
  return 2;
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
    .slice(0, 6)
    .join(", ");
  return `You are Boss — an efficient execution agent.

GOAL:
${prompt}

TOOLS (use only what you need): ${names || "none"}

RULES (STRICT — do not tool-shop):
- Act with tools only when facts or side-effects are required. Do not invent results.
- HARD LIMIT: at most 2 tool calls this turn. Prefer 1. Never call 5+ tools to "explore".
- Pick the single best tool for the goal. Do not list or probe every available tool.
- After one successful evidence tool (web_browse/web_search/sandbox/github result), STOP calling tools and answer from that evidence.
- If a tool fails once, change tool or arguments once — then answer with what you have. Do not spiral.
- When the goal is satisfied by tool evidence, answer immediately in Thai if the user wrote Thai.
- For coding/debug: use sandbox_run or programming_lab once, inspect exitCode, then answer.
- Pure greeting only: answer without tools.
`;
}

function wantsDeepReasoning(prompt: string): boolean {
  return (
    /(?:architecture|สถาปัตย์|ออกแบบ|debug|แก้บั๊ก|bug|refactor|หลายขั้น|ทั้งระบบ|ระบบ|deploy|ดีพลอย|ci|workflow|database|ฐานข้อมูล|security|ความปลอดภัย|mcp|agent|โค้ด|code)/i.test(
      prompt,
    ) || prompt.length > 700
  );
}

function mcpUiPayload(result: ToolExecutionResult): Record<string, unknown> | null {
  if (!result.ok || !result.result || typeof result.result !== "object") return null;
  const ui = (result.result as Record<string, unknown>).ui;
  return ui && typeof ui === "object" ? (ui as Record<string, unknown>) : null;
}

function buildContinuePrompt(
  prompt: string,
  results: ToolExecutionResult[],
  mode: "retry" | "continue" | "verify",
  deepReasoning = false,
): string {
  const reasoningRule = deepReasoning
    ? "\n\nDeep reasoning mode ON: reason over constraints, side effects and the shortest fix internally, but expose only concise action/status updates. Never output private chain-of-thought."
    : "";
  const summary = summarizeResults(results, 5);
  if (mode === "verify") {
    return `GOAL: ${prompt}

EVIDENCE SO FAR:
${summary}

One verification tool only (sandbox or web_check), then answer from evidence.${reasoningRule}`;
  }
  if (mode === "retry") {
    return `GOAL: ${prompt}

PREVIOUS FAILURES:
${summary}

One different tool or different args — then answer. Do not spiral.${reasoningRule}`;
  }
  return `GOAL: ${prompt}

LATEST RESULTS:
${summary}

STOP TOOL-SHOPPING. If you have any useful result above, answer NOW in the user's language.
Do not call more tools unless the goal is clearly incomplete.
Max 1 more tool call, then final answer.${reasoningRule}`;
}

function goalSatisfied(
  prompt: string,
  results: ToolExecutionResult[],
  finalText: string,
  hadToolCalls: boolean,
): { done: boolean; verified: boolean } {
  const mutation = looksLikeMutation(prompt);
  const needVerify = looksLikeVerification(prompt) || mutation;
  const evidence = hasUsefulEvidence(results);

  // Any non-mutation task with real tool evidence is done — stop tool-shopping
  if (!mutation && evidence) {
    return { done: true, verified: true };
  }

  if (!mutation && looksLikeSearch(prompt) && evidence) {
    return { done: true, verified: true };
  }

  if (!hadToolCalls) {
    if (!needVerify) return { done: true, verified: evidence || Boolean(finalText.trim()) };
    return { done: evidence, verified: evidence };
  }

  if (results.length && results.every(toolSucceeded) && evidence) {
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
  publishCtx?: PublishCtx,
  onToolResults?: (results: ToolExecutionResult[]) => void,
): Promise<AgentRunResult> {
  const steps: AgentStep[] = [];
  const emit = (step: AgentStep) => {
    steps.push(step);
    onStep?.(step);
  };

  const foundation = buildAgentFoundation(prompt, maxIterations);
  const evidenceEngine: EvidenceEngine = createEvidenceEngine();
  const recoveryEngine: RecoveryEngine = createRecoveryEngine();
  const budget = Math.min(iterationBudget(prompt, maxIterations), foundation.budget);
  const foundationMemory: AgentMemory = createAgentMemory();
  const deepReasoning = wantsDeepReasoning(prompt);
  let available = tools.length ? [...tools] : await loadCodingFleetTools();
  const githubHeavy = /github|pull request|\bpr\b|commit|branch|workflow/i.test(prompt);
  if (!githubHeavy && available.length > 6) {
    available = available.slice(0, 6);
  }
  const seenCalls = new Set<string>();
  let expansions = 0;

  const expandToolset = async (reason: string) => {
    if (expansions >= 1) return 0;
    try {
      const decision = await routeToolsForTask(`${prompt}\n\nROUTING SIGNAL: ${reason}`, 4);
      const existing = new Set(available.map((tool) => tool.name));
      const additions = decision.selected.filter((tool) => !existing.has(tool.name)).slice(0, 2);
      if (additions.length) {
        expansions += 1;
        available = [...available, ...additions];
        emit({ phase: "select", detail: `🔌 เปิดเพิ่ม (ครั้งเดียว): ${additions.map((tool) => tool.name).join(", ")}` });
        return additions.length;
      }
    } catch (error) {
      emit({ phase: "observe", detail: `⚠️ dynamic tool routing: ${safeText(error, "failed")}` });
    }
    return 0;
  };
  let kernel: AgentKernelState = createAgentKernel(prompt);
  let consecutiveFails = 0;
  const FAIL_LIMIT = 2;

  emit({ phase: "plan", detail: "🎯 Goal & Context: รับเป้าหมาย" });
  emit({
    phase: "plan",
    detail: `🗺️ Plan & Route: budget ${budget} · tools ${available.length} (capped) · ลงมือเร็ว ไม่ tool-shop`,
  });
  emit({
    phase: "select",
    detail:
      "เครื่องมือ (จำกัด): " +
      available
        .slice(0, 6)
        .map((t) => t.name)
        .filter(Boolean)
        .join(", "),
  });
  if (deepReasoning) {
    emit({
      phase: "plan",
      detail: "🧠 Deep reasoning: เส้นทางสั้นสุด (ไม่เปิดเผย chain-of-thought)",
    });
  }

  let currentPrompt =
    buildKickoffPrompt(prompt, available) +
    `\n\n${foundationPrompt(foundation)}\n\nAGENT KERNEL:\n${kernelSummary(kernel)}`;
  let last = "";
  let allResults: ToolExecutionResult[] = [];

  for (let i = 0; i < budget; i++) {
    emit({ phase: "act", detail: `รอบ ${i + 1}/${budget}` });

    kernel = kernelRecordAction(kernel, "act", "model_round", { round: i + 1, prompt: currentPrompt.slice(-2000) });
    const result = await callWithFallback(
      currentPrompt,
      available,
      [model],
      (lines) => lines.forEach((d) => emit({ phase: "observe", detail: d })),
      authToken,
      githubToken,
      publishCtx,
    );

    if (!result.ok) {
      kernel = kernelRecordFailure(kernel, "model_round");
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
      const hint = recoveryHint("model_round", safeText(result.error, "model failed"), consecutiveFails);
      currentPrompt =
        buildContinuePrompt(prompt, allResults, "retry", deepReasoning) +
        `\n\nKERNEL RECOVERY:\n${hint}\n${kernelSummary(kernel)}`;
      continue;
    }

    consecutiveFails = 0;
    last = result.text;
    for (const tr of result.toolResults) {
      const summary = safeText(tr.result ?? tr.error, tr.ok ? "ok" : "failed").slice(0, 800);
      evidenceEngine.ingestToolResult(tr.name, tr.ok, tr.result);
      if (!tr.ok) recoveryEngine.recordFailure(tr.name, safeText(tr.error ?? tr.result, "tool failed"));
      else recoveryEngine.markResolved(tr.name);
      const evidence = tr.ok && isEvidenceTool(tr.name);
      if (tr.ok) {
        kernel = kernelRecordObservation(kernel, tr.name, true, summary, evidence);
        const facts = knowledgeFacts(tr);
        if (facts.length) kernel = rememberKnowledge(kernel, prompt, facts, tr.name);
      } else {
        kernel = kernelRecordFailure(kernel, tr.name);
        kernel = kernelRecordObservation(kernel, tr.name, false, summary, false);
        if (isAccessDeniedResult(tr)) {
          kernel = recordAccessDenied(kernel, tr.name);
        }
      }
    }
    allResults = allResults.concat(result.toolResults);

    if (result.toolResults.length) {
      onToolResults?.(result.toolResults);
    }

    let duplicateOnly = result.toolCalls.length > 0;
    const avoidedTools = new Set<string>();
    for (const call of result.toolCalls as ToolCall[]) {
      const fp = fingerprintCall(call);
      if (!seenCalls.has(fp)) duplicateOnly = false;
      seenCalls.add(fp);
      kernel = kernelRecordAction(kernel, "act", call.name, call.arguments);
      if (shouldAvoidAction(kernel, call.name, call.arguments)) avoidedTools.add(call.name);
      emit({ phase: "observe", detail: activityLabel(call.name, true) });
    }
    for (const tr of result.toolResults) {
      const key = actionKey(tr.name, tr.result);
      if (!tr.ok) recordFoundationFailure(foundationMemory, key);
      else if (isEvidenceTool(tr.name)) {
        recordFoundationEvidence(foundationMemory, {
          source: tr.name,
          ok: true,
          verified: true,
          summary: safeText(tr.result, "verified").slice(0, 500),
        });
      }
      const ui = mcpUiPayload(tr);
      if (ui) emit({ phase: "observe", detail: `MCP_UI:${JSON.stringify(ui).slice(0, 6000)}` });
      emit({ phase: "observe", detail: activityLabel(tr.name, tr.ok) });
    }

    if (duplicateOnly && result.toolCalls.length) {
      emit({ phase: "refine", detail: "⛔ หยุดวน tool ซ้ำ — ตอบจากหลักฐานที่มี" });
      break;
    }

    const failed = result.toolResults.filter((r) => !toolSucceeded(r));
    const { done, verified } = goalSatisfied(prompt, allResults, last, result.toolCalls.length > 0);
    if (done) {
      emit({ phase: "verify", detail: verified ? "✓ มีหลักฐาน — จบงาน" : "จบจากผลที่มี" });
      return { ok: true, text: last || summarizeResults(allResults), steps, verified };
    }

    if (!result.toolCalls.length && last.trim()) {
      emit({ phase: "verify", detail: "โมเดลตอบแล้ว ไม่เปิด tool เพิ่ม" });
      return { ok: true, text: last, steps, verified: hasUsefulEvidence(allResults) };
    }

    if (failed.length && !hasUsefulEvidence(allResults) && expansions < 1) {
      await expandToolset(`tool failure: ${failed.map((f) => f.name).join(",")}`);
    }

    if (hasUsefulEvidence(allResults) && !looksLikeMutation(prompt)) {
      emit({ phase: "verify", detail: "✓ มีหลักฐานพอ — บังคับจบ ไม่ tool-shop ต่อ" });
      return {
        ok: true,
        text: last || summarizeResults(allResults),
        steps,
        verified: true,
      };
    }

    currentPrompt =
      buildContinuePrompt(prompt, allResults, failed.length ? "retry" : "continue", deepReasoning) +
      `\n\nKERNEL:\n${kernelSummary(kernel)}` +
      (avoidedTools.size ? `\nAVOID: ${[...avoidedTools].join(", ")}` : "");
  }

  return {
    ok: hasUsefulEvidence(allResults) || Boolean(last.trim()),
    text: last || summarizeResults(allResults),
    steps,
    verified: hasUsefulEvidence(allResults),
  };
}

export async function executeAgentCode(language: string, code: string) {
  return runInSandbox(language, code);
}
