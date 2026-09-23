import { callWithFallback, type CodingFleetTool, type ToolExecutionResult } from "@/lib/puter-tool-loader";
import { runInSandbox, type SandboxResult } from "@/lib/sandbox";
import { discoverMCPTools } from "@/lib/mcp";
import {
  bootstrapBoss,
  bossPromptPrefix,
  onToolResults,
  shouldStopAsVerified,
  createBudget,
  budgetAllow,
  budgetConsume,
  detectToolLoop,
  selfCritique,
  persistInstructions,
  autoVerifyAfterPublish,
  type BossContext,
} from "@/lib/boss-engine";
import { builderPromptPrefix, looksLikeBuilderTask } from "@/lib/builder/prompt";

export type AgentPhase = "plan" | "select" | "act" | "observe" | "refine" | "verify";
export type AgentStep = { phase: AgentPhase; detail: string };
export type AgentRunResult = { ok: boolean; text: string; steps: AgentStep[]; sandbox?: SandboxResult; verified?: boolean };

function safeText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed && trimmed !== "[object Object]") return trimmed;
    return fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const joined = value.map((item) => safeText(item)).filter(Boolean).join("\n");
    return joined || fallback;
  }
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

function failureText(primary: unknown, results: ToolExecutionResult[] = []): string {
  const direct = safeText(primary);
  if (direct) return direct;
  const failed = results.filter((item) => !item.ok).map((item) => {
    const detail = safeText(item.error ?? item.result, "ไม่ทราบรายละเอียด");
    return `${item.name}: ${detail.slice(0, 1200)}`;
  });
  if (failed.length) return `Agent/tool ทำงานไม่สำเร็จ:\n${failed.join("\n")}`;
  const observed = results.slice(-3).map((item) => {
    const detail = safeText(item.result, "");
    return detail ? `${item.name}: ${detail.slice(0, 1000)}` : "";
  }).filter(Boolean);
  return observed.length ? `Agent ยังไม่ผ่าน verification. ผลที่ตรวจพบ:\n${observed.join("\n")}` : "Agent ยังไม่ส่งผลลัพธ์ที่อ่านได้";
}

function summarizeToolNames(tools: CodingFleetTool[]): string {
  return tools.slice(0, 8).map((tool) => String(tool.name ?? tool.slug ?? tool.id ?? "")).filter(Boolean).join(", ");
}

function activityLabel(toolName: string, ok: boolean): string {
  const name = toolName.toLowerCase();
  if (!ok) return "⚠️ กำลังตรวจ error จาก " + toolName;
  if (/builder_/.test(name)) return "🏗️ Builder: " + toolName;
  if (/extract|unzip|archive|zip|upload|attachment/.test(name)) return "📦 กำลังแตก/อ่านไฟล์จากงานที่แนบ";
  if (/github.*(fetch|read)|read.*file|file.*read/.test(name)) return "📄 กำลังอ่านไฟล์จริงจาก GitHub";
  if (/github.*(write|update|create)|write.*file|edit|patch/.test(name)) return "✏️ กำลังแก้ไขไฟล์จริง";
  if (/search|web|yandex|google/.test(name)) return "🔎 กำลังค้นข้อมูล";
  if (/sandbox|terminal|exec|run|shell|command/.test(name)) return "▶️ กำลังรันคำสั่งใน Sandbox";
  if (/workflow|actions|ci|build|test|lint|typecheck/.test(name)) return "🧪 กำลังตรวจ Build / Test / CI";
  if (/deploy|vercel|render|netlify/.test(name)) return "🚀 กำลังตรวจ/ทำ Deployment";
  if (/preview|browser|http|health/.test(name)) return "🌐 กำลังตรวจ Preview / เว็บที่รันจริง";
  return "⚙️ กำลังทำงานผ่าน " + toolName;
}

function looksLikeMutation(prompt: string): boolean {
  return /แก้|เขียน|สร้าง|ลบ|update|write|fix|repair|deploy|ดีพลอย|modify|change|commit/i.test(prompt);
}

function looksLikeVerification(prompt: string): boolean {
  return /test|verify|ตรวจ|เช็ก|build|ci|ผ่าน|ทำงานไหม|ใช้งานได้/i.test(prompt);
}

function isVerificationToolCall(name: string): boolean {
  return /(^|_)(test|verify|verification|build|ci|check|status|health|deploy|sandbox|web|http|builder_publish|builder_update_preview)(_|$)/i.test(name);
}

