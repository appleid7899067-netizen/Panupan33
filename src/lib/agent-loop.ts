/**
 * Efficient Agent Loop
 * - Adaptive iteration budget by task type
 * - Early exit when evidence answers the goal
 * - Duplicate tool-call detection (no identical retries)
 * - Compact prompts (no tool-list spam every refine)
 * - Failure budget: stop after N consecutive hard fails
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
  return /web_search|web_browse|web_check|web_fetch|sandbox_run|sandbox_install|github_|builder_|test|verify|build|ci|workflow|health|deploy/i.test(
    name,
  );
}

function isAccessDeniedResult(r: ToolExecutionResult): boolean {
  const raw = safeText(r.error ?? r.result, "").toLowerCase();
  return /(^|\\D)(401|403)(\\D|$)|access denied|forbidden|unauthorized|permission denied|not authorized|authentication required/.test(raw);
}

function knowledgeFacts(r: ToolExecutionResult): string[] {
  if (!r.ok) return [];
  const summary = safeText(r.result, "").replace(/\\s+/g, " ").trim();
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
- For app/website creation goals, use the builder surface automatically: inspect/read first, then write/edit, refresh preview, and use web_check or publish verification before claiming the result works. Do not ask the user to press a manual "build" or "skill" button.
- For preview requests, return a real preview/evidence path when the available builder/hosting tools support it. A successful model response alone is never preview evidence.
- For publish requests, publish only when requested or clearly required, then verify the resulting public URL with a real HTTP check.
- Pure greeting only: answer without tools.
`;
}

/** Tasks that deserve one extra planning pass before acting. */
function wantsDeepReasoning(prompt: string): boolean {
  return (
    /(?:architecture|สถาปัตย์|ออกแบบ|debug|แก้บั๊ก|bug|refactor|หลายขั้น|ทั้งระบบ|ระบบ|deploy|ดีพลอย|ci|workflow|database|ฐานข้อมูล|security|ความปลอดภัย|mcp|agent|โค้ด|code)/i.test(
      prompt,
    ) || prompt.length > 700
  );
}

/** Pull a structured MCP UI payload out of a tool result, if the tool returned one. */
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

Still need real verification (web_check / sandbox_run / github check). Call one verification tool, then answer.${reasoningRule}`;
  }
  if (mode === "retry") {
    return `GOAL: ${prompt}

PREVIOUS FAILURES:
${summary}

Diagnose and retry with a DIFFERENT tool or different arguments. Do not repeat the identical call.${reasoningRule}`;
  }
  return `GOAL: ${prompt}

LATEST RESULTS:
${summary}

If the goal is done, answer now from the evidence. Otherwise take the next minimal useful tool action.${reasoningRule}`;
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
  publishCtx?: PublishCtx,
  /** Called after every round with real tool results — used to accumulate TaskState. */
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
  const seenCalls = new Set<string>();

  // Tool access is adaptive: start with routed real capabilities, then open
  // additional capabilities when evidence or an error shows the route is insufficient.
  const expandToolset = async (reason: string) => {
    try {
      const decision = await routeToolsForTask(`${prompt}

