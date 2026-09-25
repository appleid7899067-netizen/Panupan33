/**
 * Production drivers for the deterministic GitHub loop (server-only).
 *
 * GitHub access wraps the same functions the agent tools use
 * (github-app.server.ts), so PAT precedence, GitHub App installation tokens
 * and error behavior stay identical to the model-driven agent.
 */
import {
  githubActions,
  githubCreateBranch,
  githubCreatePullRequest,
  githubGetFile,
  githubListDir,
  githubStatus,
  githubWaitForWorkflow,
  githubWorkflowDiagnostics,
  githubWriteFile,
} from "@/lib/github-app.server";
import { runModelGateway } from "@/lib/model-gateway.server";
import type { DriverGitHub, DriverModel } from "./github-loop-driver";

export function createHttpGitHubDriver(githubToken?: string): DriverGitHub {
  return {
    async status(owner, repo) {
      return githubStatus(owner, repo, githubToken);
    },
    async listDir(owner, repo, ref) {
      const res = await githubListDir({ owner, repo, ref, githubToken });
      return res.entries.map((e) => ({ name: e.name, path: e.path, type: e.type }));
    },
    async createBranch(owner, repo, branch, from) {
      return githubCreateBranch({ owner, repo, branch, from, githubToken });
    },
    async readFile(owner, repo, path, ref) {
      try {
        const res = await githubGetFile({ owner, repo, path, ref, githubToken });
        return { sha: res.sha, content: res.content };
      } catch {
        return null;
      }
    },
    async writeFile(owner, repo, path, content, message, opts) {
      const res = await githubWriteFile({
        owner,
        repo,
        path,
        content,
        message,
        sha: opts?.sha,
        branch: opts?.branch,
        githubToken,
      });
      return { sha: res?.commit?.sha ?? res?.content?.sha };
    },
    async createPullRequest(owner, repo, head, base, title, body) {
      return githubCreatePullRequest({ owner, repo, head, base, title, body, githubToken });
    },
    async listRuns(owner, repo, branch) {
      const res = await githubActions({ owner, repo, branch, githubToken });
      return (res?.workflow_runs ?? []).map((r) => ({
        id: r.id,
        status: r.status,
        conclusion: r.conclusion,
        head_branch: r.head_branch,
        head_sha: r.head_sha,
        html_url: r.html_url,
      }));
    },
    async waitRun(owner, repo, runId, timeoutMs, pollMs) {
      return githubWaitForWorkflow({ owner, repo, runId, timeoutMs, pollMs, githubToken });
    },
    async diagnostics(owner, repo, runId) {
      const res = await githubWorkflowDiagnostics({ owner, repo, runId, githubToken });
      return { failedJobs: res?.failedJobs ?? [] };
    },
  };
}

export function createPuterModelDriver(authToken?: string, model = "gpt-5.6-luna"): DriverModel {
  return {
    async chat(prompt) {
      const token = authToken?.trim() || process.env.PUTER_AUTH_TOKEN?.trim();
      if (!token) throw new Error("Puter auth token is missing — cannot ask the model to write files.");

      // Keep the GitHub loop on the same Puter-first model path as the normal
      // Boss agent. The user's Puter session is the first model authority.
      const result = await runModelGateway({
        messages: [{ role: "user", content: prompt }],
        tools: [],
        requestedModel: model,
        puterToken: token,
        maxAttempts: 4,
      });
      if (!result.ok) throw new Error(result.error);
      if (result.result.provider !== "puter") {
        throw new Error(`GitHub loop requires Puter model access, but gateway selected ${result.result.provider}.`);
      }
      if (!result.result.text.trim()) throw new Error("Puter model returned an empty response.");
      return result.result.text;
    },
  };
}
