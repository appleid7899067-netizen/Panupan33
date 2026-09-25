export type CloudJob = { id: string; goal: string; status: "queued" | "running" | "done" | "failed"; createdAt: number };

const jobs = new Map<string, CloudJob>();

function id() { return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }

export function enqueueCloudJob(goal: string): CloudJob {
  const job = { id: id(), goal, status: "queued" as const, createdAt: Date.now() };
  jobs.set(job.id, job);
  return job;
}

export function getCloudJob(jobId: string): CloudJob | null {
  return jobs.get(jobId) ?? null;
}
