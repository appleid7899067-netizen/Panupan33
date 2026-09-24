/**
 * Bossnu Boundary Layer
 *
 * First-layer guard for goal-driven execution.
 * Keeps the Boss inside known capabilities while allowing User Skills
 * and borrowed resources to extend the route without making the agent
 * responsible for provider discovery itself.
 */

export type BossResourceClass = "core" | "user-skill" | "friend-ai" | "borrowed";
export type BossActionRisk = "low" | "medium" | "high";

export type BossBoundaryRequest = {
  goal: string;
  capability: string;
  resourceClass: BossResourceClass;
  risk: BossActionRisk;
  projectId?: string;
  requiresMutation?: boolean;
};

export type BossBoundaryDecision =
  | { allowed: true; reason: string; needsVerification: boolean }
  | { allowed: false; reason: string };

const KNOWN_CAPABILITIES = new Set([
  "chat",
  "research",
  "search",
  "code",
  "project",
  "files",
  "github",
  "deploy",
  "verify",
  "sandbox",
  "skill",
  "model",
  "data",
  "api",
  "memory",
]);

const HIGH_RISK_WORDS = /delete|ลบ|production|prod|secret|credential|token|permission|merge|publish/i;

export function isKnownCapability(capability: string): boolean {
  return KNOWN_CAPABILITIES.has(capability.trim().toLowerCase());
}

export function evaluateBossBoundary(request: BossBoundaryRequest): BossBoundaryDecision {
  const capability = request.capability.trim().toLowerCase();
  if (!isKnownCapability(capability) && request.resourceClass !== "user-skill" && request.resourceClass !== "friend-ai") {
    return {
      allowed: false,
      reason: `Unknown capability "${capability}". Route through a known capability or register a verified skill first.`,
    };
  }

  const highRisk = request.risk === "high" || HIGH_RISK_WORDS.test(request.goal);
  if (highRisk && !request.requiresMutation) {
    return {
      allowed: true,
      reason: "Capability is known; high-risk wording requires an explicit verification gate.",
      needsVerification: true,
    };
  }

  return {
    allowed: true,
    reason: `Capability "${capability}" is inside the Bossnu boundary.`,
    needsVerification: Boolean(request.requiresMutation) || capability === "deploy" || capability === "verify",
  };
}
