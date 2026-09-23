/**
 * Phase 3 — Deterministic GitHub loop driver (pure, testable).
 *
 * Drives branch → edit → commit → PR → CI → diagnose → repair → verify from
 * chat intent WITHOUT letting the model guess the phase. The state machine
 * (github-loop.ts) decides the next action after every real result; the model
 * is only asked to (a) produce file changes and (b) propose repairs from a CI
 * diagnosis.
 *
 * All GitHub access goes through an injected DriverGitHub — the production
 * implementation (github-loop-driver.server.ts) wraps the same server
 * functions the agent tools use, so authorization and error behavior stay
 * identical. Unit tests inject an in-memory fake instead.
 */
import {
  advancePhase,
  createGitHubLoop,
  diagnoseCiLog,
  githubLoopSummary,
  onCiResult,
  type GitHubLoopState,
} from "./github-loop.ts";

export type RepoRef = { owner: string; repo: string };

const FILE_EXT = /^(ts|tsx|js|jsx|mjs|cjs|css|scss|html|htm|json|md|markdown|py|rb|go|rs|sh|yml|yaml|toml|txt|env|lock|vue|svelte|php|sql|xml|csv)$/i;
const NOT_OWNERS = new Set([
  "src", "app", "lib", "dist", "build", "out", "node_modules", "docs", "scripts",
  "public", "packages", "assets", "components", "pages", "test", "tests", "spec",
  "coverage", "server", "client", "web", "api", "core", "utils", "helpers",
]);

/** Extract an owner/repo reference from a prompt (URL or plain `owner/repo`). */
export function parseRepoRef(prompt: string): RepoRef | null {
  const text = prompt ?? "";
  // 1) Explicit github.com/owner/repo
  const urlMatch = text.match(/github\.com\/([A-Za-z0-9_.-]{1,39})\/([A-Za-z0-9_.-]{1,100})/i);
  if (urlMatch) {
    const repo = urlMatch[2].replace(/\.git$/i, "").replace(/[^A-Za-z0-9_.-]/g, "");
    if (repo && !FILE_EXT.test(repo)) return { owner: urlMatch[1], repo };
  }
  // 2) Plain owner/repo token (skip obvious file paths)
  for (const m of text.matchAll(/\b([A-Za-z0-9][A-Za-z0-9_.-]{0,38})\/([A-Za-z0-9][A-Za-z0-9_.-]{0,99})\b/g)) {
    const owner = m[1];
    let repo = m[2];
    if (/\.git$/i.test(repo)) repo = repo.slice(0, -4);
    if (!repo || owner === repo) continue;
    if (NOT_OWNERS.has(owner.toLowerCase())) continue;
    const ext = repo.split(".").pop() ?? "";
    if (FILE_EXT.test(ext)) continue;
    if (/github\.com/i.test(owner)) continue;
    return { owner, repo };
  }
  return null;
}

/** Does the prompt ask for repository mutations (not just reading)? */
export function wantsGitHubMutation(prompt: string): boolean {
  return /แก้|เขียน|เพิ่ม|สร้าง|ซ่อม|เปลี่ยน|fix|patch|update|add|create|deploy|commit|pull request|\bpr\b|merge|release/i.test(prompt);
}

/* ------------------------------------------------------------------ */
/* Injectable drivers (fakes for tests, HTTP impl in *.server.ts)      */
/* ------------------------------------------------------------------ */

export type DriverWorkflowRun = {
  id: number;
  status: string;
  conclusion: string | null;
  head_branch?: string | null;
  head_sha?: string;
  html_url?: string;
};

export type DriverGitHub = {
  status(owner: string, repo: string): Promise<{ default_branch?: string; full_name?: string }>;
  listDir(owner: string, repo: string, ref?: string): Promise<Array<{ name: string; path: string; type: string }>>;
  createBranch(owner: string, repo: string, branch: string, from: string): Promise<unknown>;
  readFile(owner: string, repo: string, path: string, ref?: string): Promise<{ sha?: string; content?: string } | null>;
  writeFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    opts?: { sha?: string; branch?: string },
  ): Promise<{ sha?: string }>;
  createPullRequest(owner: string, repo: string, head: string, base: string, title: string, body: string): Promise<{ number?: number; html_url?: string; url?: string }>;
  listRuns(owner: string, repo: string, branch?: string): Promise<DriverWorkflowRun[]>;
  waitRun(owner: string, repo: string, runId: number, timeoutMs?: number, pollMs?: number): Promise<{ status: string; conclusion: string | null; verified?: boolean; html_url?: string }>;
  diagnostics(owner: string, repo: string, runId: number): Promise<{ failedJobs?: Array<{ name: string; log: string }> }>;
};

