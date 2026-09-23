/**
 * Autonomous Planner — Goal → Execution Graph
 * แตกงานใหญ่เป็นขั้นตอน, จัดลำดับ dependency, รู้ว่าขั้นไหนเสร็จ, resume ได้หลัง error
 */

export type PlanStepStatus = "pending" | "running" | "done" | "failed" | "skipped" | "blocked";

export type PlanStep = {
  id: string;
  title: string;
  detail?: string;
  /** step ids that must be done first */
  dependsOn: string[];
  status: PlanStepStatus;
  /** capability / tool group needed e.g. github, sandbox, web */
  needs: string[];
  error?: string;
  evidence?: string;
  startedAt?: number;
  finishedAt?: number;
};

export type ExecutionPlan = {
  id: string;
  goal: string;
  createdAt: number;
  updatedAt: number;
  steps: PlanStep[];
  currentStepId: string | null;
  status: "planning" | "running" | "paused" | "completed" | "failed";
};

function uid(prefix = "step"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Heuristic decomposition of a user goal into ordered steps. */
export function decomposeGoal(goal: string): PlanStep[] {
  const text = goal.toLowerCase();
  const steps: PlanStep[] = [];

  const push = (title: string, needs: string[], dependsOn: string[] = [], detail?: string) => {
    steps.push({
      id: uid("s"),
      title,
      detail,
      dependsOn,
      status: "pending",
      needs,
    });
  };

  // Always start with understand + inspect
  push("Understand goal", ["chat"], [], "Parse user intent and constraints");
  const understandId = steps[0].id;

  push("Inspect project / context", ["github", "code"], [understandId], "Read structure, deps, routes, config");
  const inspectId = steps[steps.length - 1].id;

  const needsCode =
    /สร้าง|เขียน|แก้|code|build|app|เว็บ|website|landing|todo|dashboard|ร้าน|กาแฟ|fix|bug|error/.test(text);
  const needsDeploy = /deploy|ดีพลอย|host|publish|vercel|netlify|puter|preview/.test(text);
  const needsVerify = /test|verify|ตรวจ|เช็ก|build|ci|ผ่าน|ทำงานไหม|ใช้งานได้/.test(text) || needsCode || needsDeploy;
  const needsGithub = /github|repo|pr|pull request|commit|branch|ci/.test(text);
  const needsSearch = /ค้นหา|search|หาข้อมูล|research/.test(text);

  let lastId = inspectId;

  if (needsSearch) {
    push("Research external info", ["web", "search"], [lastId]);
    lastId = steps[steps.length - 1].id;
  }

  if (needsCode) {
    push("Plan code changes", ["code"], [lastId], "Multi-file change plan with dependencies");
    lastId = steps[steps.length - 1].id;
    push("Write / edit code", ["code", "sandbox"], [lastId]);
    lastId = steps[steps.length - 1].id;
    push("Run & observe", ["sandbox"], [lastId]);
    lastId = steps[steps.length - 1].id;
  }

  if (needsGithub) {
    push("GitHub: branch / commit / PR", ["github"], [lastId]);
    lastId = steps[steps.length - 1].id;
  }

  if (needsDeploy || needsCode) {
    push("Build artifact", ["sandbox", "verify"], [lastId]);
    lastId = steps[steps.length - 1].id;
  }

  if (needsDeploy) {
    push("Publish / Deploy", ["deploy", "puter"], [lastId]);
    lastId = steps[steps.length - 1].id;
    push("Open real preview URL", ["web", "preview"], [lastId]);
    lastId = steps[steps.length - 1].id;
  }

  if (needsVerify || needsDeploy || needsCode) {
    push("Verify with evidence", ["verify", "web", "sandbox"], [lastId], "HTTP/build/CI evidence required");
    lastId = steps[steps.length - 1].id;
  }

  // Ensure at least a minimal plan
  if (steps.length <= 2) {
    push("Respond / complete", ["chat"], [lastId]);
  }

  return steps;
}

export function createPlan(goal: string): ExecutionPlan {
  const steps = decomposeGoal(goal);
  return {
    id: uid("plan"),
    goal,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    steps,
    currentStepId: steps.find((s) => s.status === "pending")?.id ?? null,
    status: "planning",
  };
}

/** Next runnable step whose dependencies are all done. */
export function nextRunnableStep(plan: ExecutionPlan): PlanStep | null {
  for (const step of plan.steps) {
    if (step.status !== "pending" && step.status !== "failed") continue;
    const depsOk = step.dependsOn.every((depId) => {
      const dep = plan.steps.find((s) => s.id === depId);
      return dep?.status === "done" || dep?.status === "skipped";
    });
    if (depsOk) return step;
  }
  return null;
}

export function markStepRunning(plan: ExecutionPlan, stepId: string): ExecutionPlan {
  return {
    ...plan,
    updatedAt: Date.now(),
    status: "running",
    currentStepId: stepId,
    steps: plan.steps.map((s) =>
      s.id === stepId ? { ...s, status: "running" as const, startedAt: Date.now(), error: undefined } : s,
    ),
  };
}

export function markStepDone(plan: ExecutionPlan, stepId: string, evidence?: string): ExecutionPlan {
  const steps = plan.steps.map((s) =>
    s.id === stepId
      ? { ...s, status: "done" as const, finishedAt: Date.now(), evidence: evidence ?? s.evidence }
      : s,
  );
  const allDone = steps.every((s) => s.status === "done" || s.status === "skipped");
  const next = nextRunnableStep({ ...plan, steps });
  return {
    ...plan,
    steps,
    updatedAt: Date.now(),
    currentStepId: next?.id ?? null,
    status: allDone ? "completed" : "running",
  };
}

export function markStepFailed(plan: ExecutionPlan, stepId: string, error: string): ExecutionPlan {
  return {
    ...plan,
    updatedAt: Date.now(),
    status: "failed",
    currentStepId: stepId,
    steps: plan.steps.map((s) =>
      s.id === stepId ? { ...s, status: "failed" as const, finishedAt: Date.now(), error } : s,
    ),
  };
}

/** Resume after pause/error: find first failed or next pending with deps met. */
export function resumePlan(plan: ExecutionPlan): ExecutionPlan {
  const failed = plan.steps.find((s) => s.status === "failed");
  if (failed) {
    const steps = plan.steps.map((s) =>
      s.id === failed.id ? { ...s, status: "pending" as const, error: undefined } : s,
    );
    return { ...plan, steps, status: "running", updatedAt: Date.now(), currentStepId: failed.id };
  }
  const next = nextRunnableStep(plan);
  return {
    ...plan,
    status: next ? "running" : plan.status === "completed" ? "completed" : "paused",
    currentStepId: next?.id ?? null,
    updatedAt: Date.now(),
  };
}

export function planSummary(plan: ExecutionPlan): string {
  const lines = plan.steps.map((s) => {
    const icon =
      s.status === "done" ? "✓" : s.status === "running" ? "▶" : s.status === "failed" ? "✗" : "○";
    return `${icon} ${s.title}${s.error ? ` (${s.error.slice(0, 80)})` : ""}`;
  });
  return `Goal: ${plan.goal.slice(0, 200)}\nStatus: ${plan.status}\n${lines.join("\n")}`;
}
