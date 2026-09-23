/**
 * PHASE 3 — GitHub Autonomous Loop
 * Branch → Edit → Commit → PR → CI → Diagnose → Repair → Verify
 */

export type GitHubLoopPhase =
  | "branch"
  | "edit"
  | "commit"
  | "pr"
  | "ci_wait"
  | "diagnose"
  | "repair"
  | "verify"
  | "merge"
  | "done"
  | "failed";

export type GitHubLoopState = {
  id: string;
  repo: string; // owner/name
  baseBranch: string;
  workBranch: string;
  phase: GitHubLoopPhase;
  prNumber?: number;
  prUrl?: string;
  lastCommitSha?: string;
  ciStatus?: "pending" | "success" | "failure" | "unknown";
  ciLogExcerpt?: string;
  diagnosis?: string;
  repairAttempts: number;
  maxRepairAttempts: number;
  errors: string[];
  updatedAt: number;
};

function uid(): string {
  return `ghloop_${Math.random().toString(36).slice(2, 10)}`;
}

export function createGitHubLoop(repo: string, baseBranch = "main", branchPrefix = "boss"): GitHubLoopState {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return {
    id: uid(),
    repo,
    baseBranch,
    workBranch: `${branchPrefix}/${stamp}`,
    phase: "branch",
    repairAttempts: 0,
    maxRepairAttempts: 3,
    errors: [],
    updatedAt: Date.now(),
  };
}

const ORDER: GitHubLoopPhase[] = [
  "branch",
  "edit",
  "commit",
  "pr",
  "ci_wait",
  "diagnose",
  "repair",
  "verify",
  "merge",
  "done",
];

export function advancePhase(state: GitHubLoopState, next?: GitHubLoopPhase): GitHubLoopState {
  if (next) return { ...state, phase: next, updatedAt: Date.now() };
  const i = ORDER.indexOf(state.phase);
  const phase = i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : state.phase;
  return { ...state, phase, updatedAt: Date.now() };
}

/** Parse CI failure log into actionable diagnosis. */
export function diagnoseCiLog(log: string): { file?: string; command?: string; error: string } {
  const lines = log.split("\n").map((l) => l.trim()).filter(Boolean);
  let file: string | undefined;
  let command: string | undefined;
  let error = lines.find((l) => /error|Error|FAIL|failed/i.test(l)) || log.slice(0, 300);

  const fileMatch = log.match(/(?:at |Error in |\/)([\w./-]+\.(?:ts|tsx|js|jsx|mjs)):(\d+)/);
  if (fileMatch) file = fileMatch[1];

  const cmdMatch = log.match(/(?:npm run |pnpm |yarn )([\w:-]+)/);
  if (cmdMatch) command = cmdMatch[0];

  const tsMatch = log.match(/error TS\d+:\s*(.+)/);
  if (tsMatch) error = tsMatch[0].slice(0, 400);

  return { file, command, error: error.slice(0, 500) };
}

export function onCiResult(state: GitHubLoopState, ok: boolean, logExcerpt?: string): GitHubLoopState {
  if (ok) {
    return {
      ...state,
      ciStatus: "success",
      phase: "verify",
      ciLogExcerpt: logExcerpt?.slice(0, 2000),
      updatedAt: Date.now(),
    };
  }
  const diagnosis = logExcerpt ? diagnoseCiLog(logExcerpt) : { error: "CI failed without log" };
  const attempts = state.repairAttempts + 1;
  if (attempts > state.maxRepairAttempts) {
    return {
      ...state,
      ciStatus: "failure",
      phase: "failed",
      diagnosis: diagnosis.error,
      repairAttempts: attempts,
      ciLogExcerpt: logExcerpt?.slice(0, 2000),
      errors: [...state.errors, diagnosis.error],
      updatedAt: Date.now(),
    };
  }
  return {
    ...state,
    ciStatus: "failure",
    phase: "diagnose",
    diagnosis: [diagnosis.file && `file=${diagnosis.file}`, diagnosis.command && `cmd=${diagnosis.command}`, diagnosis.error]
      .filter(Boolean)
      .join(" | "),
    repairAttempts: attempts,
    ciLogExcerpt: logExcerpt?.slice(0, 2000),
    updatedAt: Date.now(),
  };
}

export function githubLoopSummary(state: GitHubLoopState): string {
  return [
    `GitHub loop ${state.id}`,
    `repo=${state.repo} branch=${state.workBranch} base=${state.baseBranch}`,
    `phase=${state.phase} ci=${state.ciStatus ?? "n/a"} repairs=${state.repairAttempts}/${state.maxRepairAttempts}`,
    state.prUrl ? `PR: ${state.prUrl}` : "",
    state.diagnosis ? `diagnosis: ${state.diagnosis}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