export type DriverModel = {
  /** Single non-streaming chat; returns raw model text. */
  chat(prompt: string): Promise<string>;
};

/* ------------------------------------------------------------------ */
/* File generation / repair (model output = JSON only)                 */
/* ------------------------------------------------------------------ */

export type FileChange = { path: string; content: string; message?: string };

const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 200_000;

export function parseFileChanges(raw: string): FileChange[] {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) throw new Error("Model did not return a JSON file array.");
  const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
  if (!Array.isArray(parsed) || !parsed.length) throw new Error("Model returned an empty file array.");
  const files: FileChange[] = [];
  for (const item of parsed.slice(0, MAX_FILES)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const path = String(rec.path ?? "").trim();
    const content = typeof rec.content === "string" ? rec.content : "";
    if (!path || !content) continue;
    if (path.startsWith("/") || path.includes("..")) continue;
    files.push({ path, content, message: rec.message ? String(rec.message) : undefined });
  }
  const total = files.reduce((n, f) => n + f.content.length, 0);
  if (!files.length) throw new Error("No usable file changes in model output.");
  if (total > MAX_TOTAL_BYTES) throw new Error(`Model file payload too large (${total} bytes).`);
  return files;
}

function buildFilePrompt(opts: {
  prompt: string;
  owner: string;
  repo: string;
  branch: string;
  context: string;
  diagnosis?: string;
  logExcerpt?: string;
  isRepair: boolean;
}): string {
  const repair = opts.isRepair
    ? `\n\nCI FAILED. Diagnosis: ${opts.diagnosis ?? "unknown"}\n\nCI log excerpt:\n${(opts.logExcerpt ?? "").slice(0, 12000)}\n\nRead the failing parts, fix the ROOT CAUSE, and return the full updated content of every file that must change.`
    : "";
  return `You are Bossnu's file generator inside a deterministic GitHub loop.
Repository: ${opts.owner}/${opts.repo} — work branch: ${opts.branch}
The loop already created the branch. You ONLY produce file contents; the loop commits, opens the PR, watches CI and repairs.

User request:
${opts.prompt.slice(0, 6000)}
${repair}

Current repository context (top-level listing + relevant files):
${opts.context.slice(0, 24000)}

Respond with ONLY a JSON array — no markdown, no fences, no commentary:
[{"path":"relative/path.ext","content":"<FULL file content>","message":"short commit note"}]
Rules:
- Full file contents only (never diffs or partial files).
- Existing files you change: reproduce the complete file with your changes applied.
- Maximum ${MAX_FILES} files. No secrets or credentials. Code comments in English.`;
}

async function collectRepoContext(
  gh: DriverGitHub,
  owner: string,
  repo: string,
  branch: string,
  hint: string,
): Promise<string> {
  const parts: string[] = [];
  try {
    const entries = await gh.listDir(owner, repo, branch);
    parts.push(`Top-level entries: ${entries.slice(0, 60).map((e) => `${e.type === "dir" ? "[dir]" : ""}${e.path}`).join(", ") || "(empty)"}`);
  } catch {
    parts.push("(could not list repo root)");
  }
  // Read a few files the prompt most likely touches (or standard entry points).
  const wanted = new Set<string>();
  for (const m of hint.matchAll(/[\w./-]+\.(?:ts|tsx|js|jsx|py|html|css|json|md|yml|yaml|sh|toml|vue)/g)) {
    if (!m[0].includes("..")) wanted.add(m[0]);
  }
  for (const def of ["README.md", "package.json", "src/index.ts", "src/main.tsx", "src/App.tsx", "index.html"]) wanted.add(def);
  let read = 0;
  for (const path of Array.from(wanted).slice(0, 5)) {
    if (read >= 4) break;
    try {
      const file = await gh.readFile(owner, repo, path, branch);
      if (file?.content != null) {
        parts.push(`--- ${path} ---\n${file.content.slice(0, 8000)}`);
        read += 1;
      }
    } catch {
      /* not present — skip */
    }
  }
  return parts.join("\n\n");
}

/* ------------------------------------------------------------------ */
/* Driver                                                              */
/* ------------------------------------------------------------------ */

export type GitHubLoopDriverInput = {
  prompt: string;
  owner: string;
  repo: string;
  baseBranch?: string;
  files?: FileChange[];
  prTitle?: string;
  prBody?: string;
  github: DriverGitHub;
  model?: DriverModel;
  ciTimeoutMs?: number;
  onStep?: (phase: string, detail: string) => void;
};

