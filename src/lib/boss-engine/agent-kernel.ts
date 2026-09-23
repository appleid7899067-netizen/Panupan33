/**
 * Agent Kernel — execution foundation for Panupan33.
 *
 * This module is intentionally UI-agnostic and does not create an app or sandbox.
 * It gives every agent run the same durable mental model:
 *   goal -> contract -> plan hints -> act -> observe -> recover -> verify -> decide
 *
 * It is deterministic/pure where possible so it can be used by chat, API, GitHub
 * loops and future agents without coupling them to a specific frontend.
 */

export type KernelIntent =
  | "chat"
  | "research"
  | "code"
  | "github"
  | "deploy"
  | "verify"
  | "data"
  | "general";

export type KernelRisk = "low" | "medium" | "high";

export type GoalContract = {
  goal: string;
  intent: KernelIntent;
  mutation: boolean;
  requiresVerification: boolean;
  requiresExternalEvidence: boolean;
  requiresLiveCheck: boolean;
  risk: KernelRisk;
  constraints: string[];
};

export type KernelAction = {
  id: string;
  phase: "plan" | "act" | "observe" | "recover" | "verify";
  tool: string;
  inputFingerprint: string;
  ok?: boolean;
  summary?: string;
  at: number;
};

export type KernelObservation = {
  source: string;
  ok: boolean;
  summary: string;
  evidence: boolean;
  at: number;
};

export type KernelDecision =
  | { kind: "continue"; reason: string }
  | { kind: "verify"; reason: string }
  | { kind: "recover"; reason: string; avoidTools: string[] }
  | { kind: "complete"; reason: string }
  | { kind: "blocked"; reason: string };

export type AgentKernelState = {
  contract: GoalContract;
  actions: KernelAction[];
  observations: KernelObservation[];
  failures: Record<string, number>;
  completedCapabilities: string[];
  startedAt: number;
  updatedAt: number;
};

const MAX_ACTIONS = 80;
const MAX_OBSERVATIONS = 80;

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function classifyIntent(goal: string): KernelIntent {
  const t = goal.toLowerCase();
  if (/^(คับ|ครับ|ค่ะ|ok|โอเค|ขอบคุณ|hello|hi)[!.\\s]*$/i.test(goal.trim())) return "chat";
  if (/github|repo|repository|pull request|branch|commit|actions|workflow/.test(t)) return "github";
  if (/deploy|ดีพลอย|render|vercel|netlify|railway|publish|hosting/.test(t)) return "deploy";
  if (/ค้นหา|search|research|browse|หาข้อมูล|ข่าว|ราคา/.test(t)) return "research";
  if (/test|verify|ตรวจ|เช็ก|health|http|502|503|ci|build/.test(t)) return "verify";
  if (/database|ฐานข้อมูล|sql|data/.test(t)) return "data";
  if (/code|โค้ด|แก้|fix|bug|debug|typescript|tsx|ไฟล์|เขียน/.test(t)) return "code";
  if (/สร้าง|ทำ|ระบบ|agent|เอเจ้น|api|เชื่อม/.test(t)) return "general";
  return "chat";
}

function hasMutation(goal: string): boolean {
  return /แก้|เขียน|สร้าง|เพิ่ม|ลบ|เปลี่ยน|fix|patch|update|create|write|modify|repair|commit|deploy|ดีพลอย|publish/.test(
    goal.toLowerCase(),
  );
}

function hasVerification(goal: string): boolean {
  return /test|verify|ตรวจ|เช็ก|build|typecheck|lint|ci|workflow|ผ่าน|ใช้งานได้|ทำงานไหม|health|http/.test(
    goal.toLowerCase(),
  );
}

function hasLiveCheck(goal: string): boolean {
  return /deploy|ดีพลอย|publish|preview|เปิดเว็บ|url|https?:\/\//.test(goal.toLowerCase());
}

function riskOf(goal: string): KernelRisk {
  const t = goal.toLowerCase();
  if (/delete|ลบ|production|prod|database|ฐานข้อมูล|secret|token|credential|permission|merge/.test(t)) return "high";
  if (hasMutation(goal) || /github|deploy|ดีพลอย/.test(t)) return "medium";
  return "low";
}

