/**
 * GitHub Actions CI/CD tool surface for Boss agent.
 */
export const GITHUB_ACTIONS_CI_TOOLS = [
  { name: "github_actions", description: "List recent workflow runs", status: "implemented" as const },
  { name: "github_dispatch_workflow", description: "Trigger workflow_dispatch", status: "implemented" as const },
  { name: "github_wait_for_workflow", description: "Poll run until complete", status: "implemented" as const },
  { name: "github_workflow_diagnostics", description: "Failed job log tail", status: "implemented" as const },
] as const;

export const REPO_WORKFLOWS = [
  { file: "ci.yml", name: "CI", purpose: "typecheck + test + lint + build" },
  { file: "cd-render-ping.yml", name: "CD · Render health ping", purpose: "post-CI production ping" },
  { file: "boss-mvp.yml", name: "Boss MVP Verification", purpose: "full quality gate" },
  { file: "boss-commit-bridge.yml", name: "Boss Commit Bridge", purpose: "repository_dispatch commits" },
] as const;

export function ciToolsPromptBlock(): string {
  return [
    "=== GITHUB ACTIONS CI/CD TOOLS ===",
    ...GITHUB_ACTIONS_CI_TOOLS.map((t) => `- ${t.name}: ${t.description}`),
    "Workflows: " + REPO_WORKFLOWS.map((w) => w.file).join(", "),
    "Prefer: github_actions → diagnostics if failed → fix → re-check",
    "Manual CI: github_dispatch_workflow workflow=ci.yml",
  ].join("\n");
}