function verificationPassed(results: ToolExecutionResult[]): { passed: boolean; evidence: string } {
  const checks = results.filter((item) => isVerificationToolCall(item.name));
  if (!checks.length) return { passed: false, evidence: "ยังไม่มีผลลัพธ์จาก verification tool" };
  for (const check of checks) {
    if (!check.ok) continue;
    const value = check.result;
    if (check.name === "web_check" && value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const status = Number(record.status ?? 0);
      if (record.ok === true && status >= 200 && status < 300) return { passed: true, evidence: `web_check ผ่าน HTTP ${status}` };
    }
    if (check.name === "sandbox_run" && value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (record.ok === true && (record.exitCode === undefined || record.exitCode === 0)) return { passed: true, evidence: "sandbox_run ผ่าน" };
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (record.verified === true || record.success === true || record.ok === true) return { passed: true, evidence: `${check.name} verified` };
    }
  }
  return { passed: false, evidence: "verification ยังไม่ผ่านเกณฑ์" };
}

/** Plan → Select → Act → Observe → Refine → Verify + Boss Engine + Builder. */
export async function runAgentLoop(prompt: string, tools: CodingFleetTool[], maxIterations = 4, authToken?: string, onStep?: (step: AgentStep) => void, model = "gpt-5.6-luna", githubToken?: string): Promise<AgentRunResult> {
  const steps: AgentStep[] = [];
  const deepReasoning = /(?:architecture|สถาปัตย์|ออกแบบ|debug|แก้บั๊ก|bug|refactor|หลายขั้น|ทั้งระบบ|ระบบ|deploy|ดีพลอย|CI|workflow|database|ฐานข้อมูล|security|ความปลอดภัย|MCP|agent|โค้ด|code)/i.test(prompt) || prompt.length > 700;
  const emitStep = (step: AgentStep) => { steps.push(step); onStep?.(step); };

  let bossCtx: BossContext | null = null;
  let bossBudget = createBudget({ maxToolCalls: 24, maxRounds: Math.max(1, Math.min(maxIterations, 8)) });
  const recentToolNames: string[] = [];
  try {
    bossCtx = await bootstrapBoss(prompt);
    emitStep({ phase: "plan", detail: "Boss Engine online: Planner / Evidence / Recovery / Router" });
    emitStep({ phase: "select", detail: bossCtx.router.reason });
  } catch (e) {
    emitStep({ phase: "plan", detail: `Boss Engine bootstrap skipped: ${e instanceof Error ? e.message : String(e)}` });
  }

  if (looksLikeBuilderTask(prompt)) {
    emitStep({ phase: "plan", detail: "🏗️ Builder mode (HeyPuter/builder capabilities)" });
  }

  const initialSteps: AgentStep[] = [
    { phase: "plan", detail: "วิเคราะห์เจตนาผู้ใช้และแตกงานเป็นขั้นตอน (Codex)" },
    { phase: "select", detail: `เครื่องมือที่เปิดตามเจตนา: ${summarizeToolNames(tools) || "ไม่มี — ตอบตรง"}` },
  ];
  if (deepReasoning) initialSteps.splice(1, 0, { phase: "plan", detail: "🧠 Deep reasoning: เส้นทางแก้ที่สั้นที่สุด" });
  initialSteps.forEach(emitStep);

  const mcp = await discoverMCPTools();
  const mcpCount = mcp.reduce((sum, item) => sum + item.tools.length, 0);
  const builderBit = looksLikeBuilderTask(prompt) ? builderPromptPrefix() + "\n\n" : "";
  const bossPrefix = bossCtx
    ? bossPromptPrefix(bossCtx) + "\n\n" + persistInstructions() + "\n\n" + builderBit
    : persistInstructions() + "\n\n" + builderBit;
  let currentPrompt = `${bossPrefix}${prompt}

CODEX-STYLE AGENT PROTOCOL:
1. ทำเฉพาะที่ขอ อย่าขยาย scope
2. Plan → Select 1–2 tools → Act → Observe → Refine
3. ถ้า tool ล้มเหลว: วินิจฉัยจาก output จริง แล้วซ่อม
4. อย่า claim สำเร็จโดยไม่มีหลักฐาน verification
MCP tools: ${mcpCount}. Mutation: ${looksLikeMutation(prompt)}. Verify: ${looksLikeVerification(prompt)}. Builder: ${looksLikeBuilderTask(prompt)}.
Health URL: ${prompt.match(/https:\/\/[^\s)\]}>,]+/i)?.[0] || "none"}.`;

  let last = "";
  let hadVerificationActivity = false;
  let verificationPassedEvidence = "";
  let failedToolStreak = 0;
  const repairedToolNames = new Set<string>();
  const toolFailureCounts = new Map<string, number>();
  const mutationExpected = looksLikeMutation(prompt);

  for (let iteration = 0; iteration < Math.max(1, Math.min(maxIterations, 6)); iteration += 1) {
    emitStep({ phase: "act", detail: `รอบที่ ${iteration + 1}: ลงมือทำ (1–2 tool ตามเจตนา)` });
    const result = await callWithFallback(currentPrompt, tools, [model], (activity) => activity.forEach((detail) => emitStep({ phase: "observe", detail })), authToken, githubToken);
    if (!result.ok) {
      emitStep({ phase: "observe", detail: `ข้อผิดพลาด: ${safeText(result.error, "ไม่ทราบ").slice(0, 300)}` });
      return { ok: false, text: failureText(result.error, []), steps, verified: false };
    }
    last = result.text;
    hadVerificationActivity ||= result.toolResults.some((item) => isVerificationToolCall(item.name));

    if (bossCtx) {
      for (const tr of result.toolResults) recentToolNames.push(tr.name);
      bossCtx = onToolResults(bossCtx, result.toolResults.map((tr) => ({ name: tr.name, ok: tr.ok, result: tr.result, error: tr.error })));
      bossBudget = budgetConsume(bossBudget, Math.max(1, result.toolResults.length));
      for (const tr of result.toolResults) {
        if (!tr.ok) continue;
        try {
          const chain = await autoVerifyAfterPublish(tr.name, tr.result);
          if (chain) {
            emitStep({ phase: "verify", detail: chain.ok ? `✓ Publish verified: ${chain.detail}` : `✗ Publish verify failed: ${chain.detail}` });
            if (chain.ok) {
              bossCtx.evidence.add({ kind: "http", source: tr.name, summary: chain.detail, ok: true, raw: chain.http });
            }
          }
        } catch (e) {
          emitStep({ phase: "observe", detail: `Publish verify skipped: ${e instanceof Error ? e.message : String(e)}` });
        }
      }
      const loop = detectToolLoop(recentToolNames);
      if (loop.loop) emitStep({ phase: "refine", detail: `Loop detected: ${loop.name}` });
      if (!budgetAllow(bossBudget).allow) {
        emitStep({ phase: "verify", detail: budgetAllow(bossBudget).reason });
        return { ok: false, text: failureText(last, result.toolResults), steps, verified: false };
      }
      if (shouldStopAsVerified(bossCtx)) {
        const critique = selfCritique({ claimedSuccess: true, hasEvidence: true, evidenceSummary: bossCtx.evidence.summary(), openErrors: 0 });
        if (critique.pass) {
          emitStep({ phase: "verify", detail: "Evidence gate passed" });
          return { ok: true, text: last, steps, verified: true };
        }
      }
    }

    const verification = verificationPassed(result.toolResults);
    if (verification.passed) verificationPassedEvidence = verification.evidence;
    for (const toolResult of result.toolResults) {
      emitStep({ phase: "observe", detail: activityLabel(toolResult.name, toolResult.ok) });
      emitStep({ phase: "observe", detail: toolResult.ok ? `✓ ${toolResult.name}` : `✗ ${toolResult.name}: ${String(toolResult.error ?? "failed").slice(0, 180)}` });
    }
    emitStep({ phase: "observe", detail: `รอบที่ ${iteration + 1}: ${result.toolCalls.length} tool call` });

    if (!result.toolCalls.length) {
      if ((mutationExpected || hadVerificationActivity || looksLikeVerification(prompt)) && !verificationPassedEvidence) {
        if (iteration === Math.min(maxIterations, 6) - 1) return { ok: false, text: failureText(last, result.toolResults ?? []), steps, verified: false };
        emitStep({ phase: "refine", detail: "ต้องมี verification tool ก่อนจบ" });
        currentPrompt = `${prompt}\n\nVerification gate: use a real verification tool before finishing.`;
        continue;
      }
      const need = mutationExpected || hadVerificationActivity || looksLikeVerification(prompt);
      return { ok: !need || Boolean(verificationPassedEvidence), text: last, steps, verified: !need || Boolean(verificationPassedEvidence) };
    }
    if (iteration === Math.min(maxIterations, 6) - 1) {
      return { ok: false, text: failureText(last, result.toolResults), steps, verified: false };
    }

    const failedResults = result.toolResults.filter((item) => !item.ok);
    if (failedResults.length) {
      failedToolStreak += 1;
      for (const item of failedResults) {
        repairedToolNames.add(item.name);
        toolFailureCounts.set(item.name, (toolFailureCounts.get(item.name) ?? 0) + 1);
      }
      emitStep({ phase: "refine", detail: `Tool ล้มเหลว ${failedResults.length} (streak ${failedToolStreak})` });
    } else {
      failedToolStreak = 0;
      emitStep({ phase: "refine", detail: "วิเคราะห์ผลแล้วแก้ต่อ" });
    }
    const repeated = Array.from(toolFailureCounts.entries()).filter(([, c]) => c >= 2).map(([n, c]) => `${n}x${c}`);
    const recoveryHint = bossCtx?.recovery.decide().instruction ?? "";
    currentPrompt = `${prompt}\n\nRepair: ${Array.from(repairedToolNames).join(", ") || "none"}. Repeated: ${repeated.join(", ") || "none"}.\n${recoveryHint}\nLast:\n${last.slice(-8000)}\nContinue: 1–2 tools max. No success claim without evidence.`;
  }
  return { ok: false, text: failureText(last, []), steps, verified: false };
}

export async function executeAgentCode(language: string, code: string) {
  return runInSandbox({ language, code });
}
