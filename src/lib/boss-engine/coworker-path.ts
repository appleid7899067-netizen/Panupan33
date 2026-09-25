import { planCoworkerTurn } from "./coworker-session";

export function coworkerPromptBlock(userText: string): string {
  const plan = planCoworkerTurn(userText);
  return [
    "=== COWORKER (Puter-first) ===",
    `Specialist lane: ${plan.lane}`,
    plan.skills.length ? `Matched skills: ${plan.skills.join(", ")}` : "",
    plan.packagedJob ? `Packaged job: ${plan.packagedJob}` : "",
    plan.routine ? `Routine: ${plan.routine}` : "",
    plan.cloudJobId ? `Background job: ${plan.cloudJobId}` : "",
    plan.approvalRequired ? "Mutation requires approval before deploy/merge/send." : "",
    "Execute only capabilities actually available. Verify mutations with fresh evidence.",
  ].filter(Boolean).join("\n");
}
