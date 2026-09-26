import { createFileRoute } from "@tanstack/react-router";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

type Body = {
  prompt?: unknown;
  model?: unknown;
  cwd?: unknown;
};

function grokBinary() {
  const bundled = join(process.cwd(), ".grok", "bin", process.platform === "win32" ? "grok.exe" : "grok");
  return existsSync(bundled) ? bundled : "grok";
}

async function runGrok(prompt: string, model: string, cwd: string) {
  const args = ["-p", prompt, "-m", model, "--cwd", cwd, "--output-format", "json", "--always-approve"];
  return await new Promise<{ ok: boolean; text: string; error?: string }>((resolve) => {
    const child = spawn(grokBinary(), args, {
      cwd,
      env: { ...process.env, GROK_MEMORY: process.env.GROK_MEMORY ?? "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => resolve({ ok: false, text: "", error: error.message }));
    child.on("close", (code) => {
      if (code !== 0) return resolve({ ok: false, text: "", error: stderr.trim().slice(-1200) || `Grok exited with code ${code}` });
      try {
        const data = JSON.parse(stdout || "{}") as { text?: unknown };
        resolve({ ok: true, text: typeof data.text === "string" ? data.text : "" });
      } catch {
        resolve({ ok: false, text: "", error: "Grok returned invalid JSON output." });
      }
    });
  });
}

export const Route = createFileRoute("/api/grok")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try { body = (await request.json()) as Body; }
        catch { return Response.json({ ok: false, error: "Invalid Grok request." }, { status: 400 }); }
        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
        if (!prompt) return Response.json({ ok: false, error: "Grok requires a prompt." }, { status: 400 });
        const model = typeof body.model === "string" && body.model.trim() ? body.model : "grok-build";
        const cwd = typeof body.cwd === "string" && body.cwd.trim() ? body.cwd : process.cwd();
        const result = await runGrok(prompt, model, cwd);
        return Response.json(result, { status: result.ok ? 200 : 503 });
      },
    },
  },
});
