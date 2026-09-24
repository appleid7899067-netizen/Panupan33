/**
 * Bounded borrowed-resource policy.
 *
 * Boss requests a capability, not a provider. This layer converts that need
 * into an allowed resource class and a short-lived lease. Provider selection
 * belongs to an adapter/runtime layer outside the model.
 */

import type { ResourceKind, ResourceMode, ResourceRequest, ResourcePlan } from "./resource-broker";

export type BorrowedResource = {
  id: string;
  kind: ResourceKind;
  mode: ResourceMode;
  provider?: string;
  leaseMinutes: number;
  goal: string;
  status: "requested" | "active" | "released" | "failed";
};

export type ResourceAdapter = {
  kind: ResourceKind;
  canProvide: (request: ResourceRequest) => boolean;
  acquire: (request: ResourceRequest, plan: ResourcePlan) => Promise<BorrowedResource>;
  release: (resource: BorrowedResource) => Promise<void>;
};

export function isBoundedBorrow(request: ResourceRequest, plan: ResourcePlan): boolean {
  return (
    plan.mode === "borrow" &&
    Boolean(request.goal.trim()) &&
    Boolean(request.reason.trim()) &&
    plan.expiresAfterMinutes > 0 &&
    plan.verifyAfterUse === true
  );
}

export function createBorrowRequest(
  goal: string,
  kind: ResourceKind,
  reason: string,
  maxDurationMinutes?: number,
): ResourceRequest {
  return { goal: goal.trim(), kind, mode: "borrow", reason: reason.trim(), maxDurationMinutes };
}
