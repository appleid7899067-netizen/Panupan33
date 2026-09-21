//#region node_modules/.nitro/vite/services/ssr/assets/github-pat-B8vengCJ.js
var API = "https://api.github.com";
var KEY = "bosses.github.pat";
function getGithubPat() {
	try {
		return sessionStorage.getItem(KEY);
	} catch {
		return null;
	}
}
function setGithubPat(value) {
	try {
		if (value) sessionStorage.setItem(KEY, value.trim());
		else sessionStorage.removeItem(KEY);
	} catch {}
}
async function github(path, init = {}) {
	const token = getGithubPat();
	if (!token) throw new Error("GitHub write/CI tools need a GitHub token. Connect one on the Plugins page.");
	const response = await fetch(`${API}${path}`, {
		...init,
		headers: {
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			Authorization: `Bearer ${token}`,
			...init.body ? { "Content-Type": "application/json" } : {},
			...init.headers
		}
	});
	const text = await response.text();
	if (!response.ok) throw new Error(`GitHub API ${response.status}: ${text.slice(0, 300)}`);
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}
function repoPath(owner, repo) {
	return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}
async function executeGithubWithPat(toolName, args) {
	const owner = String(args.owner ?? "").trim();
	const repo = String(args.repo ?? "").trim();
	if (!owner || !repo) throw new Error("GitHub requires owner and repo.");
	const base = repoPath(owner, repo);
	switch (toolName) {
		case "github_write_file": {
			const path = String(args.path ?? "").replace(/^\/+/, "");
			const content = btoa(unescape(encodeURIComponent(String(args.content ?? ""))));
			return github(`${base}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
				method: "PUT",
				body: JSON.stringify({
					message: String(args.message ?? "Bossnu SlieLo update"),
					content,
					...args.sha ? { sha: String(args.sha) } : {},
					...args.branch ? { branch: String(args.branch) } : {}
				})
			});
		}
		case "github_create_branch": {
			const branch = String(args.branch ?? "");
			const from = String(args.from ?? "HEAD");
			const ref = await github(`${base}/git/ref/heads/${encodeURIComponent(from === "HEAD" ? "main" : from)}`);
			return github(`${base}/git/refs`, {
				method: "POST",
				body: JSON.stringify({
					ref: `refs/heads/${branch}`,
					sha: ref.object.sha
				})
			});
		}
		case "github_create_pull_request": return github(`${base}/pulls`, {
			method: "POST",
			body: JSON.stringify({
				title: String(args.title ?? ""),
				head: String(args.head ?? ""),
				base: String(args.base ?? "main"),
				body: args.body ? String(args.body) : "Created by Bossnu SlieLo"
			})
		});
		case "github_create_issue": return github(`${base}/issues`, {
			method: "POST",
			body: JSON.stringify({
				title: String(args.title ?? ""),
				body: args.body ? String(args.body) : ""
			})
		});
		case "github_actions": return github(`${base}/actions/runs?per_page=10${args.branch ? `&branch=${encodeURIComponent(String(args.branch))}` : ""}`);
		case "github_dispatch_workflow":
			await github(`${base}/actions/workflows/${encodeURIComponent(String(args.workflow))}/dispatches`, {
				method: "POST",
				body: JSON.stringify({
					ref: String(args.branch ?? "main"),
					inputs: {}
				})
			});
			return {
				dispatched: true,
				workflow: args.workflow,
				branch: args.branch ?? "main"
			};
		case "github_wait_for_workflow": {
			const runId = Number(args.runId);
			const timeoutMs = Math.min(Math.max(Number(args.timeoutMs ?? 9e4), 5e3), 18e4);
			const pollMs = Math.min(Math.max(Number(args.pollMs ?? 3e3), 1e3), 1e4);
			const deadline = Date.now() + timeoutMs;
			while (Date.now() < deadline) {
				const run = await github(`${base}/actions/runs/${runId}`);
				if (run.status === "completed") return {
					...run,
					verified: run.conclusion === "success"
				};
				await new Promise((r) => setTimeout(r, pollMs));
			}
			return {
				runId,
				status: "timeout",
				conclusion: null,
				verified: false
			};
		}
		default: throw new Error(`Unsupported GitHub tool for PAT: ${toolName}`);
	}
}
//#endregion
export { getGithubPat as n, setGithubPat as r, executeGithubWithPat as t };
