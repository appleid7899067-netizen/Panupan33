export type BossGoal = { text: string; context?: string; memory?: string[] };

export type ExecutionEvent = {
  phase: "analyze" | "plan" | "select" | "execute" | "verify" | "complete" | "error";
  detail: string;
  timestamp: number;
};

export type ExecutionResult = {
  ok: boolean;
  text: string;
  verified: boolean;
  events: ExecutionEvent[];
};

export interface BossAgent {
  id: string;
  run(goal: BossGoal): Promise<ExecutionResult>;
}

export const BOSS_FLOW = [
  "analyze",
  "plan",
  "select",
  "execute",
  "verify",
  "complete",
] as const;
