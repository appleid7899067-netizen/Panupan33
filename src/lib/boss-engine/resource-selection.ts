import type { ResourceRequest, ResourcePlan } from "./resource-broker";
import { isBoundedBorrow, type BorrowedResource } from "./resource-adapters";

export type ResourceSelection = {
  request: ResourceRequest;
  plan: ResourcePlan;
  resource?: BorrowedResource;
  reason: string;
};

export function selectResource(request: ResourceRequest, plan: ResourcePlan): ResourceSelection {
  if (plan.mode === "borrow" && !isBoundedBorrow(request, plan)) {
    return { request, plan, reason: "Borrow request rejected: goal, reason, lease, or verification contract is missing." };
  }

  return {
    request,
    plan,
    reason: plan.mode === "native"
      ? "Use native " + plan.kind + " capability for the stated goal."
      : "Borrow a " + plan.kind + " resource only for the stated goal, then release and verify it.",
  };
}

export function canUseBorrowedResource(selection: ResourceSelection): boolean {
  return selection.plan.mode === "borrow" && selection.plan.verifyAfterUse && Boolean(selection.request.goal.trim());
}