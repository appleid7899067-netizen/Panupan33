/**
 * GitHub tools via user PAT — no pre-bound repo required.
 * Owner/repo come from tool args. Any tool runs when token is present.
 */
const API = "https://api.github.com";
const KEY = "bosses.github.pat";

export function getGithubPat() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setGithubPat(value: string | null) {
  try {
    if (value) sessionStorage.setItem(KEY, value.trim());
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasGithubAccess(): boolean {
  return Boolean(getGithubPat());
}

async function github(path: string, init: RequestInit = {}, tokenOverride?: string) {
  const token = tokenOverride || getGithubPat();
  if (!token) throw new Error("GitHub tools need a token. Put PAT on Plugins page or pass githubToken.");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${text.slice(0, 400)}`);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function repoPath(owner: string, repo: string) {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

function needRepo(args: Record<string, unknown>) {
  const owner = String(args.owner ?? "").trim();
  const repo = String(args.repo ?? "").trim();
  if (!owner || !repo) throw new Error("GitHub requires owner and repo in args (no pre-bound repo needed).");
  return { owner, repo, base: repoPath(owner, repo) };
}

function encodePath(path: string) {
  return path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
}

/** Full GitHub tool surface — works on any owner/repo the token can access. */
export async function executeGithubWithPat(toolName: string, args: Record<string, unknown>, tokenOverride?: string) {
  const g = (path: string, init?: RequestInit) => github(path, init ?? {}, tokenOverride);

  // Account / global (no repo)
  if (toolName === "github_me" || toolName === "github_get_user") {
    const login = String(args.username ?? args.login ?? "").trim();
    return login ? g(`/users/${encodeURIComponent(login)}`) : g("/user");
  }
  if (toolName === "github_list_repos") {
    const user = String(args.username ?? "").trim();
    const per = Math.min(100, Math.max(1, Number(args.per_page ?? 30)));
    if (user) return g(`/users/${encodeURIComponent(user)}/repos?per_page=${per}&sort=updated`);
    return g(`/user/repos?per_page=${per}&sort=updated`);
  }
  if (toolName === "github_search_code" || toolName === "github_search_repos" || toolName === "github_search_issues" || toolName === "github_search_commits" || toolName === "github_search_prs") {
    const q = String(args.query ?? args.q ?? "").trim();
    if (!q) throw new Error("search requires query");
    const kind =
      toolName === "github_search_code" ? "code"
      : toolName === "github_search_repos" ? "repositories"
      : toolName === "github_search_commits" ? "commits"
      : "issues";
    const per = Math.min(30, Math.max(1, Number(args.per_page ?? 10)));
    return g(`/search/${kind}?q=${encodeURIComponent(q)}&per_page=${per}`);
  }
  if (toolName === "github_request") {
    // Escape hatch: any GitHub API path the user allows
    const method = String(args.method ?? "GET").toUpperCase();
    const path = String(args.path ?? "").trim();
    if (!path.startsWith("/")) throw new Error("github_request path must start with /");
    const body = args.body != null ? JSON.stringify(args.body) : undefined;
    return g(path, { method, body });
  }

  const { base } = needRepo(args);

  switch (toolName) {
    case "github_get_repo":
      return g(base);
    case "github_get_file": {
      const path = encodePath(String(args.path ?? ""));
      const ref = args.ref ? `?ref=${encodeURIComponent(String(args.ref))}` : "";
      return g(`${base}/contents/${path}${ref}`);
    }
    case "github_list_dir": {
      const path = encodePath(String(args.path ?? ""));
      const ref = args.ref ? `?ref=${encodeURIComponent(String(args.ref))}` : "";
      return g(`${base}/contents/${path}${ref}`);
    }
    case "github_list_commits": {
      const per = Math.min(30, Math.max(1, Number(args.per_page ?? 10)));
      const branch = args.branch ? `&sha=${encodeURIComponent(String(args.branch))}` : "";
      return g(`${base}/commits?per_page=${per}${branch}`);
    }
    case "github_list_branches":
      return g(`${base}/branches?per_page=50`);
    case "github_list_pulls":
      return g(`${base}/pulls?state=${encodeURIComponent(String(args.state ?? "open"))}&per_page=20`);
    case "github_list_issues":
      return g(`${base}/issues?state=${encodeURIComponent(String(args.state ?? "open"))}&per_page=20`);
    case "github_get_pull":
      return g(`${base}/pulls/${Number(args.number ?? args.pull_number)}`);
    case "github_get_issue":
      return g(`${base}/issues/${Number(args.number ?? args.issue_number)}`);
    case "github_merge_pull":
      return g(`${base}/pulls/${Number(args.number ?? args.pull_number)}/merge`, {
        method: "PUT",
        body: JSON.stringify({
          commit_title: args.commit_title ? String(args.commit_title) : undefined,
          merge_method: String(args.merge_method ?? "squash"),
        }),
      });
    case "github_write_file": {
      const path = encodePath(String(args.path ?? ""));
      const content = btoa(unescape(encodeURIComponent(String(args.content ?? ""))));
      let sha = args.sha ? String(args.sha) : "";
      // Resolve and verify inside this single tool call so the agent does not
      // waste rounds on get_file -> write_file -> verify_file.
      if (!sha) {
        const current = await g(base + "/contents/" + path + (args.branch ? "?ref=" + encodeURIComponent(String(args.branch)) : "")) as { sha?: string };
        sha = String(current.sha ?? "");
      }
      const written = await g(base + "/contents/" + path, {
        method: "PUT",
        body: JSON.stringify({
          message: String(args.message ?? "Bossnu update"),
          content,
          ...(sha ? { sha } : {}),
          ...(args.branch ? { branch: String(args.branch) } : {}),
        }),
      }) as { content?: { path?: string; sha?: string }; commit?: { sha?: string; html_url?: string } };
      const verified = await g(base + "/contents/" + path + (args.branch ? "?ref=" + encodeURIComponent(String(args.branch)) : "")) as { sha?: string; content?: { sha?: string } };
      return {
        ...written,
        verified: Boolean(
          (written.content?.sha && verified.sha && written.content.sha === verified.sha) ||
          (written.content?.sha && verified.content?.sha && written.content.sha === verified.content.sha),
        ),
      };
    }
    case "github_delete_file": {
      const path = encodePath(String(args.path ?? ""));
      return g(`${base}/contents/${path}`, {
        method: "DELETE",
        body: JSON.stringify({
          message: String(args.message ?? "Bossnu delete"),
          sha: String(args.sha ?? ""),
          ...(args.branch ? { branch: String(args.branch) } : {}),
        }),
      });
    }
    case "github_create_branch": {
      const branch = String(args.branch ?? "");
      const from = String(args.from ?? "main");
      const ref = (await g(`${base}/git/ref/heads/${encodeURIComponent(from)}`)) as { object: { sha: string } };
      return g(`${base}/git/refs`, {
        method: "POST",
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: ref.object.sha }),
      });
    }
    case "github_create_pull_request":
      return g(`${base}/pulls`, {
        method: "POST",
        body: JSON.stringify({
          title: String(args.title ?? ""),
          head: String(args.head ?? ""),
          base: String(args.base ?? "main"),
          body: args.body ? String(args.body) : "Created by Bossnu",
        }),
      });
    case "github_create_issue":
      return g(`${base}/issues`, {
        method: "POST",
        body: JSON.stringify({ title: String(args.title ?? ""), body: args.body ? String(args.body) : "" }),
      });
    case "github_comment_issue":
      return g(`${base}/issues/${Number(args.number ?? args.issue_number)}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: String(args.body ?? "") }),
      });
    case "github_comment_pull":
      return g(`${base}/issues/${Number(args.number ?? args.pull_number)}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: String(args.body ?? "") }),
      });
    case "github_actions":
    case "github_list_workflow_runs":
      return g(
        `${base}/actions/runs?per_page=10${args.branch ? `&branch=${encodeURIComponent(String(args.branch))}` : ""}`,
      );
    case "github_dispatch_workflow":
      await g(`${base}/actions/workflows/${encodeURIComponent(String(args.workflow))}/dispatches`, {
        method: "POST",
        body: JSON.stringify({
          ref: String(args.branch ?? "main"),
          inputs: args.inputs && typeof args.inputs === "object" ? args.inputs : {},
        }),
      });
      return { dispatched: true, workflow: args.workflow, branch: args.branch ?? "main" };
    case "github_wait_for_workflow": {
      const runId = Number(args.runId);
      const timeoutMs = Math.min(Math.max(Number(args.timeoutMs ?? 90_000), 5_000), 180_000);
      const pollMs = Math.min(Math.max(Number(args.pollMs ?? 3_000), 1_000), 10_000);
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const run = (await g(`${base}/actions/runs/${runId}`)) as {
          status: string;
          conclusion: string | null;
          html_url?: string;
          head_sha?: string;
        };
        if (run.status === "completed") return { ...run, verified: run.conclusion === "success" };
        await new Promise((r) => setTimeout(r, pollMs));
      }
      return { runId, status: "timeout", conclusion: null, verified: false };
    }
    case "github_create_release":
      return g(`${base}/releases`, {
        method: "POST",
        body: JSON.stringify({
          tag_name: String(args.tag ?? args.tag_name ?? ""),
          name: String(args.name ?? args.tag ?? ""),
          body: args.body ? String(args.body) : "",
          draft: Boolean(args.draft),
          prerelease: Boolean(args.prerelease),
        }),
      });
    case "github_star":
      await g(`${base}/starred`, { method: "PUT" });
      return { starred: true };
    case "github_fork":
      return g(`${base}/forks`, { method: "POST" });
    default:
      throw new Error(`Unsupported GitHub tool: ${toolName}`);
  }
}

/** All authenticated GitHub tool names (for routing). */
export const ALL_GITHUB_AUTH_TOOLS = [
  "github_me",
  "github_get_user",
  "github_list_repos",
  "github_request",
  "github_get_repo",
  "github_get_file",
  "github_list_dir",
  "github_list_commits",
  "github_list_branches",
  "github_list_pulls",
  "github_list_issues",
  "github_get_pull",
  "github_get_issue",
  "github_merge_pull",
  "github_write_file",
  "github_delete_file",
  "github_create_branch",
  "github_create_pull_request",
  "github_create_issue",
  "github_comment_issue",
  "github_comment_pull",
  "github_actions",
  "github_list_workflow_runs",
  "github_dispatch_workflow",
  "github_wait_for_workflow",
  "github_create_release",
  "github_star",
  "github_fork",
  "github_search_code",
  "github_search_repos",
  "github_search_issues",
  "github_search_commits",
  "github_search_prs",
] as const;
