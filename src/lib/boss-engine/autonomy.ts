/**
 * PHASE 5 — Autonomy
 * Capability Discovery · Model Routing · Multi-Agent · Budget Guard · Loop Detection · Self-Critique · Evidence Completion
 */

export type AgentRole = "research" | "build" | "repair" | "verify" | "boss";

export type ModelTier = "cheap" | "standard" | "strong" | "coding";

export type BudgetState = {
  maxToolCalls: number;
  usedToolCalls: number;
  maxRounds: number;
  usedRounds: number;
  maxTokensEstimate: number;
  usedTokensEstimate: number;
};

export function createBudget(opts?: Partial<BudgetState>): BudgetState {
  return {
    maxToolCalls: opts?.maxToolCalls ?? 24,
    usedToolCalls: 0,
    maxRounds: opts?.maxRounds ?? 8,
    usedRounds: 0,
    maxTokensEstimate: opts?.maxTokensEstimate ?? 120_000,
    usedTokensEstimate: 0,
  };
}

export function budgetAllow(b: BudgetState, toolCalls = 1): { allow: boolean; reason: string } {
  if (b.usedToolCalls + toolCalls > b.maxToolCalls) {
    return { allow: false, reason: `Tool budget exhausted (${b.usedToolCalls}/${b.maxToolCalls})` };
  }
  if (b.usedRounds >= b.maxRounds) {
    return { allow: false, reason: `Round budget exhausted (${b.usedRounds}/${b.maxRounds})` };
  }
  if (b.usedTokensEstimate >= b.maxTokensEstimate) {
    return { allow: false, reason: `Token budget exhausted (~${b.usedTokensEstimate})` };
  }
  return { allow: true, reason: "ok" };
}

export function budgetConsume(b: BudgetState, toolCalls = 1, tokens = 0): BudgetState {
  return {
    ...b,
    usedToolCalls: b.usedToolCalls + toolCalls,
    usedRounds: b.usedRounds + 1,
    usedTokensEstimate: b.usedTokensEstimate + tokens,
  };
}

/** Route model tier by task hardness. */
export function routeModelTier(prompt: string): ModelTier {
  const t = prompt.toLowerCase();
  if (/architecture|refactor|security|multi-file|ทั้งระบบ|debug ยาก|ci fail/.test(t) || prompt.length > 1200) {
    return "strong";
  }
  if (/code|โค้ด|เขียน|แก้|bug|typescript|tsx|sandbox/.test(t)) return "coding";
  if (/ค้นหา|search|สรุป|explain|อธิบาย/.test(t)) return "standard";
  if (/^(คับ|ครับ|ok|ได้|ขอบคุณ)/i.test(prompt.trim())) return "cheap";
  return "standard";
}

/** Discover missing capability and suggest alternative strategy. */
export function discoverCapabilityGap(
  needed: string[],
  availableToolNames: string[],
): { missing: string[]; alternatives: string[] } {
  const avail = new Set(availableToolNames.map((n) => n.toLowerCase()));
  const missing = needed.filter((n) => ![...avail].some((a) => a.includes(n.toLowerCase())));
  const alternatives: string[] = [];
  for (const m of missing) {
    if (/web|http/.test(m)) alternatives.push("Use sandbox curl or manual status report");
    else if (/github/.test(m)) alternatives.push("Ask user for token or work from local files only");
    else if (/deploy|puter|vercel/.test(m)) alternatives.push("Produce build artifacts and hand off deploy steps");
    else alternatives.push(`Skip ${m} and document limitation`);
  }
  return { missing, alternatives };
}

/** Multi-agent role assignment for a goal. */
export function delegateRoles(goal: string): AgentRole[] {
  const roles: AgentRole[] = ["boss"];
  const t = goal.toLowerCase();
  if (/ค้นหา|research|หาข้อมูล/.test(t)) roles.push("research");
  if (/สร้าง|เขียน|code|build|แก้/.test(t)) roles.push("build");
  if (/bug|error|พัง|fail|repair|ซ่อม/.test(t)) roles.push("repair");
  if (/test|verify|ตรวจ|deploy|preview/.test(t) || roles.includes("build")) roles.push("verify");
  return [...new Set(roles)];
}

/** Loop detection on recent tool name sequence. */
export function detectToolLoop(recentNames: string[], window = 4): { loop: boolean; name?: string } {
  if (recentNames.length < window) return { loop: false };
  const slice = recentNames.slice(-window);
  if (slice.every((n) => n === slice[0])) return { loop: true, name: slice[0] };
  // alternating A B A B
  if (window >= 4 && slice[0] === slice[2] && slice[1] === slice[3] && slice[0] !== slice[1]) {
    return { loop: true, name: `${slice[0]}↔${slice[1]}` };
  }
  return { loop: false };
}

/** Self-critique before claiming done. */
export function selfCritique(opts: {
  claimedSuccess: boolean;
  hasEvidence: boolean;
  evidenceSummary: string;
  openErrors: number;
}): { pass: boolean; critique: string } {
  if (opts.claimedSuccess && !opts.hasEvidence) {
    return {
      pass: false,
      critique: "CLAIM REJECTED: success claimed without evidence. Do not tell the user it is done.",
    };
  }
  if (opts.openErrors > 0) {
    return {
      pass: false,
      critique: `CLAIM REJECTED: ${opts.openErrors} open error(s) remain. Repair first.`,
    };
  }
  if (opts.claimedSuccess && opts.hasEvidence) {
    return {
      pass: true,
      critique: `OK to complete. Evidence: ${opts.evidenceSummary.slice(0, 300)}`,
    };
  }
  return {
    pass: false,
    critique: "Not complete yet — keep working until evidence gate passes.",
  };
}

export function evidenceCompletionGate(hasEvidence: boolean, openErrors: number): boolean {
  return hasEvidence && openErrors === 0;
}
