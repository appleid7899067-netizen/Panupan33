import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/github-tool-bridge-DTKmoEpW.js
var executeAuthenticatedGitHubTool_createServerFn_handler = createServerRpc({
	id: "29bf38188957d859b135e60d29408ba984e9f2d46a9a79c57284f62936f34bfe",
	name: "executeAuthenticatedGitHubTool",
	filename: "src/lib/github-tool-bridge.ts"
}, (opts) => executeAuthenticatedGitHubTool.__executeServer(opts));
var executeAuthenticatedGitHubTool = createServerFn({ method: "POST" }).validator((value) => value).handler(executeAuthenticatedGitHubTool_createServerFn_handler, async ({ data }) => {
	const { githubActions, githubCreateBranch, githubCreateIssue, githubCreatePullRequest, githubDispatchWorkflow, githubStatus, githubWaitForWorkflow, githubWriteFile } = await import("./github-app.server-DPT5lpyO.mjs");
	const owner = String(data.args.owner ?? "").trim();
	const repo = String(data.args.repo ?? "").trim();
	if (!owner || !repo) throw new Error("GitHub requires owner and repo.");
	switch (data.toolName) {
		case "github_write_file": return githubWriteFile({
			owner,
			repo,
			path: String(data.args.path ?? ""),
			content: String(data.args.content ?? ""),
			message: String(data.args.message ?? "Bossnu update"),
			sha: data.args.sha ? String(data.args.sha) : void 0,
			branch: data.args.branch ? String(data.args.branch) : void 0
		});
		case "github_create_branch": return githubCreateBranch({
			owner,
			repo,
			branch: String(data.args.branch ?? ""),
			from: data.args.from ? String(data.args.from) : void 0
		});
		case "github_create_pull_request": return githubCreatePullRequest({
			owner,
			repo,
			head: String(data.args.head ?? ""),
			base: data.args.base ? String(data.args.base) : void 0,
			title: String(data.args.title ?? ""),
			body: data.args.body ? String(data.args.body) : void 0
		});
		case "github_create_issue": return githubCreateIssue({
			owner,
			repo,
			title: String(data.args.title ?? ""),
			body: data.args.body ? String(data.args.body) : void 0
		});
		case "github_actions": return githubActions({
			owner,
			repo,
			branch: data.args.branch ? String(data.args.branch) : void 0
		});
		case "github_dispatch_workflow": return githubDispatchWorkflow({
			owner,
			repo,
			workflow: String(data.args.workflow ?? ""),
			branch: data.args.branch ? String(data.args.branch) : void 0,
			inputs: data.args.inputs && typeof data.args.inputs === "object" ? data.args.inputs : void 0
		});
		case "github_wait_for_workflow": return githubWaitForWorkflow({
			owner,
			repo,
			runId: Number(data.args.runId),
			timeoutMs: data.args.timeoutMs ? Number(data.args.timeoutMs) : void 0,
			pollMs: data.args.pollMs ? Number(data.args.pollMs) : void 0
		});
		case "github_get_repo": return githubStatus(owner, repo);
		default: throw new Error(`Unknown authenticated GitHub tool: ${data.toolName}`);
	}
});
//#endregion
export { executeAuthenticatedGitHubTool_createServerFn_handler };
