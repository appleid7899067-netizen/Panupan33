/**
 * Cloud Runtime / Computer continuity
 * Tracks background jobs so work can continue after the browser tab closes.
 * Execution is delegated to existing sandbox / background-sandbox modules.
 */

export type CloudJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type CloudJob = {
  id: string;
  goal: string;
  status: CloudJobStatus;
  createdAt: number;
  updatedAt: number;
  threadId?: string;
  lastDetail?: string;
  artifactIds?: string[];
};

export type CloudRuntimeState = {
  jobs: CloudJob[];
};

export function createCloudRuntime(): CloudRuntimeState {
  return { jobs: [] };
}

export function enqueueCloudJob(
  state: CloudRuntimeState,
  goal: string,
  threadId?: string,
): { state: CloudRuntimeState; job: CloudJob } {
  const now = Date.now();
  const job: CloudJob = {
    id: `job_${now}_${Math.random().toString(36).slice(2, 7)}`,
    goal: goal.trim(),
    status: "queued",
    createdAt: now,
    updatedAt: now,
    threadId,
  };
  return { state: { jobs: [job, ...state.jobs].slice(0, 50) }, job };
}

export function updateCloudJob(
  state: CloudRuntimeState,
  id: string,
  patch: Partial<Pick<CloudJob, "status" | "lastDetail" | "artifactIds">>,
): CloudRuntimeState {
  return {
    jobs: state.jobs.map((j) =>
      j.id === id ? { ...j, ...patch, updatedAt: Date.now() } : j,
    ),
  };
}

export function listActiveJobs(state: CloudRuntimeState): CloudJob[] {
  return state.jobs.filter((j) => j.status === "queued" || j.status === "running");
}

/** Intent: user wants work to continue after close */
export function wantsBackgroundContinue(text: string): boolean {
  return /ทำต่อ|background|หลังปิด|cloud|รันต่อ|overnight|ทั้งคืน|ไม่ต้องรอ/i.test(text);
}
