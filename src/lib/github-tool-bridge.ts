import { createServerFn } from "@tanstack/react-start";

/**
 * Server bridge for authenticated GitHub tools.
 * No pre-bound repo — owner/repo always from args.
 * Accepts optional githubToken for any tool.
 */
export const executeAuthenticatedGitHubTool = createServerFn({ method: "POST" })
  .validator((value: { toolName: string; args: Record<string, unknown>; githubToken?: string }) => value)
  .handler(async ({ data }) => {
    const { toolName, args, githubToken } = data;
    // Prefer PAT-compatible client implementation on server via dynamic import of expanded surface
    const { executeGithubWithPat } = await import("@/lib/github-pat");
    // On server sessionStorage is unavailable — pass token explicitly
    if (githubToken) {
      try {
        return await executeGithubWithPat(toolName, args, githubToken);
      } catch {
        /* fall through to App */
      }
    }
    const {
      githubActions,
      githubCreateBranch,
      githubCreateIssue,
      githubCreatePullRequest,
      githubDispatchWorkflow,
      githubStatus,
      githubWaitForWorkflow,
      githubWriteFile,
    } = await import("@/lib/github-app.server");
    const owner = String(args.owner ?? "").trim();
    const repo = String(args.repo ?? "").trim();
    // Tools that don't need repo
    if (["github_me", "github_get_user", "github_list_repos", "github_search_code", "github_search_repos", "github_search_issues", "github_search_commits", "github_search_prs", "github_request"].includes(toolName)) {
      if (githubToken) return executeGithubWithPat(toolName, args, githubToken);
      throw new Error("This GitHub tool requires a user token (no App fallback for global endpoints).");
    }
    if (!owner || !repo) throw new Error("GitHub requires owner and repo in args (no pre-bound repo)."
    );
    switch (toolName) {
      case "github_write_file":
        return githubWriteFile({
          owner, repo,
          path: String(args.path ?? ""),
          content: String(args.content ?? ""),
          message: String(args.message ?? "Bossnu update"),
          sha: args.sha ? String(args.sha) : undefined,
          branch: args.branch ? String(args.branch) : undefined,
          githubToken,
        });
      case "github_create_branch":
        return githubCreateBranch({
          owner, repo,
          branch: String(args.branch ?? ""),
          from: args.from ? String(args.from) : undefined,
          githubToken,
        });
      case "github_create_pull_request":
        return githubCreatePullRequest({
          owner, repo,
          head: String(args.head ?? ""),
          base: args.base ? String(args.base) : undefined,
          title: String(args.title ?? ""),
          body: args.body ? String(args.body) : undefined,
          githubToken,
        });
      case "github_create_issue":
        return githubCreateIssue({
          owner, repo,
          title: String(args.title ?? ""),
          body: args.body ? String(args.body) : undefined,
          githubToken,
        });
      case "github_actions":
      case "github_list_workflow_runs":
        return githubActions({
          owner, repo,
          branch: args.branch ? String(args.branch) : undefined,
          githubToken,
        });
      case "github_dispatch_workflow":
        return githubDispatchWorkflow({
          owner, repo,
          workflow: String(args.workflow ?? ""),
          branch: args.branch ? String(args.branch) : undefined,
          inputs: args.inputs && typeof args.inputs === "object" ? (args.inputs as Record<string, string>) : undefined,
          githubToken,
        });
      case "github_wait_for_workflow":
        return githubWaitForWorkflow({
          owner, repo,
          runId: Number(args.runId),
          timeoutMs: args.timeoutMs ? Number(args.timeoutMs) : undefined,
          pollMs: args.pollMs ? Number(args.pollMs) : undefined,
          githubToken,
        });
      case "github_get_repo":
        return githubStatus(owner, repo, githubToken);
      default:
        // Full surface via PAT when App doesn't implement the tool
        if (githubToken) return executeGithubWithPat(toolName, args, githubToken);
        throw new Error(`Unknown authenticated GitHub tool: ${toolName}. Pass githubToken for full surface.`);
    }
  });
