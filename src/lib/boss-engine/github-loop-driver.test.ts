import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseFileChanges,
  parseRepoRef,
  runGitHubLoopDriver,
  wantsGitHubMutation,
  type DriverGitHub,
  type DriverModel,
  type FileChange,
} from "./github-loop-driver.ts";

/* ------------------------------------------------------------------ */
/* Fakes                                                               */
/* ------------------------------------------------------------------ */

type FakeCI = {
  ciConclusions: Array<"success" | "failure">;
  withRuns: boolean;
};

function makeFakeGitHub(opts: FakeCI) {
  const branches = new Map<string, { from: string; files: Record<string, string> }>();
  branches.set("main", { from: "main", files: { "README.md": "# repo" } });
  let runCounter = 100;
  let ciCalls = 0;
  const writes: Array<{ branch?: string; path: string; content: string }> = [];
  let prCount = 0;

  const gh: DriverGitHub = {
    async status() {
      return { default_branch: "main", full_name: "owner/repo" };
    },
    async listDir() {
      return [{ name: "README.md", path: "README.md", type: "file" }];
    },
    async createBranch(_o, _r, branch, from) {
      if (branches.has(branch)) throw new Error("Reference already exists");
      branches.set(branch, { from, files: {} });
      return { ref: `refs/heads/${branch}` };
    },
    async readFile(_o, _r, path, ref) {
      const b = branches.get(ref ?? "main");
      if (!b?.files[path]) return null;
      return { sha: `sha-${path}`, content: b.files[path] };
    },
    async writeFile(_o, _r, path, content, _message, opts) {
      const branch = opts?.branch ?? "main";
      const b = branches.get(branch);
      if (!b) throw new Error(`no branch ${branch}`);
      b.files[path] = content;
      writes.push({ branch, path, content });
      return { sha: `sha-${path}-${writes.length}` };
    },
    async createPullRequest(_o, _r, head) {
      prCount += 1;
      return { number: 7, html_url: `https://github.com/owner/repo/pull/7`, head };
    },
    async listRuns(_o, _r, branch) {
      if (!opts.withRuns || !branch || !branches.has(branch)) return [];
      return [{ id: ++runCounter, status: "queued", conclusion: null, head_branch: branch, head_sha: "x" }];
    },
    async waitRun() {
      const conclusion = opts.ciConclusions[Math.min(ciCalls, opts.ciConclusions.length - 1)];
      ciCalls += 1;
      return { status: "completed", conclusion, verified: conclusion === "success" };
    },
    async diagnostics() {
      return {
        failedJobs: [
          { name: "build", log: "npm run build\nerror TS2304: Cannot find name 'foo' at src/main.ts:3:1" },
        ],
      };
    },
  };

  return { gh, writes, branches, prCount: () => prCount };
}

function makeModel(filesByCall: string[]): { model: DriverModel; calls: number[] } {
  const calls: number[] = [];
  const model: DriverModel = {
    async chat(prompt) {
      calls.push(prompt.length);
      return filesByCall[Math.min(calls.length - 1, filesByCall.length - 1)];
    },
  };
  return { model, calls };
}

const INITIAL_FILES: FileChange[] = [{ path: "src/main.ts", content: "console.log('hello')\n" }];

/* ------------------------------------------------------------------ */
/* parseRepoRef / wantsGitHubMutation                                  */
/* ------------------------------------------------------------------ */

describe("parseRepoRef", () => {
  it("extracts plain owner/repo from a Thai prompt", () => {
    const ref = parseRepoRef("ช่วยแก้บั๊กใน repo appleid7899067-netizen/Panupan33 ด้วยครับ");
    assert.deepEqual(ref, { owner: "appleid7899067-netizen", repo: "Panupan33" });
  });

  it("extracts owner/repo from a github.com URL and strips .git", () => {
    const ref = parseRepoRef("https://github.com/foo/bar.git แก้ bug เดี่ยวนี้");
    assert.deepEqual(ref, { owner: "foo", repo: "bar" });
  });

  it("ignores file paths and prompts without a repo", () => {
    assert.equal(parseRepoRef("แก้ src/main.ts ให้หน่อย"), null);
    assert.equal(parseRepoRef("ดู repo นี้หน่อย"), null);
    assert.equal(parseRepoRef("node_modules/x/index.js"), null);
  });
});

describe("wantsGitHubMutation", () => {
  it("detects mutation intents", () => {
    assert.equal(wantsGitHubMutation("แก้ bug ใน owner/repo"), true);
    assert.equal(wantsGitHubMutation("เปิด PR ให้ด้วย owner/repo"), true);
  });
  it("treats read-only asks as non-mutation", () => {
    assert.equal(wantsGitHubMutation("ดูสถานะ repo owner/repo หน่อย"), false);
  });
});

describe("parseFileChanges", () => {
  it("parses a fenced JSON array", () => {
    const raw = "```json\n[{\"path\":\"a.ts\",\"content\":\"x\",\"message\":\"m\"}]\n```";
    assert.deepEqual(parseFileChanges(raw), [{ path: "a.ts", content: "x", message: "m" }]);
  });
  it("rejects non-array or unsafe paths", () => {
    assert.throws(() => parseFileChanges("no json here"));
    assert.throws(() => parseFileChanges("[{\"path\":\"../evil.ts\",\"content\":\"x\"}]"));
    assert.throws(() => parseFileChanges("[]"));
  });
});

