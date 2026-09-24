/**
 * GitHub credential routing.
 *
 * The Boss selects a GitHub operation, not a secret. This registry describes
 * allowed authentication routes without storing credentials in the agent.
 * Secret material must come from the host/provider that owns the credential.
 */

export type GitHubAuthMethod =
  | "github-app"
  | "actions-github-token"
  | "deploy-key"
  | "oauth"
  | "fine-grained-pat"
  | "machine-user"
  | "secret-manager"
  | "gh-host-session"
  | "gcm-oauth"
  | "ssh-agent"
  | "repository-dispatch";

export type GitHubOperation =
  | "read"
  | "write"
  | "branch"
  | "pull-request"
  | "workflow"
  | "deploy";

export type GitHubAuthRequest = {
  operation: GitHubOperation;
  repository: string;
  reason: string;
  preferred?: GitHubAuthMethod[];
  interactive?: boolean;
};

export type GitHubAuthPlan = {
  method: GitHubAuthMethod;
  repository: string;
  operation: GitHubOperation;
  shortLived: boolean;
  requiresUserInteraction: boolean;
  secretHandledOutsideAgent: boolean;
  rationale: string;
};

const METHOD_RULES: Record<GitHubAuthMethod, {
  operations: GitHubOperation[];
  shortLived: boolean;
  interactive: boolean;
  rationale: string;
}> = {
  "github-app": { operations: ["read", "write", "branch", "pull-request", "workflow", "deploy"], shortLived: true, interactive: false, rationale: "Scoped installation identity with short-lived installation access." },
  "actions-github-token": { operations: ["read", "write", "branch", "pull-request", "workflow"], shortLived: true, interactive: false, rationale: "Workflow-scoped GitHub token." },
  "deploy-key": { operations: ["read", "write"], shortLived: false, interactive: false, rationale: "Repository-scoped SSH key managed outside the agent." },
  oauth: { operations: ["read", "write", "branch", "pull-request", "workflow"], shortLived: false, interactive: true, rationale: "User-authorized GitHub identity." },
  "fine-grained-pat": { operations: ["read", "write", "branch", "pull-request", "workflow"], shortLived: false, interactive: true, rationale: "Explicitly scoped user credential; use only when another route is unavailable." },
  "machine-user": { operations: ["read", "write", "branch", "pull-request", "workflow"], shortLived: false, interactive: false, rationale: "Dedicated bot identity with repository-scoped membership." },
  "secret-manager": { operations: ["read", "write", "branch", "pull-request", "workflow"], shortLived: true, interactive: false, rationale: "Credential retrieved by the runtime from an external secret manager." },
  "gh-host-session": { operations: ["read", "write", "branch", "pull-request", "workflow"], shortLived: true, interactive: false, rationale: "Use an already authenticated host session without exposing its credential to the model." },
  "gcm-oauth": { operations: ["read", "write", "branch", "pull-request"], shortLived: false, interactive: true, rationale: "Git Credential Manager owns OAuth refresh and secure storage." },
  "ssh-agent": { operations: ["read", "write", "branch"], shortLived: true, interactive: false, rationale: "Forward an existing SSH agent without copying the private key." },
  "repository-dispatch": { operations: ["workflow"], shortLived: true, interactive: false, rationale: "Delegate repository mutation to GitHub Actions; dispatcher still needs its own authorized route." },
};

const PREFERRED_ORDER: GitHubAuthMethod[] = [
  "github-app",
  "actions-github-token",
  "repository-dispatch",
  "deploy-key",
  "gh-host-session",
  "ssh-agent",
  "secret-manager",
  "oauth",
  "gcm-oauth",
  "machine-user",
  "fine-grained-pat",
];

export function planGitHubAuth(request: GitHubAuthRequest): GitHubAuthPlan | null {
  const candidates = [...(request.preferred ?? []), ...PREFERRED_ORDER];
  const seen = new Set<GitHubAuthMethod>();

  for (const method of candidates) {
    if (seen.has(method)) continue;
    seen.add(method);
    const rule = METHOD_RULES[method];
    if (!rule || !rule.operations.includes(request.operation)) continue;
    if (rule.interactive && request.interactive === false) continue;

    return {
      method,
      repository: request.repository,
      operation: request.operation,
      shortLived: rule.shortLived,
      requiresUserInteraction: rule.interactive,
      secretHandledOutsideAgent: true,
      rationale: rule.rationale,
    };
  }

  return null;
}

export function canRouteGitHubAuth(request: GitHubAuthRequest): boolean {
  return Boolean(request.repository.trim() && request.reason.trim() && planGitHubAuth(request));
}
