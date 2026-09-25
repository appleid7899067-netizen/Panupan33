export type RiskAction = "deploy" | "merge" | "send" | "write" | "delete" | "read";
export type ApprovalDecision = { required: boolean; action: RiskAction; reason: string };

const HIGH_RISK = new Set<RiskAction>(["deploy", "merge", "send"]);

export function classifyRisk(action: string): ApprovalDecision {
  const normalized = action.trim().toLowerCase() as RiskAction;
  if (HIGH_RISK.has(normalized)) {
    return { required: true, action: normalized, reason: `Action "${normalized}" requires explicit approval before execution.` };
  }
  return { required: false, action: normalized || "read", reason: "No approval gate required." };
}

export function requireApproval(action: string): boolean {
  return classifyRisk(action).required;
}
