/**
 * Boss Agent Foundation
 *
 * Shared execution policy for every agent run.
 * UI-agnostic, no app/sandbox creation, and Puter-first by design.
 */

export type AgentFoundationIntent =
  | "chat" | "research" | "code" | "github" | "deploy" | "verify" | "data" | "general";

export type AgentFoundationPlan = {
  intent: AgentFoundationIntent;
  needsTools: boolean;
  needsVerification: boolean;
  needsLiveEvidence: boolean;
  budget: number;
  priorities: string[];
  constraints: string[];
};

export type AgentEvidence = {
  source: string;
  ok: boolean;
  verified: boolean;
  summary: string;
};

export type AgentMemory = {
  attempted: Set<string>;
  failures: Map<string, number>;
  evidence: AgentEvidence[];
};

const TOOL_HINTS: Record<AgentFoundationIntent, string[]> = {
  chat: [],
  research: ["web_search", "web_browse", "web_fetch"],
  code: ["github_", "builder_", "test", "verify"],
  github: ["github_", "actions", "workflow", "test"],
  deploy: ["builder_", "deploy", "health", "web_check", "wait_for_workflow"],
  verify: ["web_check", "test", "build", "ci", "workflow", "health"],
  data: ["database", "data", "query"],
  general: ["github_", "web_search", "builder_", "verify"],
};

function text(goal: string): string {
  return goal.trim().toLowerCase();
}

export function classifyAgentIntent(goal: string): AgentFoundationIntent {
  const t = text(goal);
  if (/^(คับ|ครับ|ค่ะ|ok|โอเค|hello|hi|ขอบคุณ)[!.\\s]*$/i.test(t)) return "chat";
  if (/github|repo|repository|pull request|branch|commit|actions|workflow/.test(t)) return "github";
  if (/deploy|ดีพลอย|render|vercel|netlify|railway|publish|hosting/.test(t)) return "deploy";
  if (/ค้นหา|search|research|browse|หาข้อมูล|ข่าว|ราคา/.test(t)) return "research";
  if (/test|verify|ตรวจ|เช็ก|health|502|503|ci|build|lint/.test(t)) return "verify";
  if (/database|ฐานข้อมูล|sql|data/.test(t)) return "data";
  if (/code|โค้ด|แก้|fix|bug|debug|typescript|tsx|ไฟล์|เขียน/.test(t)) return "code";
  if (/สร้าง|ทำ|ระบบ|agent|เอเจ้น|api|เชื่อม/.test(t)) return "general";
  return "chat";
}

function isMutation(goal: string): boolean {
  return /แก้|เขียน|สร้าง|เพิ่ม|ลบ|เปลี่ยน|fix|patch|update|create|write|modify|repair|commit|deploy|publish|ดีพลอย/.test(text(goal));
}

function isLive(goal: string): boolean {
  return /deploy|ดีพลอย|publish|preview|เปิดเว็บ|url|https?:\\/\\//.test(text(goal));
}

/**
 * Build one compact contract before model/tool execution.
 * The contract is deliberately provider-neutral, while the runtime remains Puter-first.
 */
export function buildAgentFoundation(goal: string, requestedBudget?: number): AgentFoundationPlan {
  const intent = classifyAgentIntent(goal);
  const mutation = isMutation(goal);
  const live = isLive(goal);
  const needsVerification = mutation || live || intent === "verify" || intent === "github" || intent === "deploy";

  const defaultBudget =
    intent === "chat" ? 1 :
    intent === "research" ? 3 :
    intent === "verify" ? 5 :
    mutation || intent === "github" || intent === "deploy" ? 8 : 4;

  return {
    intent,
    needsTools: intent !== "chat",
    needsVerification,
    needsLiveEvidence: live,
    budget: Math.max(1, Math.min(10, requestedBudget ?? defaultBudget)),
    priorities: TOOL_HINTS[intent],
    constraints: [
      "Use real tool output as the source of truth.",
      "Do not claim completion without the required evidence.",
      "After a failure, change strategy before retrying.",
      "Never repeat an identical tool call indefinitely.",
      "Keep the user's original goal and constraints across recovery rounds.",
      "Use Puter as the primary model gateway when a Puter session/token is available.",
    ],
  };
}

export function createAgentMemory(): AgentMemory {
  return { attempted: new Set(), failures: new Map(), evidence: [] };
}

export function actionKey(name: string, args: unknown): string {
  try { return name + "::" + JSON.stringify(args ?? {}); }
  catch { return name; }
}

export function shouldRetry(memory: AgentMemory, key: string): boolean {
  const failures = memory.failures.get(key) ?? 0;
  if (memory.attempted.has(key) && failures > 0) return false;
  memory.attempted.add(key);
  return true;
}

export function recordFailure(memory: AgentMemory, key: string): void {
  memory.failures.set(key, (memory.failures.get(key) ?? 0) + 1);
}

export function recordEvidence(memory: AgentMemory, evidence: AgentEvidence): void {
  memory.evidence.push(evidence);
}

export function hasVerifiedEvidence(memory: AgentMemory): boolean {
  return memory.evidence.some((item) => item.ok && item.verified);
}

export function foundationPrompt(plan: AgentFoundationPlan): string {
  return [
    "AGENT FOUNDATION:",
    `Intent: ${plan.intent}`,
    `Tool use required: ${plan.needsTools ? "yes" : "no"}`,
    `Verification required: ${plan.needsVerification ? "yes" : "no"}`,
    `Live evidence required: ${plan.needsLiveEvidence ? "yes" : "no"}`,
    `Budget: ${plan.budget} rounds`,
    `Priority capabilities: ${plan.priorities.join(", ") || "none"}`,
    "Rules:",
    ...plan.constraints.map((item) => "- " + item),
  ].join("\\n");
}
