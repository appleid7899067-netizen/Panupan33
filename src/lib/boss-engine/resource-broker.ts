/**
 * Goal-driven resource broker.
 *
 * Boss asks for a capability. The broker maps that need to a small set of
 * known resource classes. It does not make the model responsible for knowing
 * every external provider.
 */

export type ResourceKind = "sandbox" | "search" | "github" | "deploy" | "model" | "friend-ai";
export type ResourceMode = "native" | "borrow";

export type ResourceRequest = {
  goal: string;
  kind: ResourceKind;
  mode?: ResourceMode;
  reason: string;
  maxDurationMinutes?: number;
};

export type ResourcePlan = {
  kind: ResourceKind;
  mode: ResourceMode;
  reason: string;
  expiresAfterMinutes: number;
  verifyAfterUse: boolean;
};

const DEFAULT_BORROW_LIMITS: Record<ResourceKind, number> = {
  sandbox: 15,
  search: 5,
  github: 10,
  deploy: 15,
  model: 10,
  "friend-ai": 10,
};

export function planResource(request: ResourceRequest): ResourcePlan {
  const mode = request.mode ?? (request.kind === "sandbox" ? "borrow" : "native");
  const limit = DEFAULT_BORROW_LIMITS[request.kind];
  const requested = request.maxDurationMinutes ?? limit;

  return {
    kind: request.kind,
    mode,
    reason: request.reason.trim(),
    expiresAfterMinutes: Math.max(1, Math.min(requested, limit)),
    verifyAfterUse: true,
  };
}
