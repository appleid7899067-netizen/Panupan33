/**
 * GitHub Actions CI/CD tool surface for Boss agent.
 * Implementations live in github-agent-tools.server.ts — this module is the registry contract.
 */

export const GITHUB_ACTIONS_CI_TOOLS = [
  {
    name: "github_actions",
    description: "List recent GitHub Actions workflow runs for a repo/branch",
    status: "implemented" as const,
  },
  {
    name: "github_dispatch_workflow",
    description: "Trigger workflow_dispatch (e.g. ci.yml) on a branch",
    status: "implemented" as const,
  },
  {
    name: "github_wait_for_workflow",
    description: "Poll a run until completed; return conclusion",
    status: "implemented" as const,
  },
  {
    name: "github_workflow_diagnostics",
    description: "Failed job log tail for a workflow run",
    status: "implemented" as const,
  },
] as const;

/** Workflows shipped with the repo */
export const REPO_WORKFLOWS = [
  { file: "ci.yml", name: "CI", purpose: "typecheck + test + lint + build" },
  { file: "cd-render-ping.yml", name: "CD · Render health ping", purpose: "post-CI production ping" },
  { file: "boss-mvp.yml", name: "Boss MVP Verification", purpose: "full quality gate" },
  { file: "boss-commit-bridge.yml", name: "Boss Commit Bridge", purpose: "repository_dispatch commits" },
] as const;

export function ciToolsPromptBlock(): string {
  return [
    "=== GITHUB ACTIONS CI/CD TOOLS ===",
    "Use these after code changes to verify:",
    ...GITHUB_ACTIONS_CI_TOOLS.map((t) => `- ${t.name}: ${t.description}`),
    "Workflows: " + REPO_WORKFLOWS.map((w) => w.file).join(", "),
    "Prefer: github_actions → (if failed) github_workflow_diagnostics → fix → re-check",
    "To start CI manually: github_dispatch_workflow with workflow=ci.yml",
  ].join("\n");
}
