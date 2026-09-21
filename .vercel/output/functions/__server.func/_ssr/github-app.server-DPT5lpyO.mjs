import { createSign } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/github-app.server-DPT5lpyO.js
var API = "https://api.github.com";
var API_VERSION = "2026-03-10";
function requiredEnv(name) {
	const value = process.env[name];
	if (!value) throw new Error(`Missing ${name} environment variable`);
	return value;
}
function createAppJwt() {
	const appId = requiredEnv("GITHUB_APP_ID");
	const privateKey = requiredEnv("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n");
	const now = Math.floor(Date.now() / 1e3);
	const unsigned = `${Buffer.from(JSON.stringify({
		alg: "RS256",
		typ: "JWT"
	})).toString("base64url")}.${Buffer.from(JSON.stringify({
		iat: now - 60,
		exp: now + 540,
		iss: appId
	})).toString("base64url")}`;
	const signer = createSign("RSA-SHA256");
	signer.update(unsigned);
	signer.end();
	return `${unsigned}.${signer.sign(privateKey, "base64url")}`;
}
async function github(path, init = {}, token) {
	const response = await fetch(`${API}${path}`, {
		...init,
		headers: {
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": API_VERSION,
			...token ? { Authorization: `Bearer ${token}` } : {},
			...init.body ? { "Content-Type": "application/json" } : {},
			...init.headers
		}
	});
	const data = await response.json().catch(() => null);
	if (!response.ok) {
		const message = data && typeof data === "object" && data !== null && "message" in data ? String(data.message) : response.statusText;
		throw new Error(`GitHub API ${response.status}: ${message}`);
	}
	return {
		data,
		response
	};
}
async function getInstallationToken(owner, repo) {
	const jwt = createAppJwt();
	return (await github(`/app/installations/${(await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/installation`, { headers: { Authorization: `Bearer ${jwt}` } })).data.id}/access_tokens`, {
		method: "POST",
		headers: { Authorization: `Bearer ${jwt}` }
	})).data.token;
}
function contentPath(owner, repo, path) {
	return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
}
async function githubGetFile(input) {
	const token = await getInstallationToken(input.owner, input.repo);
	const ref = input.ref ? `?ref=${encodeURIComponent(input.ref)}` : "";
	const result = await github(`${contentPath(input.owner, input.repo, input.path)}${ref}`, {}, token);
	const content = result.data.content ? Buffer.from(result.data.content.replace(/\n/g, ""), "base64").toString("utf8") : void 0;
	return {
		...result.data,
		content
	};
}
async function githubWriteFile(input) {
	const token = await getInstallationToken(input.owner, input.repo);
	return (await github(contentPath(input.owner, input.repo, input.path), {
		method: "PUT",
		body: JSON.stringify({
			message: input.message,
			content: Buffer.from(input.content, "utf8").toString("base64"),
			...input.sha ? { sha: input.sha } : {},
			...input.branch ? { branch: input.branch } : {}
		})
	}, token)).data;
}
async function githubStatus(owner, repo) {
	const token = await getInstallationToken(owner, repo);
	return (await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {}, token)).data;
}
async function githubCreateBranch(input) {
	const token = await getInstallationToken(input.owner, input.repo);
	const base = input.from || (await githubStatus(input.owner, input.repo)).default_branch;
	const ref = await github(`/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/ref/heads/${encodeURIComponent(base)}`, {}, token);
	const result = await github(`/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/refs`, {
		method: "POST",
		body: JSON.stringify({
			ref: `refs/heads/${input.branch}`,
			sha: ref.data.object.sha
		})
	}, token);
	return {
		branch: input.branch,
		from: base,
		...result.data
	};
}
async function githubCreatePullRequest(input) {
	const token = await getInstallationToken(input.owner, input.repo);
	const base = input.base || (await githubStatus(input.owner, input.repo)).default_branch;
	return (await github(`/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls`, {
		method: "POST",
		body: JSON.stringify({
			title: input.title,
			head: input.head,
			base,
			body: input.body || "Created by Bossnu SlieLo bot"
		})
	}, token)).data;
}
async function githubCreateIssue(input) {
	const token = await getInstallationToken(input.owner, input.repo);
	return (await github(`/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues`, {
		method: "POST",
		body: JSON.stringify({
			title: input.title,
			body: input.body || "Created by Bossnu SlieLo bot"
		})
	}, token)).data;
}
async function githubActions(input) {
	const token = await getInstallationToken(input.owner, input.repo);
	return (await github(`/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs?per_page=10${input.branch ? `&branch=${encodeURIComponent(input.branch)}` : ""}`, {}, token)).data;
}
async function githubWaitForWorkflow(input) {
	const timeoutMs = Math.min(Math.max(input.timeoutMs ?? 12e4, 5e3), 3e5);
	const pollMs = Math.min(Math.max(input.pollMs ?? 3e3, 1e3), 15e3);
	const deadline = Date.now() + timeoutMs;
	const token = await getInstallationToken(input.owner, input.repo);
	while (Date.now() < deadline) {
		const result = await github(`/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/runs/${input.runId}`, {}, token);
		if (result.data.status === "completed") return {
			...result.data,
			verified: result.data.conclusion === "success"
		};
		await new Promise((resolve) => setTimeout(resolve, pollMs));
	}
	return {
		runId: input.runId,
		status: "timeout",
		conclusion: null,
		verified: false
	};
}
async function githubDispatchWorkflow(input) {
	const token = await getInstallationToken(input.owner, input.repo);
	const branch = input.branch || (await githubStatus(input.owner, input.repo)).default_branch;
	await github(`/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows/${encodeURIComponent(input.workflow)}/dispatches`, {
		method: "POST",
		body: JSON.stringify({
			ref: branch,
			inputs: input.inputs || {}
		})
	}, token);
	return {
		workflow: input.workflow,
		branch,
		dispatched: true
	};
}
//#endregion
export { githubActions, githubCreateBranch, githubCreateIssue, githubCreatePullRequest, githubDispatchWorkflow, githubGetFile, githubStatus, githubWaitForWorkflow, githubWriteFile };