/* ------------------------------------------------------------------ */
/* Deterministic loop                                                  */
/* ------------------------------------------------------------------ */

describe("runGitHubLoopDriver", () => {
  it("runs branch→edit→PR→CI→done with real steps and no model guessing", async () => {
    const { gh, writes } = makeFakeGitHub({ ciConclusions: ["success"], withRuns: true });
    const { model } = makeModel([JSON.stringify(INITIAL_FILES)]);
    const steps: string[] = [];
    const result = await runGitHubLoopDriver({
      prompt: "เพิ่มไฟล์ src/main.ts ใน owner/repo",
      owner: "owner",
      repo: "repo",
      github: gh,
      model,
      onStep: (phase, detail) => steps.push(`${phase}:${detail.slice(0, 40)}`),
    });

    assert.equal(result.ok, true);
    assert.equal(result.verified, true);
    assert.equal(result.state.phase, "done");
    assert.equal(result.state.ciStatus, "success");
    assert.match(result.state.prUrl ?? "", /pull\/7/);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].path, "src/main.ts");
    // Phase order is deterministic: branch before edit before pr before ci_wait before done.
    const order = (p: string) => steps.findIndex((s) => s.startsWith(`${p}:`));
    assert.ok(order("branch") < order("edit"));
    assert.ok(order("edit") < order("pr"));
    assert.ok(order("pr") < order("ci_wait"));
    assert.ok(order("ci_wait") >= 0);
  });

  it("repairs a failing CI once and then verifies", async () => {
    const { gh, writes } = makeFakeGitHub({ ciConclusions: ["failure", "success"], withRuns: true });
    const { model, calls } = makeModel([
      JSON.stringify(INITIAL_FILES),
      JSON.stringify([{ path: "src/main.ts", content: "const foo = 1;\nconsole.log(foo)\n", message: "fix foo" }]),
    ]);
    await runGitHubLoopDriver({
      prompt: "แก้ CI ให้ผ่าน owner/repo",
      owner: "owner",
      repo: "repo",
      github: gh,
      model,
    });

    assert.equal(calls.length, 2); // generate + repair
    assert.equal(writes.length, 2);
    assert.equal(writes[1].content, "const foo = 1;\nconsole.log(foo)\n");
  });

  it("succeeds without verification when the repo has no CI runs", async () => {
    const { gh } = makeFakeGitHub({ ciConclusions: [], withRuns: false });
    const { model } = makeModel([JSON.stringify(INITIAL_FILES)]);
    const result = await runGitHubLoopDriver({
      prompt: "เพิ่มไฟล์ให้ owner/repo",
      owner: "owner",
      repo: "repo",
      github: gh,
      model,
    });
    assert.equal(result.ok, true);
    assert.equal(result.verified, false);
    assert.equal(result.state.ciStatus, "unknown");
    assert.equal(result.state.phase, "done");
  });

  it("fails honestly after max repair attempts", async () => {
    const { gh } = makeFakeGitHub({
      ciConclusions: ["failure", "failure", "failure", "failure"],
      withRuns: true,
    });
    const { model } = makeModel([
      JSON.stringify(INITIAL_FILES),
      JSON.stringify([{ path: "src/main.ts", content: "still broken\n" }]),
    ]);
    const result = await runGitHubLoopDriver({
      prompt: "ซ่อม CI owner/repo",
      owner: "owner",
      repo: "repo",
      github: gh,
      model,
    });
    assert.equal(result.ok, false);
    assert.equal(result.verified, false);
    assert.equal(result.state.phase, "failed");
    // onCiResult: attempts exceed maxRepairAttempts (3) on the 4th CI failure.
    assert.equal(result.state.repairAttempts, 4);
  });

  it("fails cleanly when no files and no model are available", async () => {
    const { gh } = makeFakeGitHub({ ciConclusions: ["success"], withRuns: true });
    const result = await runGitHubLoopDriver({
      prompt: "owner/repo",
      owner: "owner",
      repo: "repo",
      github: gh,
    });
    assert.equal(result.ok, false);
    assert.equal(result.state.phase, "failed");
  });

  it("reuses an existing branch instead of erroring", async () => {
    const { gh, branches } = makeFakeGitHub({ ciConclusions: ["success"], withRuns: true });
    const { model } = makeModel([JSON.stringify(INITIAL_FILES)]);
    // The work branch name is timestamped, so simulate "already exists" by
    // registering the branch and throwing once from createBranch:
    const originalCreate = gh.createBranch.bind(gh);
    let threw = false;
    gh.createBranch = async (o, r, b, from) => {
      if (!threw) {
        threw = true;
        branches.set(b, { from, files: {} });
        throw new Error("Reference already exists");
      }
      return originalCreate(o, r, b, from);
    };
    const result = await runGitHubLoopDriver({
      prompt: "เพิ่มไฟล์ให้ owner/repo",
      owner: "owner",
      repo: "repo",
      github: gh,
      model,
    });
    assert.equal(result.ok, true);
    assert.equal(result.verified, true);
  });
});
