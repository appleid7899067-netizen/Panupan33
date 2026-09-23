/**
 * Phase 3 hardening — map GitHubLoopPhase → next tool + apply results
 */

import {
  advancePhase,
  createGitHubLoop,
  githubLoopSummary,
  onCiResult,
  type GitHubLoopState,
} from "./github-loop";

export type GitHubToolSuggestion = {
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
};

export function suggestNextGitHubTool(
  state: GitHubLoopState,
  opts: {
    owner: string;
    repo: string;
    files?: Array<{ path: string; content: string; message?: string }>;
    prTitle?: string;
    prBody?: string;
  },
): GitHubToolSuggestion | null {
  const { owner, repo } = opts;
  switch (state.phase) {
    case "branch":
      return {
        toolName: "github_create_branch",
        args: { owner, repo, branch: state.workBranch, from: state.baseBranch },
        reason: `Create work branch ${state.workBranch} from ${state.baseBranch}`,
      };
    case "edit": {
      const file = opts.files?.[0];
      if (!file) return null;
      return {
        toolName: "github_write_file",
        args: {
          owner,
          repo,
          path: file.path,
          content: file.content,
          message: file.message ?? `Boss: update ${file.path}`,
          branch: state.workBranch,
        },
        reason: `Write ${file.path} on ${state.workBranch}`,
      };
    }
    case "commit":
      return null;
    case "pr":
      return {
        toolName: "github_create_pull_request",
        args: {
          owner,
          repo,
          head: state.workBranch,
          base: state.baseBranch,
          title: opts.prTitle ?? `Boss: ${state.workBranch}`,
          body: opts.prBody ?? "Automated PR from Boss engine.",
        },
        reason: "Open PR for review / CI",
      };
    case "ci_wait":
    case "diagnose":
    case "repair":
    case "verify":
      return {
        toolName: "github_actions",
        args: { owner, repo, branch: state.workBranch },
        reason: "Inspect CI runs for work branch",
      };
    default:
      return null;
  }
}

export function applyGitHubToolResult(
  state: GitHubLoopState,
  toolName: string,
  ok: boolean,
  result: unknown,
): GitHubLoopState {
  if (!ok) {
    const err = String((result as { error?: string })?.error ?? result ?? "tool failed");
    return {
      ...state,
      errors: [...state.errors, `${toolName}: ${err}`].slice(-20),
      phase: state.phase === "ci_wait" ? "diagnose" : state.phase,
      updatedAt: Date.now(),
    };
  }

  if (toolName === "github_create_branch" && state.phase === "branch") {
    return advancePhase(state, "edit");
  }
  if (toolName === "github_write_file" && (state.phase === "edit" || state.phase === "commit")) {
    const rec = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
    return advancePhase(
      { ...state, lastCommitSha: typeof rec.sha === "string" ? rec.sha : state.lastCommitSha },
      "pr",
    );
  }
  if (toolName === "github_create_pull_request" && state.phase === "pr") {
    const rec = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
    return advancePhase(
      {
        ...state,
        prNumber: typeof rec.number === "number" ? rec.number : state.prNumber,
        prUrl:
          typeof rec.html_url === "string"
            ? rec.html_url
            : typeof rec.url === "string"
              ? rec.url
              : state.prUrl,
      },
      "ci_wait",
    );
  }
  if (toolName === "github_actions" || toolName === "github_wait_for_workflow") {
    const rec = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
    const conclusion = String(rec.conclusion ?? rec.status ?? "").toLowerCase();
    const success =
      conclusion === "success" ||
      rec.success === true ||
      (Array.isArray(rec.runs) &&
        (rec.runs as Array<Record<string, unknown>>).some(
          (r) => String(r.conclusion ?? "").toLowerCase() === "success",
        ));
    const failed =
      conclusion === "failure" ||
      (Array.isArray(rec.runs) &&
        (rec.runs as Array<Record<string, unknown>>).some(
          (r) => String(r.conclusion ?? "").toLowerCase() === "failure",
        ));
    if (success) return onCiResult(state, true, JSON.stringify(result).slice(0, 2000));
    if (failed) return onCiResult(state, false, JSON.stringify(result).slice(0, 2000));
  }
  return { ...state, updatedAt: Date.now() };
}

export function startGitHubLoopForRepo(owner: string, repo: string, baseBranch = "main"): GitHubLoopState {
  return createGitHubLoop(`${owner}/${repo}`, baseBranch);
}

export { githubLoopSummary };