/** Build a machine-readable contract before tools are selected. */
export function createGoalContract(goal: string): GoalContract {
  const intent = classifyIntent(goal);
  const mutation = hasMutation(goal);
  const live = hasLiveCheck(goal);
  const verification = hasVerification(goal) || mutation || live;

  const constraints = [
    "Never claim success without runtime evidence.",
    "Never invent tool output, URLs, commits, tests, CI or deployment status.",
    "Prefer the smallest useful action before expanding the plan.",
    "After a failure, change strategy before retrying.",
  ];

  if (mutation) constraints.push("Repository mutations must be attributable to a concrete file/commit result.");
  if (live) constraints.push("Live work requires an external reachability check when available.");
  if (riskOf(goal) === "high") constraints.push("High-risk actions require explicit evidence and a final verification gate.");

  return {
    goal: goal.trim(),
    intent,
    mutation,
    requiresVerification: verification,
    requiresExternalEvidence: verification || intent === "research",
    requiresLiveCheck: live,
    risk: riskOf(goal),
    constraints,
  };
}

/** Create a fresh run state. No persistence or UI assumptions. */
export function createAgentKernel(goal: string): AgentKernelState {
  const now = Date.now();
  return {
    contract: createGoalContract(goal),
    actions: [],
    observations: [],
    failures: {},
    completedCapabilities: [],
    startedAt: now,
    updatedAt: now,
  };
}

export function actionFingerprint(tool: string, input?: unknown): string {
  return `${tool}::${textOf(input ?? {}).slice(0, 2000)}`;
}

export function recordAction(
  state: AgentKernelState,
  phase: KernelAction["phase"],
  tool: string,
  input?: unknown,
): AgentKernelState {
  const next: AgentKernelState = {
    ...state,
    actions: [
      ...state.actions,
      {
        id: uid("act"),
        phase,
        tool,
        inputFingerprint: actionFingerprint(tool, input),
        at: Date.now(),
      },
    ].slice(-MAX_ACTIONS),
    updatedAt: Date.now(),
  };
  return next;
}

export function recordObservation(
  state: AgentKernelState,
  source: string,
  ok: boolean,
  summary: string,
  evidence = false,
): AgentKernelState {
  const observations = [
    ...state.observations,
    { source, ok, summary: summary.slice(0, 1500), evidence, at: Date.now() },
  ].slice(-MAX_OBSERVATIONS);

  const completedCapabilities = new Set(state.completedCapabilities);
  if (ok) completedCapabilities.add(source);

  return {
    ...state,
    observations,
    completedCapabilities: [...completedCapabilities].slice(-40),
    updatedAt: Date.now(),
  };
}

export function recordFailure(state: AgentKernelState, tool: string): AgentKernelState {
  return {
    ...state,
    failures: {
      ...state.failures,
      [tool]: (state.failures[tool] ?? 0) + 1,
    },
    updatedAt: Date.now(),
  };
}

export function hasEvidence(state: AgentKernelState): boolean {
  return state.observations.some((o) => o.ok && o.evidence);
}

export function recentFailures(state: AgentKernelState, min = 2): string[] {
  return Object.entries(state.failures)
    .filter(([, count]) => count >= min)
    .map(([tool]) => tool);
}

/** Prevent blind loops before a tool call is made. */
/**
 * Pain memory gate:
 * - If an exact action already failed, never replay that exact action.
 * - A failed capability may still be used again, but only with a changed
 *   route, input, or strategy.
 * - After repeated failures, avoid the capability entirely for this run.
 */
export function shouldAvoidAction(state: AgentKernelState, tool: string, input?: unknown): boolean {
  const fp = actionFingerprint(tool, input);
  const same = state.actions.filter((a) => a.inputFingerprint === fp);
  const failedCapability = (state.failures[tool] ?? 0) >= 1;
  const exactFailureReplay = failedCapability && same.length >= 1;
  const exhaustedCapability = (state.failures[tool] ?? 0) >= 3;
  return exactFailureReplay || exhaustedCapability;
}

export function missingVerification(state: AgentKernelState): string[] {
  const c = state.contract;
  const missing: string[] = [];
  if (!c.requiresVerification) return missing;

  if (!state.observations.some((o) => o.ok && o.evidence)) {
    missing.push("real verification evidence");
  }

  if (c.mutation && !state.observations.some((o) => o.ok && /write|edit|patch|commit|file|github/i.test(o.source))) {
    missing.push("mutation evidence");
  }

  if (c.requiresLiveCheck && !state.observations.some((o) => o.ok && /web|http|health|preview/i.test(o.source))) {
    missing.push("live reachability evidence");
  }

  return missing;
}

