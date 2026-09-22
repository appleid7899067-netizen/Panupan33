import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export type CodexRunEvent = (detail: string) => void;
export type CodexRunResult = { ok: boolean; text: string; verified: boolean; branch?: string; commit?: string; pullRequest?: string; evidence?: string; error?: string };

function repoFromPrompt(prompt: string): string {
  const explicit = prompt.match(/https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/i)?.[1];
  if (explicit) return explicit.replace(/\.git$/i, "");
  const ownerRepo = prompt.match(/(?:repo(?:sitory)?|รีโป)\s+([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/i)?.[1];
  return ownerRepo || process.env.CODEX_REPOSITORY || "appleid7899067-netizen/Panupan33";
}

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv, onOutput?: CodexRunEvent): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env, shell: false });
    let output = "";
    const push = (chunk: Buffer | string) => {
      const text = String(chunk);
      output += text;
      text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(-8).forEach((line) => onOutput?.(line.slice(0, 700)));
    };
    child.stdout.on("data", push);
    child.stderr.on("data", push);
    child.on("error", (error) => { output += "\n" + error.message; onOutput?.("⚠️ " + error.message); resolve({ code: 1, output }); });
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

export async function runCodexAgent(prompt: string, githubToken?: string, onOutput?: CodexRunEvent): Promise<CodexRunResult> {
  const apiKey = process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, verified: false, text: "Codex ยังไม่พร้อม: ต้องตั้ง CODEX_API_KEY หรือ OPENAI_API_KEY ฝั่ง server ก่อน", error: "Missing CODEX_API_KEY/OPENAI_API_KEY" };

  const repo = repoFromPrompt(prompt);
  const workspace = await mkdtemp(join(tmpdir(), "bossnu-codex-"));
  const branch = "boss/codex-" + Date.now().toString(36) + "-" + randomUUID().slice(0, 6);
  const env: NodeJS.ProcessEnv = { ...process.env, CODEX_API_KEY: apiKey, OPENAI_API_KEY: apiKey, GIT_TERMINAL_PROMPT: "0" };

  try {
    onOutput?.("🧠 Codex รับงาน: " + repo);
    const clone = await run("git", ["clone", "--depth", "1", "https://github.com/" + repo + ".git", workspace], tmpdir(), env, (line) => onOutput?.("📥 " + line));
    if (clone.code !== 0) return { ok: false, verified: false, text: "Codex clone ไม่สำเร็จ:\n" + clone.output.slice(-1800), error: clone.output.slice(-1800) };

    if (githubToken) {
      const askpass = join(workspace, ".git-askpass");
      await writeFile(askpass, "#!/bin/sh\nprintf '%s\\n' \"$CODEX_GITHUB_TOKEN\"\\n", { mode: 0o700 });
      env.CODEX_GITHUB_TOKEN = githubToken;
      await run("git", ["config", "credential.helper", "!" + askpass], workspace, env);
    }

    await run("git", ["checkout", "-b", branch], workspace, env, (line) => onOutput?.("🌿 " + line));
    onOutput?.("✏️ Codex กำลังอ่านและแก้ไฟล์จริง");

    const codexPrompt = prompt + "\n\nYou are the primary coding agent for Bossnu. Work directly inside the current repository. Inspect existing code before changing anything. Fix the root cause. Make the requested changes now, do not merely explain. Run the most relevant typecheck, tests, and build checks. If a check fails, inspect the concrete output, repair it, and rerun it. Do not commit or push; leave changes in the working tree for Bossnu to publish. Do not claim success without concrete verification evidence.";
    const codex = await run("codex", ["exec", "--sandbox", "workspace-write", "--ask-for-approval", "never", codexPrompt], workspace, env, (line) => onOutput?.("🤖 " + line));
    if (codex.code !== 0) return { ok: false, verified: false, text: "Codex ทำงานไม่สำเร็จ:\n" + codex.output.slice(-3000), error: codex.output.slice(-3000) };

    onOutput?.("🧪 ตรวจ typecheck หลัง Codex");
    const typecheck = await run("npm", ["run", "typecheck"], workspace, env, (line) => onOutput?.("🧪 " + line));
    if (typecheck.code !== 0) return { ok: false, verified: false, text: "Codex แก้แล้วแต่ typecheck ยังไม่ผ่าน:\n" + typecheck.output.slice(-3000), error: typecheck.output.slice(-3000) };

    const diff = await run("git", ["diff", "--stat"], workspace, env);
    const diffCheck = await run("git", ["diff", "--quiet"], workspace, env);
    if (diffCheck.code === 0) return { ok: false, verified: false, text: "Codex รันจบและ typecheck ผ่าน แต่ไม่มีไฟล์เปลี่ยนแปลง จึงยังไม่ถือว่างานแก้ไขสำเร็จ", evidence: "typecheck exit 0 + git diff ว่าง" };

    if (!githubToken) return { ok: true, verified: true, text: "Codex แก้ไฟล์จริงใน workspace ชั่วคราวและ typecheck ผ่านแล้ว แต่ยังไม่ได้ push เพราะไม่มี GitHub token ฝั่ง server.\n\n" + diff.output.slice(-1800), branch, evidence: "Codex exit 0 + typecheck exit 0 + git diff มีการเปลี่ยนแปลง" };

    onOutput?.("📤 ส่ง branch ที่ Codex แก้จริงขึ้น GitHub");
    await run("git", ["config", "user.name", "Bossnu Codex"], workspace, env);
    await run("git", ["config", "user.email", "bossnu-codex@users.noreply.github.com"], workspace, env);
    await run("git", ["add", "-A"], workspace, env);
    const commit = await run("git", ["commit", "-m", "fix: let Codex repair task automatically"], workspace, env, (line) => onOutput?.("📝 " + line));
    if (commit.code !== 0) return { ok: false, verified: false, text: "commit ไม่สำเร็จ:\n" + commit.output.slice(-1800), error: commit.output.slice(-1800) };

    const shaResult = await run("git", ["rev-parse", "HEAD"], workspace, env);
    const push = await run("git", ["push", "origin", branch], workspace, env, (line) => onOutput?.("🚀 " + line));
    if (push.code !== 0) return { ok: false, verified: false, text: "push branch ไม่สำเร็จ:\n" + push.output.slice(-1800), error: push.output.slice(-1800) };

    return { ok: true, verified: true, text: "Codex แก้โค้ดจริง + typecheck ผ่าน + push branch สำเร็จแล้ว\n\nBranch: " + branch + "\nCommit: " + shaResult.output.trim() + "\n" + diff.output.trim(), branch, commit: shaResult.output.trim(), pullRequest: "https://github.com/" + repo + "/compare/main..." + encodeURIComponent(branch) + "?expand=1", evidence: "Codex exit 0 + typecheck exit 0 + git diff + git push สำเร็จ" };
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
