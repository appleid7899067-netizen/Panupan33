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
  type BossContext,
} from "@/lib/boss-engine";

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
  return /(^|_)(test|verify|verification|build|ci|check|status|health|deploy|sandbox|web|http)(_|$)/i.test(name);
}

function diagnoseToolFailure(item: ToolExecutionResult): string {
  const raw = String(item.error ?? item.result ?? "").slice(0, 1200);
  const text = raw.toLowerCase();
  if (/502|bad gateway/.test(text)) return `Root cause hint: upstream/deployment gateway failure (HTTP 502) from ${item.name}.`;
  if (/503|service unavailable/.test(text)) return `Root cause hint: service unavailable or unhealthy deployment from ${item.name}.`;
  if (/timeout|timed out|etimedout|econnreset|socket hang up/.test(text)) return `Root cause hint: network/service timeout from ${item.name}.`;
  if (/401|unauthorized|authentication|token|api key/.test(text)) return `Root cause hint: authentication/credential failure from ${item.name}.`;
  if (/403|forbidden|permission|access denied/.test(text)) return `Root cause hint: permission/access failure from ${item.name}.`;
  if (/404|not found|module not found/.test(text)) return `Root cause hint: missing route/resource/module from ${item.name}.`;
  if (/eaddrinuse|address already in use|port/.test(text)) return `Root cause hint: port/process conflict from ${item.name}.`;
  if (/typescript|ts\d+|type error/.test(text)) return `Root cause hint: TypeScript/type-check failure from ${item.name}.`;
  if (/eslint|lint/.test(text)) return `Root cause hint: lint/style-check failure from ${item.name}.`;
  if (/npm err|pnpm|yarn|package|dependency|cannot find module/.test(text)) return `Root cause hint: dependency/package resolution failure from ${item.name}.`;
  if (/referenceerror|typeerror|cannot read propert|undefined is not/.test(text)) return `Root cause hint: runtime JavaScript error from ${item.name}.`;
  if (/syntaxerror|parse error|unexpected token/.test(text)) return `Root cause hint: syntax/parse failure from ${item.name}.`;
  return `Root cause hint: inspect the concrete error from ${item.name}; do not guess.`;
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
      if (record.ok === true && (record.exitCode === undefined || record.exitCode === 0)) return { passed: true, evidence: "sandbox_run ผ่านและไม่มี exit error" };
    }
    if (/workflow|actions|ci|build|deploy|check|status/i.test(check.name) && value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (record.verified === true || (record.status === "completed" && record.conclusion === "success") || record.success === true) return { passed: true, evidence: `${check.name} รายงานผลสำเร็จจาก tool จริง` };
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (record.verified === true || record.success === true) return { passed: true, evidence: `${check.name} รายงานผล verified/success จาก tool จริง` };
    }
  }
  return { passed: false, evidence: "verification tool ทำงานแล้ว แต่ผลจริงยังไม่ผ่านเกณฑ์" };
}

