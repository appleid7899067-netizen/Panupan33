/**
 * Coworker Session — single entry that composes all 10 pillars for a turn.
 * Call from agent entrypoints; does not replace runAgentLoop, it feeds it.
 */

import { buildSpecialistBundle, type SpecialistBundle } from "./specialist-lanes";
import { decideApproveGate, type ApproveDecision } from "./approve-gate";
import {
  createEmptyRoutineStore,
  findRoutines,
  parseTeachMessage,
  teachRoutine,
  type RoutineStoreState,
} from "./routine-store";
import {
  createCloudRuntime,
  enqueueCloudJob,
  wantsBackgroundContinue,
  type CloudRuntimeState,
} from "./cloud-runtime";
import { matchPackagedJob, packagedJobPrompt, type PackagedJob } from "./packaged-jobs";
import { PUTER_FIRST_RULE, coworkerPipelineSummary } from "./coworker-pipeline";
import { redactSecrets } from "./connector-vault";

export type CoworkerSessionState = {
  routines: RoutineStoreState;
  cloud: CloudRuntimeState;
  approvedFingerprints: string[];
};

export function createCoworkerSession(): CoworkerSessionState {
  return {
    routines: createEmptyRoutineStore(),
    cloud: createCloudRuntime(),
    approvedFingerprints: [],
  };
}

export type CoworkerTurnPlan = {
  specialist: SpecialistBundle;
  packaged: PackagedJob | null;
  background: boolean;
  teach: { name: string; steps: { op: string }[] } | null;
  matchedRoutines: ReturnType<typeof findRoutines>;
  systemBlock: string;
  pipeline: string;
};

export function planCoworkerTurn(
  userText: string,
  session: CoworkerSessionState,
): { session: CoworkerSessionState; plan: CoworkerTurnPlan } {
  let next = session;
  const specialist = buildSpecialistBundle(userText);
  const packaged = matchPackagedJob(userText);
  const background = wantsBackgroundContinue(userText);
  const teach = parseTeachMessage(userText);

  if (teach) {
    const taught = teachRoutine(next.routines, {
      name: teach.name,
      description: `Taught from chat: ${teach.name}`,
      steps: teach.steps,
      tags: ["taught"],
    });
    next = { ...next, routines: taught.state };
  }

  if (background) {
    const enq = enqueueCloudJob(next.cloud, userText);
    next = { ...next, cloud: enq.state };
  }

  const matchedRoutines = findRoutines(next.routines, userText, 3);

  const systemBlock = redactSecrets(
    [
      PUTER_FIRST_RULE,
      `Pipeline: ${coworkerPipelineSummary()}`,
      specialist.label,
      specialist.skillPrompt,
      packaged ? packagedJobPrompt(packaged) : "",
      matchedRoutines.length
        ? `Matched routines:\n${matchedRoutines.map((r) => `- ${r.name} (${r.steps.length} steps)`).join("\n")}`
        : "",
      teach ? `Taught new routine "${teach.name}" with ${teach.steps.length} steps.` : "",
      background ? "Background/cloud job enqueued — continue even if UI disconnects." : "",
      "Evidence required before claiming success. Approve gate for high-risk tools.",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );

  return {
    session: next,
    plan: {
      specialist,
      packaged,
      background,
      teach,
      matchedRoutines,
      systemBlock,
      pipeline: coworkerPipelineSummary(),
    },
  };
}

export function gateTool(
  session: CoworkerSessionState,
  toolName: string,
  args?: Record<string, unknown>,
): ApproveDecision {
  return decideApproveGate({
    toolName,
    args,
    approvedFingerprints: new Set(session.approvedFingerprints),
    autoRunLowRisk: true,
  });
}

export function rememberApproval(session: CoworkerSessionState, fingerprint: string): CoworkerSessionState {
  if (session.approvedFingerprints.includes(fingerprint)) return session;
  return {
    ...session,
    approvedFingerprints: [...session.approvedFingerprints, fingerprint].slice(-100),
  };
}
