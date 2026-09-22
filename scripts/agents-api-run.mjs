#!/usr/bin/env node

import { spawn } from "node:child_process";

const API_BASE = "https://api.openai.com/v1";
const PROJECT_ID = "proj_TRlczjll9oTTJWHCQ7a8SkPl";
const MODEL = "gpt-6-astra";
const AGENT_NAME = "New agent";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY. Set it in the environment before running.");
  process.exit(1);
}

function curlJson(args, body) {
  return new Promise((resolve, reject) => {
    const child = spawn("curl", [
      "--silent", "--show-error", "--fail-with-body",
      ...args,
      "-H", "Authorization: Bearer " + apiKey,
      "-H", "OpenAI-Project: " + PROJECT_ID,
      "-H", "OpenAI-Beta: agents=v1",
      "-H", "Content-Type: application/json",
      "-d", JSON.stringify(body),
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error("OpenAI returned non-JSON output: " + stdout.slice(0, 1000)));
        }
      } else {
        reject(new Error(stderr || stdout || "curl exited with code " + code));
      }
    });
  });
}

async function createAgent() {
  return curlJson(["-X", "POST", API_BASE + "/agents"], {
    name: AGENT_NAME,
    model: MODEL,
    instructions: "You are a runnable test agent. Use the available execution environment when useful. Report what you actually did and distinguish verified results from assumptions.",
    reasoning: { effort: "medium", summary: "auto" },
    text: { format: { type: "text" }, verbosity: "medium" },
  });
}

function streamSession(agentId) {
  return new Promise((resolve, reject) => {
    const input = [
      "Start this session and prove that the execution environment is working.",
      "Run a small harmless command such as node --version or python --version, then report the observed result.",
      "If any tool or environment call fails, report the exact error and stop claiming success.",
    ].join(" ");

    const child = spawn("curl", [
      "--no-buffer", "--fail-with-body",
      "-X", "POST",
      API_BASE + "/agents/sessions",
      "-H", "Authorization: Bearer " + apiKey,
      "-H", "OpenAI-Project: " + PROJECT_ID,
      "-H", "OpenAI-Beta: agents=v1",
      "-H", "Content-Type: application/json",
      "-H", "Accept: text/event-stream",
      "-d", JSON.stringify({
        agent_id: agentId,
        environment: {
          type: "openai_hosted",
          network: { access: "disabled" },
          setup_commands: [
            { command: "node --version" },
            { command: "python --version" },
          ],
        },
        input,
        stream: true,
      }),
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    let buffer = "";
    let sessionId = null;
    let failed = false;
    let completed = false;

    child.stderr.on("data", (chunk) => { stderr += chunk; });

    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;

        try {
          const event = JSON.parse(raw);
          const type = event.type ?? "unknown";
          if (event.session?.id && !sessionId) sessionId = event.session.id;
          if (event.session_id && !sessionId) sessionId = event.session_id;

          if (type.includes("error") || type.endsWith(".failed") || type.includes("turn.failed")) {
            failed = true;
            console.error("[ERROR] " + type + ": " + JSON.stringify(event.error ?? event));
          } else if (
            type.includes("function_call") ||
            type.includes("command_execution") ||
            type.includes("mcp_call") ||
            type.includes("web_search")
          ) {
            console.log("[TOOL] " + type);
            console.log(JSON.stringify(event.item ?? event, null, 2));
          } else if (type.endsWith("output_text.delta")) {
            process.stdout.write(event.delta ?? "");
          } else {
            console.log("\n[EVENT] " + type);
          }

          if (type === "agent.session.turn.completed") completed = true;
        } catch {
          console.log("[RAW] " + raw);
        }
      }
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (buffer.trim()) console.log("[RAW] " + buffer.trim());
      if (code !== 0 || failed || !completed) {
        reject(new Error(stderr || "session stream ended without verified completion (code=" + code + ")"));
        return;
      }
      console.log("\n\nSession completed.");
      if (sessionId) console.log("Session ID: " + sessionId);
      resolve(sessionId);
    });
  });
}

try {
  console.log("Creating reusable agent in project " + PROJECT_ID + "...");
  const agent = await createAgent();
  if (!agent.id) throw new Error("Agents API did not return an agent ID.");
  console.log("Agent created: " + agent.id);

  console.log("Starting OpenAI-hosted session and streaming events...");
  await streamSession(agent.id);
} catch (error) {
  console.error("\nAgents API run failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