/** Plan → Select ONE → Act → Observe → Refine → Verify + Boss Engine. */
export async function runAgentLoop(prompt: string, tools: CodingFleetTool[], maxIterations = 4, authToken?: string, onStep?: (step: AgentStep) => void, model = "gpt-5.6-luna", githubToken?: string): Promise<AgentRunResult> {
  const steps: AgentStep[] = [];
  const deepReasoning = /(?:architecture|สถาปัตย์|ออกแบบ|debug|แก้บั๊ก|bug|refactor|หลายขั้น|ทั้งระบบ|ระบบ|deploy|ดีพลอย|CI|workflow|database|ฐานข้อมูล|security|ความปลอดภัย|MCP|agent|โค้ด|code)/i.test(prompt) || prompt.length > 700;
  const emitStep = (step: AgentStep) => { steps.push(step); onStep?.(step); };
  // Boss Engine (Phase 1–5)
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
  const initialSteps: AgentStep[] = [
    { phase: "plan", detail: "วิเคราะห์เจตนาผู้ใช้และแตกงานเป็นขั้นตอน (Codex)" },
    { phase: "select", detail: `เครื่องมือที่เปิดตามเจตนา: ${summarizeToolNames(tools) || "ไม่มี — ตอบตรง"}` },
  ];
  if (deepReasoning) initialSteps.splice(1, 0, { phase: "plan", detail: "🧠 Deep reasoning: ตรวจข้อจำกัด, ผลข้างเคียง และเส้นทางแก้ที่สั้นที่สุด (ไม่เปิดเผย chain-of-thought)" });
  initialSteps.forEach(emitStep);
  const mcp = await discoverMCPTools();
  const mcpCount = mcp.reduce((sum, item) => sum + item.tools.length, 0);
  const bossPrefix = bossCtx ? bossPromptPrefix(bossCtx) + "\n\n" : "";
  let currentPrompt = `${bossPrefix}${prompt}

CODEX-STYLE AGENT PROTOCOL (บังคับ):
1. อ่านเจตนาผู้ใช้ให้ครบ — ทำเฉพาะที่ขอ อย่าขยาย scope
2. Plan → Select ONE tool that is necessary right now → Act → Observe real output → Refine → next step
3. ห้ามเรียกเครื่องมือทีละชุดทั้งหมดในรอบเดียว อย่างมาก 1–2 tool ต่อรอบ
4. ถ้ายังไม่จำเป็นต้องใช้ tool ให้ตอบตรง ๆ เลย
5. ถ้า tool ล้มเหลว: วินิจฉัยจาก output จริง แล้วซ่อม — ห้ามเดา
6. อย่า claim สำเร็จจนกว่าจะมีหลักฐาน verification

MCP tools discovered: ${mcpCount} (registry already filtered by intent — do not invent extra tools).
Task mutation expected: ${looksLikeMutation(prompt)}.
Verification requested: ${looksLikeVerification(prompt)}. For deployed URLs use web_check; HTTP 2xx = healthy; 5xx/timeout = failed.
Health target if any: ${prompt.match(/https:\/\/[^\s)\]}>,]+/i)?.[0] || "none"}.
Never claim external success without tool evidence.`;
  let last = "";
  let hadToolActivity = false;
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
      emitStep({ phase: "observe", detail: `เครื่องมือ/โมเดลแจ้งข้อผิดพลาด: ${safeText(result.error, "ไม่ทราบรายละเอียด").slice(0, 300)}` });
      return { ok: false, text: failureText(result.error, []), steps, verified: false };
    }
    last = result.text;
    hadToolActivity ||= result.toolCalls.length > 0;
    hadVerificationActivity ||= result.toolResults.some((item) => isVerificationToolCall(item.name));
    // Boss Engine: evidence + recovery + budget + loop detection
    if (bossCtx) {
      for (const tr of result.toolResults) recentToolNames.push(tr.name);
      bossCtx = onToolResults(bossCtx, result.toolResults.map((tr) => ({ name: tr.name, ok: tr.ok, result: tr.result, error: tr.error })));
      bossBudget = budgetConsume(bossBudget, Math.max(1, result.toolResults.length));
      const loop = detectToolLoop(recentToolNames);
      if (loop.loop) emitStep({ phase: "refine", detail: `Loop detected: ${loop.name} — changing strategy` });
      const budget = budgetAllow(bossBudget);
      if (!budget.allow) {
        emitStep({ phase: "verify", detail: budget.reason });
        return { ok: false, text: failureText(last, result.toolResults), steps, verified: false };
      }
      if (shouldStopAsVerified(bossCtx)) {
        const critique = selfCritique({
          claimedSuccess: true,
          hasEvidence: true,
          evidenceSummary: bossCtx.evidence.summary(),
          openErrors: 0,
        });
        if (critique.pass) {
          emitStep({ phase: "verify", detail: `Evidence gate passed` });
          return { ok: true, text: last, steps, verified: true };
        }
      }
    }
    const verification = verificationPassed(result.toolResults);
    if (verification.passed) verificationPassedEvidence = verification.evidence;
    for (const toolResult of result.toolResults) {
      emitStep({ phase: "observe", detail: activityLabel(toolResult.name, toolResult.ok) });
      emitStep({ phase: "observe", detail: toolResult.ok ? `✓ ${toolResult.name}` : `✗ ${toolResult.name}: ${String(toolResult.error ?? "tool failed").slice(0, 180)}` });
    }
    emitStep({ phase: "observe", detail: `รอบที่ ${iteration + 1}: ได้ผลลัพธ์และ ${result.toolCalls.length} tool call` });
    if (!result.toolCalls.length) {
      if ((mutationExpected || hadVerificationActivity || looksLikeVerification(prompt)) && !verificationPassedEvidence) {
        emitStep({ phase: "verify", detail: "ยังไม่มีหลักฐานจาก verification tool" });
        if (iteration === Math.min(maxIterations, 6) - 1) return { ok: false, text: failureText(last, result.toolResults ?? []), steps, verified: false };
        emitStep({ phase: "refine", detail: "ขอให้ Agent เรียกเครื่องมือตรวจสอบจริงก่อนประกาศสำเร็จ" });
        currentPrompt = `${prompt}\n\nVerification gate: external mutation is expected. You MUST use an actual verification tool before finishing.`;
        continue;
      }
      const verificationRequired = mutationExpected || hadVerificationActivity || looksLikeVerification(prompt);
      emitStep({ phase: "verify", detail: verificationRequired ? `Verification gate: ${verificationPassedEvidence || "ยังไม่มีหลักฐาน"}` : "ไม่มี external mutation ที่ต้องตรวจเพิ่ม" });
      return { ok: !verificationRequired || Boolean(verificationPassedEvidence), text: last, steps, verified: !verificationRequired || Boolean(verificationPassedEvidence) };
    }
    if (iteration === Math.min(maxIterations, 6) - 1) {
      emitStep({ phase: "verify", detail: "หมดรอบซ่อมที่กำหนด" });
      return { ok: false, text: failureText(last, result.toolResults), steps, verified: false };
    }
    const failedResults = result.toolResults.filter((item) => !item.ok);
    if (failedResults.length) {
      failedToolStreak += 1;
      for (const item of failedResults) {
        repairedToolNames.add(item.name);
        toolFailureCounts.set(item.name, (toolFailureCounts.get(item.name) ?? 0) + 1);
      }
      emitStep({ phase: "refine", detail: `พบ Tool ล้มเหลว ${failedResults.length} รายการ (streak ${failedToolStreak})` });
    } else {
      failedToolStreak = 0;
      emitStep({ phase: "refine", detail: "นำผลจริงกลับไปให้ Agent วิเคราะห์และแก้ต่อ" });
    }
    const repeatedFailures = Array.from(toolFailureCounts.entries()).filter(([, count]) => count >= 2).map(([name, count]) => `${name} failed ${count} times`);
    const recoveryHint = bossCtx?.recovery.decide().instruction ?? "";
    currentPrompt = `${prompt}\n\nRepair context: ${Array.from(repairedToolNames).join(", ") || "none"}.\nRepeated: ${repeatedFailures.join("; ") || "none"}.\n${recoveryHint}\nPrevious output:\n${last.slice(-8000)}\nContinue Codex-style: at most 1–2 tools. Do not claim success without verification evidence.`;
  }
  return { ok: false, text: failureText(last, []), steps, verified: false };
}

export async function executeAgentCode(language: string, code: string) {
  return runInSandbox({ language, code });
}
