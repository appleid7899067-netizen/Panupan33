import type { ResourceKind, ResourceMode, ResourceRequest, ResourcePlan } from "./resource-broker";
import { planResource } from "./resource-broker";
import { selectResource, type ResourceSelection } from "./resource-selection";

export type GoalResourceKind = ResourceKind | "browser";

export function planGoalCapability(
  goal: string,
  kind: GoalResourceKind,
  reason: string,
  mode?: ResourceMode,
  maxDurationMinutes?: number,
): ResourceSelection {
  const resourceKind = kind === "browser" ? ("sandbox" as ResourceKind) : kind;
  const resourceMode = mode ?? (kind === "browser" || kind === "sandbox" ? "borrow" : "native");
  const request: ResourceRequest = {
    goal: goal.trim(),
    kind: resourceKind,
    mode: resourceMode,
    reason: reason.trim(),
    maxDurationMinutes,
  };
  const plan: ResourcePlan = planResource(request);
  return selectResource(request, plan);
}
