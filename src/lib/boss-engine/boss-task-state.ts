/**
 * Agent State / Task Memory
 * จำ Goal, ไฟล์ที่แก้, error, ผลการทดสอบ, Preview/Deploy ล่าสุด
 * เปิดแชตกลับมาแล้วทำงานต่อได้
 */

import type { ExecutionPlan } from "./boss-planner";

export type ChangedFile = {
  path: string;
  action: "create" | "edit" | "delete";
  shaBefore?: string;
  shaAfter?: string;
  summary?: string;
  at: number;
};

export type ErrorRecord = {
  id: string;
  source: string;
  message: string;
  diagnosis?: string;
  at: number;
  resolved?: boolean;
};

export type TestRecord = {
  id: string;
  name: string;
  ok: boolean;
  detail: string;
  at: number;
};

export type PreviewRecord = {
  url: string;
  commit?: string;
  verified: boolean;
  statusCode?: number;
  at: number;
};

export type DeployRecord = {
  provider: string;
  url?: string;
  ok: boolean;
  detail: string;
  at: number;
};

export type TaskState = {
  id: string;
  threadId?: string;
  goal: string;
  plan: ExecutionPlan | null;
  changedFiles: ChangedFile[];
  errors: ErrorRecord[];
  tests: TestRecord[];
  lastPreview: PreviewRecord | null;
  lastDeploy: DeployRecord | null;
  decisions: string[];
  evidenceNotes: string[];
  createdAt: number;
  updatedAt: number;
  status: "active" | "paused" | "completed" | "failed";
};

function uid(prefix = "task"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const taskStore = new Map<string, TaskState>();

export function createTaskState(goal: string, threadId?: string, plan?: ExecutionPlan | null): TaskState {
  const state: TaskState = {
    id: uid("task"),
    threadId,
    goal,
    plan: plan ?? null,
    changedFiles: [],
    errors: [],
    tests: [],
    lastPreview: null,
    lastDeploy: null,
    decisions: [],
    evidenceNotes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "active",
  };
  taskStore.set(state.id, state);
  if (threadId) taskStore.set(`thread:${threadId}`, state);
  return state;
}

export function getTaskState(idOrThread: string): TaskState | null {
  return taskStore.get(idOrThread) ?? taskStore.get(`thread:${idOrThread}`) ?? null;
}

export function saveTaskState(state: TaskState): TaskState {
  const next = { ...state, updatedAt: Date.now() };
  taskStore.set(next.id, next);
  if (next.threadId) taskStore.set(`thread:${next.threadId}`, next);
  return next;
}

export function recordFileChange(state: TaskState, change: Omit<ChangedFile, "at">): TaskState {
  return saveTaskState({
    ...state,
    changedFiles: [...state.changedFiles, { ...change, at: Date.now() }].slice(-100),
  });
}

export function recordError(state: TaskState, source: string, message: string, diagnosis?: string): TaskState {
  return saveTaskState({
    ...state,
    errors: [
      ...state.errors,
      { id: uid("err"), source, message: message.slice(0, 2000), diagnosis, at: Date.now(), resolved: false },
    ].slice(-50),
  });
}

export function resolveError(state: TaskState, errorId: string): TaskState {
  return saveTaskState({
    ...state,
    errors: state.errors.map((e) => (e.id === errorId ? { ...e, resolved: true } : e)),
  });
}

export function recordTest(state: TaskState, name: string, ok: boolean, detail: string): TaskState {
  return saveTaskState({
    ...state,
    tests: [...state.tests, { id: uid("test"), name, ok, detail: detail.slice(0, 1500), at: Date.now() }].slice(-40),
  });
}

export function recordPreview(state: TaskState, preview: Omit<PreviewRecord, "at">): TaskState {
  return saveTaskState({
    ...state,
    lastPreview: { ...preview, at: Date.now() },
  });
}

export function recordDeploy(state: TaskState, deploy: Omit<DeployRecord, "at">): TaskState {
  return saveTaskState({
    ...state,
    lastDeploy: { ...deploy, at: Date.now() },
  });
}

export function addDecision(state: TaskState, decision: string): TaskState {
  return saveTaskState({
    ...state,
    decisions: [...state.decisions, decision.slice(0, 500)].slice(-30),
  });
}

export function addEvidenceNote(state: TaskState, note: string): TaskState {
  return saveTaskState({
    ...state,
    evidenceNotes: [...state.evidenceNotes, note.slice(0, 800)].slice(-40),
  });
}

export function attachPlan(state: TaskState, plan: ExecutionPlan): TaskState {
  return saveTaskState({ ...state, plan });
}

export function resumeSummary(state: TaskState): string {
  const planLine = state.plan
    ? `Plan status: ${state.plan.status}; current: ${state.plan.currentStepId ?? "none"}`
    : "No plan yet";
  const files = state.changedFiles.slice(-5).map((f) => `${f.action} ${f.path}`).join(", ") || "none";
  const unresolved = state.errors.filter((e) => !e.resolved).slice(-3);
  const lastTest = state.tests[state.tests.length - 1];
  const preview = state.lastPreview
    ? `${state.lastPreview.url} (verified=${state.lastPreview.verified})`
    : "none";
  return [
    `Goal: ${state.goal.slice(0, 300)}`,
    planLine,
    `Files changed recently: ${files}`,
    unresolved.length
      ? `Open errors: ${unresolved.map((e) => e.message.slice(0, 100)).join(" | ")}`
      : "No open errors",
    lastTest ? `Last test: ${lastTest.name}=${lastTest.ok ? "ok" : "fail"}` : "No tests yet",
    `Last preview: ${preview}`,
    state.lastDeploy ? `Last deploy: ${state.lastDeploy.provider} ok=${state.lastDeploy.ok}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function serializeTaskState(state: TaskState): string {
  return JSON.stringify(state);
}

export function deserializeTaskState(raw: string): TaskState | null {
  try {
    const parsed = JSON.parse(raw) as TaskState;
    if (!parsed?.id || !parsed?.goal) return null;
    taskStore.set(parsed.id, parsed);
    if (parsed.threadId) taskStore.set(`thread:${parsed.threadId}`, parsed);
    return parsed;
  } catch {
    return null;
  }
}
