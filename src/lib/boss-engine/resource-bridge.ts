/**
 * Bounded resource bridge.
 *
 * This module deliberately knows capability classes, not vendor names.
 * Provider-specific adapters can be registered around it later.
 */

import { planResource, type ResourceKind, type ResourceRequest, type ResourcePlan } from "./resource-broker";
import { selectResource, type ResourceSelection } from "./resource-selection";

const KNOWN_RESOURCE_KINDS: ResourceKind[] = ["sandbox", "search", "github", "deploy", "model", "friend-ai"];

export function isKnownResourceKind(kind: string): kind is ResourceKind {
  return KNOWN_RESOURCE_KINDS.includes(kind as ResourceKind);
}

export function planGoalResource(
  goal: string,
  kind: ResourceKind,
  reason: string,
  mode: "native" | "borrow" = kind === "sandbox" ? "borrow" : "native",
  maxDurationMinutes?: number,
): ResourceSelection {
  const request: ResourceRequest = { goal, kind, mode, reason, maxDurationMinutes };
  const plan: ResourcePlan = planResource(request);
  return selectResource(request, plan);
}
