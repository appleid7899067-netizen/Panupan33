/**
 * Approve Gate — risky actions stop until the user approves.
 * Engine-side: classifies tools/intents and produces gate decisions.
 * UI must surface pendingApprovals; never auto-approve high risk.
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ApproveDecision =
  | { action: "allow"; reason: string; risk: RiskLevel }
  | { action: "require_approve"; reason: string; risk: RiskLevel; tool: string; summary: string }
  | { action: "deny"; reason: string; risk: RiskLevel };

const HIGH_RISK =
  /github_.*merge|github_.*delete|deploy|puter_hosting|send_email|telegram_send|discord_send|payment|transfer|rm\s+-rf|drop\s+table|force.?push/i;

const MEDIUM_RISK =
  /github_.*(create|update|push|pr|commit|write)|write_file|builder_write|terminal_execute|sandbox_run|http_post|api_call/i;

export function classifyToolRisk(toolName: string, args?: Record<string, unknown>): RiskLevel {
  const blob = `${toolName} ${JSON.stringify(args ?? {})}`;
  if (HIGH_RISK.test(blob)) return "critical";
  if (MEDIUM_RISK.test(blob)) return "high";
  if (/web_|search|browse|read|list|get_/i.test(toolName)) return "low";
  return "medium";
}

export function decideApproveGate(opts: {
  toolName: string;
  args?: Record<string, unknown>;
  /** User already approved this fingerprint this session */
  approvedFingerprints?: Set<string>;
  /** Global auto-run mode (user setting) */
  autoRunLowRisk?: boolean;
}): ApproveDecision {
  const risk = classifyToolRisk(opts.toolName, opts.args);
  const fp = fingerprint(opts.toolName, opts.args);

  if (opts.approvedFingerprints?.has(fp)) {
    return { action: "allow", reason: "user already approved this action", risk };
  }

  if (risk === "low" && opts.autoRunLowRisk !== false) {
    return { action: "allow", reason: "low-risk read/search", risk };
  }

  if (risk === "critical" || risk === "high") {
    return {
      action: "require_approve",
      reason: `Risky tool (${risk}) requires explicit approval before execution`,
      risk,
      tool: opts.toolName,
      summary: summarize(opts.toolName, opts.args),
    };
  }

  return { action: "allow", reason: "medium risk allowed under commander policy", risk };
}

export function fingerprint(toolName: string, args?: Record<string, unknown>): string {
  try {
    return `${toolName}::${JSON.stringify(args ?? {})}`;
  } catch {
    return toolName;
  }
}

function summarize(toolName: string, args?: Record<string, unknown>): string {
  const keys = args ? Object.keys(args).slice(0, 6).join(", ") : "";
  return keys ? `${toolName}({${keys}})` : toolName;
}

export type PendingApproval = {
  id: string;
  tool: string;
  summary: string;
  risk: RiskLevel;
  fingerprint: string;
  createdAt: number;
};

export function createPendingApproval(tool: string, args: Record<string, unknown> | undefined, risk: RiskLevel): PendingApproval {
  return {
    id: `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    tool,
    summary: summarize(tool, args),
    risk,
    fingerprint: fingerprint(tool, args),
    createdAt: Date.now(),
  };
}
