import { t as createServerFn } from "./ssr.mjs";
import { a as record, i as object, o as string } from "../_libs/zod.mjs";
import { githubActions, githubCreateBranch, githubCreateIssue, githubCreatePullRequest, githubDispatchWorkflow, githubGetFile, githubStatus, githubWriteFile } from "./github-app.server-DPT5lpyO.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/github.functions-_YxE5BrN.js
var repoSchema = object({
	owner: string().min(1).max(100),
	repo: string().min(1).max(100)
});
var getGitHubStatus_createServerFn_handler = createServerRpc({
	id: "2c82b9bf12394412ff43f37546a559194ec55c113aa0ab390fe03645dcfef916",
	name: "getGitHubStatus",
	filename: "src/lib/github.functions.ts"
}, (opts) => getGitHubStatus.__executeServer(opts));
var getGitHubStatus = createServerFn({ method: "GET" }).validator(repoSchema).handler(getGitHubStatus_createServerFn_handler, async ({ data }) => githubStatus(data.owner, data.repo));
var readGitHubFile_createServerFn_handler = createServerRpc({
	id: "247823b5c7db37348543fbf884dc594d45d34921bf88f2d5f40927cbb11985a5",
	name: "readGitHubFile",
	filename: "src/lib/github.functions.ts"
}, (opts) => readGitHubFile.__executeServer(opts));
var readGitHubFile = createServerFn({ method: "GET" }).validator(repoSchema.extend({
	path: string().min(1).max(500),
	ref: string().max(200).optional()
})).handler(readGitHubFile_createServerFn_handler, async ({ data }) => githubGetFile(data));
var writeGitHubFile_createServerFn_handler = createServerRpc({
	id: "aaf0b547bde4945bc41f866d5556406ac1c0bef1bb4875936b075634f67bb984",
	name: "writeGitHubFile",
	filename: "src/lib/github.functions.ts"
}, (opts) => writeGitHubFile.__executeServer(opts));
var writeGitHubFile = createServerFn({ method: "POST" }).validator(repoSchema.extend({
	path: string().min(1).max(500),
	content: string().max(2e6),
	message: string().min(1).max(200),
	sha: string().optional(),
	branch: string().max(200).optional()
})).handler(writeGitHubFile_createServerFn_handler, async ({ data }) => githubWriteFile(data));
var createGitHubBranch_createServerFn_handler = createServerRpc({
	id: "e45a4efa4b619b20bd1a96cd185ff10145cdc089a93139c2ce3238cb7a1a988f",
	name: "createGitHubBranch",
	filename: "src/lib/github.functions.ts"
}, (opts) => createGitHubBranch.__executeServer(opts));
var createGitHubBranch = createServerFn({ method: "POST" }).validator(repoSchema.extend({
	branch: string().min(1).max(200),
	from: string().max(200).optional()
})).handler(createGitHubBranch_createServerFn_handler, async ({ data }) => githubCreateBranch(data));
var createGitHubPullRequest_createServerFn_handler = createServerRpc({
	id: "5da0fca2997fcc2cf0a23e6e8402bfe329bb7f44492be167c09e537859adef4d",
	name: "createGitHubPullRequest",
	filename: "src/lib/github.functions.ts"
}, (opts) => createGitHubPullRequest.__executeServer(opts));
var createGitHubPullRequest = createServerFn({ method: "POST" }).validator(repoSchema.extend({
	head: string().min(1).max(200),
	base: string().max(200).optional(),
	title: string().min(1).max(300),
	body: string().max(2e4).optional()
})).handler(createGitHubPullRequest_createServerFn_handler, async ({ data }) => githubCreatePullRequest(data));
var createGitHubIssue_createServerFn_handler = createServerRpc({
	id: "f186c39f90ba5685463b76680d863761b464984e9aebca773032a6907ba0c06b",
	name: "createGitHubIssue",
	filename: "src/lib/github.functions.ts"
}, (opts) => createGitHubIssue.__executeServer(opts));
var createGitHubIssue = createServerFn({ method: "POST" }).validator(repoSchema.extend({
	title: string().min(1).max(300),
	body: string().max(2e4).optional()
})).handler(createGitHubIssue_createServerFn_handler, async ({ data }) => githubCreateIssue(data));
var getGitHubActions_createServerFn_handler = createServerRpc({
	id: "1a18b9dd761398b2448b096f6651bc2920657c85774a82e7e7f36c660fb259cc",
	name: "getGitHubActions",
	filename: "src/lib/github.functions.ts"
}, (opts) => getGitHubActions.__executeServer(opts));
var getGitHubActions = createServerFn({ method: "GET" }).validator(repoSchema.extend({ branch: string().max(200).optional() })).handler(getGitHubActions_createServerFn_handler, async ({ data }) => githubActions(data));
var dispatchGitHubWorkflow_createServerFn_handler = createServerRpc({
	id: "26a97161908fcd21bb9a57aefcf8fa5157b4e65a6136f24d5c718b07ba60bafa",
	name: "dispatchGitHubWorkflow",
	filename: "src/lib/github.functions.ts"
}, (opts) => dispatchGitHubWorkflow.__executeServer(opts));
var dispatchGitHubWorkflow = createServerFn({ method: "POST" }).validator(repoSchema.extend({
	workflow: string().min(1).max(300),
	branch: string().max(200).optional(),
	inputs: record(string(), string()).optional()
})).handler(dispatchGitHubWorkflow_createServerFn_handler, async ({ data }) => githubDispatchWorkflow(data));
//#endregion
export { createGitHubBranch_createServerFn_handler, createGitHubIssue_createServerFn_handler, createGitHubPullRequest_createServerFn_handler, dispatchGitHubWorkflow_createServerFn_handler, getGitHubActions_createServerFn_handler, getGitHubStatus_createServerFn_handler, readGitHubFile_createServerFn_handler, writeGitHubFile_createServerFn_handler };