/**
 * Central decision gate. Agents should ask this after every meaningful observation.
 * It deliberately prefers verification over optimistic completion.
 */
export function decideNext(state: AgentKernelState): KernelDecision {
  const repeated = recentFailures(state, 2);
  if (repeated.length) {
    return {
      kind: "recover",
      reason: `Repeated failure detected: ${repeated.join(", ")}. Change strategy before retrying.`,
      avoidTools: repeated,
    };
  }

  const missing = missingVerification(state);
  if (missing.length) {
    return {
      kind: "verify",
      reason: `Verification gate still missing: ${missing.join(", ")}`,
    };
  }

  if (state.contract.intent === "chat" && !state.actions.length) {
    return { kind: "complete", reason: "Pure chat request requires no tool execution." };
  }

  if (hasEvidence(state)) {
    return { kind: "complete", reason: "Goal has actionable evidence and the verification gate is satisfied." };
  }

  return { kind: "continue", reason: "No sufficient evidence yet. Take the next minimal useful action." };
}

/** Compact state for passing between model/tool rounds without prompt bloat. */
export function kernelSummary(state: AgentKernelState): string {
  const decision = decideNext(state);
  const recent = state.observations
    .slice(-5)
    .map((o) => `${o.ok ? "✓" : "✗"} ${o.source}: ${o.summary.slice(0, 140)}`)
    .join("\n");

  return [
    `Intent: ${state.contract.intent}`,
    `Risk: ${state.contract.risk}`,
    `Mutation: ${state.contract.mutation}`,
    `Evidence: ${hasEvidence(state) ? "yes" : "no"}`,
    `Avoid exact failed actions: ${Object.keys(state.failures).length ? "yes" : "no"}`,
    `Recovery rule: failed path is remembered; next action must change tool, input, or route`,
    `Next: ${decision.kind} — ${decision.reason}`,
    recent ? `Recent observations:\n${recent}` : "Recent observations: none",
  ].join("\n");
}

/** Final truth gate. A model's prose can never satisfy this by itself. */
export function finalVerificationGate(state: AgentKernelState): {
  ok: boolean;
  missing: string[];
  reason: string;
} {
  const missing = missingVerification(state);
  const openFailures = Object.values(state.failures).filter((n) => n >= 1).length;

  if (openFailures && state.contract.requiresVerification) {
    return {
      ok: false,
      missing: [...missing, "unresolved tool failures"],
      reason: "The run still has observed failures; do not claim completion.",
    };
  }

  if (missing.length) {
    return { ok: false, missing, reason: `Not verified: ${missing.join(", ")}` };
  }

  return {
    ok: true,
    missing: [],
    reason: "Verification contract satisfied by observed runtime evidence.",
  };
}

/**
 * Deterministic recovery hint. This is intentionally conservative and never
 * invents a root cause that was not present in the observed error.
 */
export function recoveryHint(tool: string, error: string, attempt: number): string {
  const e = error.toLowerCase();
  if (attempt >= 3) return `Stop repeating ${tool}; the capability is exhausted for this run. Escalate or switch capability.`;
  if (attempt >= 1) return `Remember this failure. Do NOT replay the same ${tool} action. Change the tool, arguments, route, or verification method, then try once.`;
  if (/401|403|auth|token|permission/.test(e)) return "Check credentials/scope and use a different authenticated path.";
  if (/502|503|timeout|gateway|unavailable/.test(e)) return "Re-check service health and latest deployment before retrying.";
  if (/module not found|cannot find module|npm err|package/.test(e)) return "Inspect dependency manifest and lockfile, fix the concrete missing dependency, then rerun the smallest check.";
  if (/typeerror|referenceerror|undefined|null/.test(e)) return "Inspect the failing stack/file path and patch the concrete null/undefined path.";
  if (/syntaxerror|parse error|unexpected token/.test(e)) return "Inspect the exact syntax location and make the smallest parse-safe patch.";
  if (/404|not found/.test(e)) return "Confirm the exact path, route or resource exists before rewriting.";
  return "Inspect the concrete error, change strategy, then rerun a targeted verification.";
}