ROUTING SIGNAL: ${reason}`, 12);
      const existing = new Set(available.map((tool) => tool.name));
      const additions = decision.selected.filter((tool) => !existing.has(tool.name));
      if (additions.length) {
        available = [...available, ...additions];
        emit({ phase: "select", detail: `🔌 เปิดเครื่องมือเพิ่มตามสถานการณ์: ${additions.map((tool) => tool.name).join(", ")}` });
        return additions.length;
      }
    } catch (error) {
      emit({ phase: "observe", detail: `⚠️ dynamic tool routing: ${safeText(error, "failed")}` });
    }
    return 0;
  };
  let kernel: AgentKernelState = createAgentKernel(prompt);
  let consecutiveFails = 0;
  const FAIL_LIMIT = 3;

  emit({ phase: "plan", detail: "🎯 Goal & Context: รับเป้าหมายและรวบรวมบริบท" });
  emit({ phase: "plan", detail: `🗺️ Plan & Route: budget ${budget} rounds · tools ${available.length} · Puter-first` });
  emit({ phase: "plan", detail: foundationPrompt(foundation) });
  emit({ phase: "plan", detail: "🔎 Research: เตรียมข้อมูล/หลักฐานที่จำเป็นก่อนลงมือ" });
  emit({
    phase: "select",
    detail: available
      .slice(0, 10)
      .map((t) => t.name)
      .filter(Boolean)
      .join(", "),
  });
  if (deepReasoning) {
    emit({
      phase: "plan",
      detail: "🧠 Deep reasoning: ตรวจข้อจำกัด ผลข้างเคียง และเส้นทางแก้ที่สั้นที่สุด (ไม่เปิดเผย chain-of-thought)",
    });
  }

  let currentPrompt = buildKickoffPrompt(prompt, available) + `\n\n${foundationPrompt(foundation)}\n\nAGENT KERNEL:\n${kernelSummary(kernel)}`;
  let last = "";
  let lastResults: ToolExecutionResult[] = [];
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
      kernel = kernelRecordObservation(kernel, "model_round", false, safeText(result.error, "model failed"), false);
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
      currentPrompt = buildContinuePrompt(prompt, allResults, "retry", deepReasoning) + `\n\nKERNEL RECOVERY:\n${hint}\n${kernelSummary(kernel)}`;
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
        if (facts.length) {
          kernel = rememberKnowledge(kernel, prompt, facts, tr.name);
        }
      } else {
        kernel = kernelRecordFailure(kernel, tr.name);
        kernel = kernelRecordObservation(kernel, tr.name, false, summary, false);
        if (isAccessDeniedResult(tr)) {
          kernel = recordAccessDenied(kernel, tr.name);
          emit({
            phase: "refine",
            detail: `🔐 Access blocked on ${tr.name}: จำเส้นทางนี้ไว้และเปลี่ยนไปใช้ช่องทางที่ได้รับอนุญาตแทน`,
          });
        }
      }
    }
    lastResults = result.toolResults;
    allResults = allResults.concat(result.toolResults);

    // Accumulate task memory + surface publish auto-verification as a step.
    if (result.toolResults.length) {
      onToolResults?.(result.toolResults);
      for (const tr of result.toolResults) {
        const rec = tr.result && typeof tr.result === "object" ? (tr.result as Record<string, unknown>) : null;
        const av = rec?.autoVerify as { url?: string; ok?: boolean; httpStatus?: number } | undefined;
        if (av?.url) {
          emit({
            phase: "observe",
            detail: `${av.ok ? "✓" : "✗"} auto-verify preview ${av.url}${av.httpStatus != null ? ` (HTTP ${av.httpStatus})` : ""}`,
          });
        }
      }
    }

    // Record every real action in the kernel/foundation so the next round
    // can change strategy instead of blindly repeating a failed path.
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
      if (!tr.ok) {
        recordFoundationFailure(foundationMemory, key);
      } else if (isEvidenceTool(tr.name)) {
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
        emit({ phase: "verify", detail: "🔬 Verify & Publish: ตรวจหลักฐานจริงก่อนยืนยันผลลัพธ์" });
        emit({ phase: "verify", detail: verified ? "✓ จบด้วยหลักฐาน" : "✓ จบ" });
        return { ok: true, text: last, steps, verified };
      }
      if (i < budget - 1 && (looksLikeMutation(prompt) || looksLikeVerification(prompt))) {
        emit({ phase: "refine", detail: "ขอ verification เพิ่ม" });
        currentPrompt = buildContinuePrompt(prompt, allResults, "verify", deepReasoning) + `\n\nKERNEL:\n${kernelSummary(kernel)}`;
        continue;
      }
      emit({ phase: "verify", detail: verified ? "✓" : "จบแบบมีหลักฐานจำกัด" });
      return { ok: verified || Boolean(last.trim()), text: last, steps, verified };
    }

    // Tools ran — check early exit
    const failed = result.toolResults.filter((r) => !r.ok);
    if (failed.length) {
      const failureSummary = failed.map((r) => `${r.name}: ${safeText(r.error ?? r.result, "failed").slice(0, 300)}`).join(" | ");
      await expandToolset(`tool failure requires a different capability: ${failureSummary}`);
    } else if (result.toolResults.length) {
      const observed = result.toolResults.map((r) => `${r.name}: ${safeText(r.result, "ok").slice(0, 180)}`).join(" | ");
      await expandToolset(`continue from real tool evidence: ${observed}`);
    }
    if (!failed.length && hasUsefulEvidence(result.toolResults)) {
      const { done, verified } = goalSatisfied(prompt, allResults, last, true);
      // For search-style tasks, one good evidence pass is enough
      if (done || (looksLikeSearch(prompt) && !looksLikeMutation(prompt))) {
        emit({ phase: "verify", detail: "🔬 Verify & Publish: ตรวจหลักฐานจริงก่อนยืนยันผลลัพธ์" });
        emit({ phase: "verify", detail: "✓ ได้หลักฐานเพียงพอ — จบเร็ว" });
        // One short synthesis pass only if model gave empty text
        if (!last.trim() && i < budget - 1) {
          currentPrompt = buildContinuePrompt(prompt, allResults, "continue", deepReasoning) +
            "\n\nAnswer the user now from the evidence above. No more tools unless critical.";
          const synth = await callWithFallback(
            currentPrompt,
            [], // no tools — force answer
            [model],
            undefined,
            authToken,
            githubToken,
            publishCtx,
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

    const decision = kernelDecideNext(kernel);
    if (decision.kind === "recover") {
      emit({ phase: "refine", detail: `🔄 Recovery: ${decision.reason}` });
    } else if (decision.kind === "verify") {
      emit({ phase: "refine", detail: `🔎 Verification gate: ${decision.reason}` });
    }
    if (avoidedTools.size) {
      emit({ phase: "refine", detail: `⛔ หลีกเลี่ยง tool ที่วน/พังซ้ำ: ${[...avoidedTools].join(", ")}` });
    }

    if (failed.length) {
      consecutiveFails += 1;
      const failedTool = failed[0];
      const recovery = recoveryEngine.decide();
      emit({ phase: "observe", detail: `🚨 Error captured: ${safeText(failedTool?.error ?? failedTool?.result, "tool failed").slice(0, 500)}` });
      emit({ phase: "refine", detail: `🔧 Repair Engine: ${recovery.phase} → ${recovery.instruction.slice(0, 700)}` });
      emit({ phase: "refine", detail: `🧩 Root cause: ${recoveryEngine.summary().split("\n").slice(-1)[0] ?? "ตรวจจาก error จริง"}` });
      emit({ phase: "refine", detail: `error: ${failed.map((f) => f.name).join(", ")}` });
      if (consecutiveFails >= FAIL_LIMIT) {
        return {
          ok: false,
          text: last || summarizeResults(allResults),
          steps,
          verified: hasUsefulEvidence(allResults),
        };
      }
      const recoveryHintText = recoveryHint(failedTool?.name ?? "tool", safeText(failedTool?.error ?? failedTool?.result, "tool failed"), consecutiveFails);
      currentPrompt = buildContinuePrompt(prompt, allResults, "retry", deepReasoning) +
        `\n\nREPAIR ENGINE:\n${recovery.instruction}\nEVIDENCE:\n${evidenceEngine.summary()}\n\nKERNEL:\n${kernelSummary(kernel)}\n\nRECOVERY HINT:\n${recovery}${avoidedTools.size ? `\nAVOID THESE TOOLS THIS ROUND: ${[...avoidedTools].join(", ")}` : ""}\n\nPAIN MEMORY: The failed path is remembered. Do not replay the same failed action. You must change the tool, arguments, route, or verification method before the next attempt.`;
    } else {
      if (result.toolCalls.length) emit({ phase: "act", detail: "🛠️ Execute & Trace: บันทึกผลการลงมือทำจาก tool จริง" });
      emit({ phase: "refine", detail: "ต่อจากผลลัพธ์" });
      currentPrompt = buildContinuePrompt(prompt, allResults, "continue", deepReasoning) +
        `\n\nKERNEL:\n${kernelSummary(kernel)}${decision.kind === "recover" ? `\n\nRECOVERY:\n${decision.reason}` : ""}`;
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
