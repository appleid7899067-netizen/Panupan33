/**
 * Full GitHub tool surface — always available when user provides token/permission.
 * No pre-bound repo; owner/repo from args (or global tools with no repo).
 */

export const AUTH_GITHUB_FULL: string[] = [
  "github_request",
  "github_get_repo", "github_get_file", "github_list_dir", "github_list_commits",
  "github_list_branches", "github_list_pulls", "github_list_issues",
  "github_get_pull", "github_get_issue", "github_merge_pull",
  "github_write_file", "github_delete_file", "github_create_branch",
  "github_create_pull_request", "github_create_issue", "github_comment_issue",
  "github_comment_pull", "github_actions", "github_list_workflow_runs",
  "github_dispatch_workflow", "github_wait_for_workflow", "github_create_release",
  "github_star", "github_fork",
  "github_search_code", "github_search_repos", "github_search_issues",
  "github_search_commits", "github_search_prs",
];

export function isGithubAuthTool(name: string): boolean {
  return AUTH_GITHUB_FULL.includes(name) || name.startsWith("github_");
}

export function nativeFullGitHubTools(): Array<Record<string, unknown>> {
  const str = { type: "string" };
  const repo = { owner: str, repo: str };
  const mark = { githubSource: true as const };
  return [
    { name: "github_request", description: "Any GitHub API path (user-allowed). path must start with /.", inputSchema: { type: "object", properties: { method: str, path: str, body: { type: "object" } }, required: ["path"], additionalProperties: false }, ...mark },
    { name: "github_get_repo", description: "Repo metadata for any owner/repo.", inputSchema: { type: "object", properties: repo, required: ["owner", "repo"], additionalProperties: false }, ...mark },
    { name: "github_get_file", description: "Read file from any accessible repo.", inputSchema: { type: "object", properties: { ...repo, path: str, ref: str }, required: ["owner", "repo", "path"], additionalProperties: false }, ...mark },
    { name: "github_list_dir", description: "List directory.", inputSchema: { type: "object", properties: { ...repo, path: str, ref: str }, required: ["owner", "repo"], additionalProperties: false }, ...mark },
    { name: "github_list_commits", description: "List commits.", inputSchema: { type: "object", properties: { ...repo, per_page: { type: "integer" }, branch: str }, required: ["owner", "repo"], additionalProperties: false }, ...mark },
    { name: "github_list_branches", description: "List branches.", inputSchema: { type: "object", properties: repo, required: ["owner", "repo"], additionalProperties: false }, ...mark },
    { name: "github_list_pulls", description: "List PRs.", inputSchema: { type: "object", properties: { ...repo, state: str }, required: ["owner", "repo"], additionalProperties: false }, ...mark },
    { name: "github_list_issues", description: "List issues.", inputSchema: { type: "object", properties: { ...repo, state: str }, required: ["owner", "repo"], additionalProperties: false }, ...mark },
    { name: "github_get_pull", description: "Get PR.", inputSchema: { type: "object", properties: { ...repo, number: { type: "integer" } }, required: ["owner", "repo", "number"], additionalProperties: false }, ...mark },
    { name: "github_get_issue", description: "Get issue.", inputSchema: { type: "object", properties: { ...repo, number: { type: "integer" } }, required: ["owner", "repo", "number"], additionalProperties: false }, ...mark },
    { name: "github_merge_pull", description: "Merge PR.", inputSchema: { type: "object", properties: { ...repo, number: { type: "integer" }, merge_method: str }, required: ["owner", "repo", "number"], additionalProperties: false }, ...mark },
    { name: "github_write_file", description: "Write/update file (commit) on any writable owner/repo.", inputSchema: { type: "object", properties: { ...repo, path: str, content: str, message: str, sha: str, branch: str }, required: ["owner", "repo", "path", "content", "message"], additionalProperties: false }, ...mark },
    { name: "github_delete_file", description: "Delete file.", inputSchema: { type: "object", properties: { ...repo, path: str, sha: str, message: str, branch: str }, required: ["owner", "repo", "path", "sha", "message"], additionalProperties: false }, ...mark },
    { name: "github_create_branch", description: "Create branch.", inputSchema: { type: "object", properties: { ...repo, branch: str, from: str }, required: ["owner", "repo", "branch"], additionalProperties: false }, ...mark },
    { name: "github_create_pull_request", description: "Open PR.", inputSchema: { type: "object", properties: { ...repo, head: str, base: str, title: str, body: str }, required: ["owner", "repo", "head", "title"], additionalProperties: false }, ...mark },
    { name: "github_create_issue", description: "Create issue.", inputSchema: { type: "object", properties: { ...repo, title: str, body: str }, required: ["owner", "repo", "title"], additionalProperties: false }, ...mark },
    { name: "github_comment_issue", description: "Comment on issue.", inputSchema: { type: "object", properties: { ...repo, number: { type: "integer" }, body: str }, required: ["owner", "repo", "number", "body"], additionalProperties: false }, ...mark },
    { name: "github_comment_pull", description: "Comment on PR.", inputSchema: { type: "object", properties: { ...repo, number: { type: "integer" }, body: str }, required: ["owner", "repo", "number", "body"], additionalProperties: false }, ...mark },
    { name: "github_actions", description: "List Actions runs.", inputSchema: { type: "object", properties: { ...repo, branch: str }, required: ["owner", "repo"], additionalProperties: false }, ...mark },
    { name: "github_list_workflow_runs", description: "List workflow runs.", inputSchema: { type: "object", properties: { ...repo, branch: str }, required: ["owner", "repo"], additionalProperties: false }, ...mark },
    { name: "github_dispatch_workflow", description: "Dispatch workflow.", inputSchema: { type: "object", properties: { ...repo, workflow: str, branch: str }, required: ["owner", "repo", "workflow"], additionalProperties: false }, ...mark },
    { name: "github_wait_for_workflow", description: "Wait for workflow run.", inputSchema: { type: "object", properties: { ...repo, runId: { type: "integer" }, timeoutMs: { type: "integer" }, pollMs: { type: "integer" } }, required: ["owner", "repo", "runId"], additionalProperties: false }, ...mark },
    { name: "github_create_release", description: "Create release.", inputSchema: { type: "object", properties: { ...repo, tag: str, name: str, body: str }, required: ["owner", "repo", "tag"], additionalProperties: false }, ...mark },
    { name: "github_star", description: "Star repo.", inputSchema: { type: "object", properties: repo, required: ["owner", "repo"], additionalProperties: false }, ...mark },
    { name: "github_fork", description: "Fork repo.", inputSchema: { type: "object", properties: repo, required: ["owner", "repo"], additionalProperties: false }, ...mark },
  ];
}
