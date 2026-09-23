import { callWithFallback, loadCodingFleetTools, type CodingFleetTool, type ToolExecutionResult } from "@/lib/puter-tool-loader";
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
  return /test|verify|build|lint|typecheck|ci|workflow|health|http|status|deploy|sandbox_run/i.test(name);
}

function hasSuccessfulVerification(results: ToolExecutionResult[]): boolean {
  return results.some((r) => {
    if (!r.ok || !isVerificationTool(r.name)) return false;
    if (!r.result || typeof r.result !== "object") return true;
    const record = r.result as Record<string, unknown>;
    return record.ok === true || record.success === true || record.verified === true ||
      (typeof record.status === "number" && record.status >= 200 && record.status < 300) ||
      (typeof record.exitCode === "number" && record.exitCode === 0);
  });
}

function activityLabel(name: string, ok: boolean): string {
  if (!ok) return `⚠️ ตรวจ error จาก ${name}`;
  const n = name.toLowerCase();
  if (/search|web/.test(n)) return "🔎 ค้นข้อมูลจริง";
  if (/github.*(get|list|search)|read.*file/.test(n)) return "📄 อ่านข้อมูลจริงจาก GitHub";
  if (/write|create|update|delete|edit/.test(n)) return "✏️ แก้ไขข้อมูลจริง";
  if (/sandbox|run|exec|command/.test(n)) return "▶️ ลงมือรันจริง";
  if (/test|build|lint|typecheck|ci|workflow/.test(n)) return "🧪 ตรวจผลจริง";
  if (/deploy|publish|render|vercel|netlify/.test(n)) return "🚀 ตรวจ/ทำ deployment";
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
14. Keep tool use economical. Do not call a model or tool again when the existing result is already sufficient.
15. If the task is simple and can be answered without tools, answer directly.
16. If the task changes code or deployment, success requires real verification. If verification is unavailable, say so explicitly.
17. When the goal is completed, return a concise factual result with what actually happened and the evidence. If it is not completed, state exactly what failed and what remains.

IMPORTANT:
- You control the tool sequence.
- Results are evidence.
- The user should only need to state WHAT they want.
- Do not expose internal planning jargon unless useful to explain an actual blocker.
=== END BOSS AUTONOMOUS AGENT ===
`;
}

export async function runAgentLoop(
  prompt: string,
  tools: CodingFleetTool[],
  _maxIterations = 4,
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

  const mutation = looksLikeMutation(prompt);
  const verificationRequested = looksLikeVerification(prompt);

  // Refresh the complete tool registry at the execution boundary so MCP,
  // GitHub, web search, sandbox and builder tools are available without
  // requiring the user to select a channel manually.
  const discoveredTools = await loadCodingFleetTools(true);
  const supplied = new Map(tools.map((tool) => [String(tool.name ?? tool.slug ?? tool.id ?? ""), tool]));
  for (const tool of discoveredTools) supplied.set(String(tool.name ?? tool.slug ?? tool.id ?? ""), tool);
  const effectiveTools = Array.from(supplied.values());

  emit({ phase: "plan", detail: "เข้าใจเป้าหมายจากภาษาคน แล้วให้ Agent เลือกวิธีทำเอง" });
  emit({ phase: "select", detail: effectiveTools.length ? `เปิดเครื่องมือ ${effectiveTools.length} ตัวให้ Agent ตัดสินใจเอง` : "ไม่มีเครื่องมือที่จำเป็น จึงตอบตรง" });

  const autonomousPrompt = buildAutonomousPrompt(prompt, effectiveTools);
  let activityCount = 0;

  const result = await callWithFallback(
    autonomousPrompt,
    effectiveTools,
    [model],
    (lines) => {
      for (const detail of lines) {
        activityCount += 1;
        emit({ phase: "act", detail: `[${activityCount}] ${detail}` });
      }
    },
    authToken,
    githubToken,
  );

  if (!result.ok) {
    emit({ phase: "observe", detail: `Agent เรียกใช้ไม่ได้: ${safeText(result.error, "unknown error").slice(0, 500)}` });
    return { ok: false, text: safeText(result.error, "Agent ทำงานไม่สำเร็จ"), steps, verified: false };
  }

  for (const toolResult of result.toolResults) {
    emit({ phase: "observe", detail: activityLabel(toolResult.name, toolResult.ok) });
    emit({
      phase: "observe",
      detail: toolResult.ok
        ? `✓ ${toolResult.name}`
        : `✗ ${toolResult.name}: ${safeText(toolResult.error ?? toolResult.result, "failed").slice(0, 240)}`,
    });
  }

  const verified = hasSuccessfulVerification(result.toolResults) || Boolean(result.verified);
  const needsVerification = mutation || verificationRequested;

  if (needsVerification && !verified) {
    emit({ phase: "verify", detail: "ยังไม่มีหลักฐาน verification จาก tool จริง" });
    emit({ phase: "refine", detail: "Agent จบโดยไม่มีหลักฐานผ่าน จึงไม่อ้างว่าสำเร็จ" });
    return {
      ok: false,
      text: result.text || summarizeFailure(result.toolResults),
      steps,
      verified: false,
    };
  }

  emit({ phase: "verify", detail: verified ? "✓ มีหลักฐานจาก tool/runtime" : "✓ งานนี้ไม่ต้องมี verification เพิ่ม" });
  return {
    ok: true,
    text: result.text || summarizeFailure(result.toolResults),
    steps,
    verified,
  };
}

export async function executeAgentCode(language: string, code: string) {
  return runInSandbox({ language, code });
}