export type GitHubLoopDriverResult = {
  ok: boolean;
  verified: boolean;
  text: string;
  state: GitHubLoopState;
};

function step(input: GitHubLoopDriverInput, phase: string, detail: string): void {
  input.onStep?.(phase, detail);
}

function driverText(state: GitHubLoopState, extra = ""): string {
  const lines = [
    "📦 GitHub Loop — เดินแบบ state machine (ไม่เดา phase)",
    `repo=${state.repo} base=${state.baseBranch} work=${state.workBranch}`,
    state.prUrl ? `PR: ${state.prUrl}` : "PR: ยังไม่สร้าง",
    `CI: ${state.ciStatus ?? "unknown"}${state.repairAttempts ? ` (repair ${state.repairAttempts}/${state.maxRepairAttempts})` : ""}`,
    state.diagnosis ? `diagnosis: ${state.diagnosis}` : "",
    extra,
  ].filter(Boolean);
  return lines.join("\n");
}

export async function runGitHubLoopDriver(input: GitHubLoopDriverInput): Promise<GitHubLoopDriverResult> {
  const gh = input.github;
  const model = input.model;
  const owner = input.owner;
  const repo = input.repo;

  step(input, "plan", `อ่าน repo ${owner}/${repo}...`);
  const meta = await gh.status(owner, repo);
  const baseBranch = input.baseBranch ?? meta.default_branch ?? "main";
  let state: GitHubLoopState = createGitHubLoop(`${owner}/${repo}`, baseBranch);

  /* branch */
  step(input, "branch", `สร้าง branch ${state.workBranch} จาก ${baseBranch}`);
  try {
    await gh.createBranch(owner, repo, state.workBranch, baseBranch);
  } catch (e) {
    if (!/already exists/i.test(String(e instanceof Error ? e.message : e))) throw e;
    step(input, "branch", "branch มีอยู่แล้ว — ใช้งานต่อ");
  }
  state = advancePhase(state, "edit");

  /* edit: provided files, or model-generated → real commits on the work branch */
  let files = input.files?.length ? input.files : [];
  if (!files.length) {
    if (!model) {
      state = { ...state, phase: "failed", errors: [...state.errors, "no files provided and no model available to generate them"] };
      return { ok: false, verified: false, text: driverText(state, "❌ ไม่มีไฟล์ให้แก้และไม่มี model สร้างไฟล์"), state };
    }
    step(input, "edit", "ให้โมเดลวิเคราะห์ repo + คำสั่ง แล้วสร้างไฟล์ (JSON เท่านั้น)...");
    const context = await collectRepoContext(gh, owner, repo, state.workBranch, input.prompt);
    const raw = await model.chat(buildFilePrompt({ prompt: input.prompt, owner, repo, branch: state.workBranch, context, isRepair: false }));
    files = parseFileChanges(raw);
  }

  for (const file of files) {
    step(input, "edit", `เขียน ${file.path} (${file.content.length} bytes)`);
    const existing = await gh.readFile(owner, repo, file.path, state.workBranch).catch(() => null);
    const res = await gh.writeFile(owner, repo, file.path, file.content, file.message ?? `Boss: ${file.path}`, {
      sha: existing?.sha,
      branch: state.workBranch,
    });
    if (res?.sha) state = { ...state, lastCommitSha: res.sha };
  }
  state = advancePhase(state, "commit");
  state = advancePhase(state, "pr");

  /* pr */
  step(input, "pr", "สร้าง Pull Request...");
  const prTitle = input.prTitle ?? `Boss: ${state.workBranch}`;
  const prBody = input.prBody ?? `Automated by Bossnu GitHub loop.\n\n${githubLoopSummary(state)}`;
  const pr = await gh.createPullRequest(owner, repo, state.workBranch, baseBranch, prTitle, prBody);
  state = {
    ...state,
    prNumber: typeof pr.number === "number" ? pr.number : state.prNumber,
    prUrl: typeof pr.html_url === "string" ? pr.html_url : typeof pr.url === "string" ? pr.url : state.prUrl,
  };
  state = advancePhase(state, "ci_wait");

  /* ci_wait → diagnose → repair → (new commit) → ci_wait ... */
  const maxCiRounds = 4;
  for (let round = 0; round < maxCiRounds && !["done", "failed"].includes(state.phase); round += 1) {
    if (state.phase !== "ci_wait") state = { ...state, phase: "ci_wait" };
    step(input, "ci_wait", round === 0 ? "ตรวจ workflow runs บน branch..." : `ตรวจ CI รอบใหม่ (หลังซ่อมรอบ ${state.repairAttempts})...`);
    const runs = await gh.listRuns(owner, repo, state.workBranch).catch(() => [] as DriverWorkflowRun[]);
    const matching =
      runs.find((r) => r.head_branch === state.workBranch && (!state.lastCommitSha || r.head_sha === state.lastCommitSha)) ??
      runs.find((r) => r.head_branch === state.workBranch) ??
      runs[0];

    if (!matching) {
      state = { ...state, ciStatus: "unknown", phase: "verify" };
      step(input, "ci_wait", "repo ยังไม่มี CI workflow run — ข้าม CI (PR มีแล้ว)");
      break;
    }
    step(input, "ci_wait", `รอ workflow รัน #${matching.id} (${matching.status})...`);
    const waited = await gh.waitRun(owner, repo, matching.id, input.ciTimeoutMs, 5000);
    if (waited.conclusion === "success" || waited.verified === true) {
      state = onCiResult(state, true, JSON.stringify(waited).slice(0, 2000));
      break;
    }
    state = onCiResult(state, false, "");
    if (state.phase === "failed") break;

    /* diagnose */
    step(input, "diagnose", `ดึง log job ที่พังจากรัน #${matching.id}...`);
    const diag = await gh.diagnostics(owner, repo, matching.id).catch(() => ({ failedJobs: [] }));
    const logExcerpt = (diag.failedJobs ?? []).map((j) => `[job ${j.name}]\n${j.log}`).join("\n\n");
    const parsedDiag = diagnoseCiLog(logExcerpt || JSON.stringify(diag).slice(0, 4000));
    const diagnosisText =
      [parsedDiag.file && `file=${parsedDiag.file}`, parsedDiag.command && `cmd=${parsedDiag.command}`, parsedDiag.error]
        .filter(Boolean)
        .join(" | ") || "CI failed without log";
    state = { ...state, diagnosis: diagnosisText };
    step(input, "diagnose", `diagnosis: ${diagnosisText.slice(0, 300)}`);

    /* repair */
    if (!model || !state.diagnosis) break;
    step(input, "repair", `ซ่อมรอบ ${state.repairAttempts}: ให้โมเดลแก้ตาม diagnosis...`);
    const context = await collectRepoContext(gh, owner, repo, state.workBranch, input.prompt);
    const rawRepair = await model.chat(
      buildFilePrompt({ prompt: input.prompt, owner, repo, branch: state.workBranch, context, diagnosis: state.diagnosis, logExcerpt, isRepair: true }),
    );
    const repairFiles = parseFileChanges(rawRepair);
    for (const file of repairFiles) {
      step(input, "repair", `เขียน ${file.path} (ซ่อม)`);
      const existing = await gh.readFile(owner, repo, file.path, state.workBranch).catch(() => null);
      const res = await gh.writeFile(owner, repo, file.path, file.content, file.message ?? `Boss: fix ${file.path}`, {
        sha: existing?.sha,
        branch: state.workBranch,
      });
      if (res?.sha) state = { ...state, lastCommitSha: res.sha };
    }
    state = { ...state, phase: "commit" };
    // PR exists — the new commit re-triggers CI; go straight back to ci_wait.
    state = advancePhase(state, "ci_wait");
  }

  if (state.phase === "failed") {
    return {
      ok: false,
      verified: false,
      text: driverText(state, `❌ CI พังหลังซ่อม ${state.repairAttempts} รอบแล้ว\n${(state.errors.slice(-3) || []).join("\n")}`),
      state,
    };
  }

  state = advancePhase(state, "verify");
  const ciOk = state.ciStatus === "success";
  const ciUnknown = state.ciStatus === "unknown" || state.ciStatus === undefined;
  state = { ...state, phase: "done" };
  if (ciOk) {
    return { ok: true, verified: true, text: driverText(state, "✓ CI ผ่าน — loop เสร็จแบบ verified"), state };
  }
  if (ciUnknown) {
    return {
      ok: true,
      verified: false,
      text: driverText(state, "⚠️ PR สร้างแล้วและ commit บน work branch เป็นผลจริง — แต่ repo ยังไม่มี CI workflow ให้ตรวจ (เพิ่ม workflow แล้วรันใหม่เพื่อ verify เต็ม)"),
      state,
    };
  }
  return {
    ok: false,
    verified: false,
    text: driverText(state, `❌ CI ยังไม่ผ่านหลังซ่อม ${state.repairAttempts} รอบ — ดู diagnosis ด้านล่าง`),
    state,
  };
}
