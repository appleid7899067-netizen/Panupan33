import { DEFAULT_PUTER_MODEL, SYSTEM_PROMPTS } from "@/lib/catalog";
import {
  createGitHubBranch,
  createGitHubIssue,
  createGitHubPullRequest,
  dispatchGitHubWorkflow,
  getGitHubActions,
  getGitHubStatus,
  readGitHubFile,
  writeGitHubFile,
} from "@/lib/github.functions";
import { runAgentLoop } from "@/lib/agent-loop";
import { selectToolsForTask } from "@/lib/tool-registry";
import { chatWithPuter, type ChatResult, type ChatTurn } from "@/lib/puter";
import { callWithFallback } from "@/lib/puter-tool-loader";
import {
  callOpenRouter,
  chooseOpenRouterModel,
  getActiveApiKey,
  getCachedOpenRouterModels,
  verifyOpenRouterKey,
} from "@/lib/provider-keys";

export type FleetRequest = {
  mode: keyof typeof SYSTEM_PROMPTS | string;
  prompt: string;
  code?: string;
  language?: string;
  modelId?: string;
  extras?: string;
  history?: ChatTurn[];
  gateway?: "puter" | "openrouter" | "auto";
};

const GITHUB_TOOLS = `
You have real GitHub tools. The bot can inspect a repository, read files, write/commit files, create branches, create pull requests, create issues, inspect GitHub Actions, dispatch a workflow, and wait for CI.
Never claim an action completed unless a GitHub tool result confirms it.
Never claim CI passed unless github_actions / github_wait_for_workflow returned status=completed and conclusion=success.
`;

function buildUserMessage(data: FleetRequest, githubContext?: string) {
  const parts: string[] = [GITHUB_TOOLS.trim()];
  if (data.language) parts.push(`Language: ${data.language}`);
  if (data.extras) parts.push(data.extras);
  if (githubContext) parts.push(`GitHub tool result:\n${githubContext}`);
  if (data.prompt) parts.push(data.prompt);
  if (data.code?.trim()) parts.push(["Code:", data.code].join("\n"));
  return parts.filter(Boolean).join("\n\n");
}

function splitBody(text: string) {
  const separator = text.indexOf("\n---\n");
  if (separator < 0) return { first: text.trim(), body: "" };
  return { first: text.slice(0, separator).trim(), body: text.slice(separator + 5).trim() };
}

async function runGitHubCommand(prompt: string): Promise<string | undefined> {
  const status = prompt.match(/^github:\s*status\s+([^\s]+)\s*$/i);
  if (status) {
    const [owner, repo] = status[1].split("/");
    if (!owner || !repo) throw new Error("Use: github: status owner/repo");
    return JSON.stringify(await getGitHubStatus({ data: { owner, repo } }), null, 2);
  }
  const read = prompt.match(/^github:\s*read\s+([^\s]+)(?:\s+([^\s]+))?\s*$/i);
  if (read) {
    const parts = read[1].split("/");
    const owner = parts.shift();
    const repo = parts.shift();
    const path = parts.join("/");
    if (!owner || !repo || !path) throw new Error("Use: github: read owner/repo/path/to/file [ref]");
    const file = await readGitHubFile({ data: { owner, repo, path, ...(read[2] ? { ref: read[2] } : {}) } });
    return JSON.stringify({ action: "read", repository: `${owner}/${repo}`, path: file.path, sha: file.sha, content: file.content }, null, 2);
  }
  const write = prompt.match(/^github:\s*write\s+([^\s]+)\s+([\s\S]+)$/i);
  if (write) {
    const parts = write[1].split("/");
    const owner = parts.shift();
    const repo = parts.shift();
    const path = parts.join("/");
    if (!owner || !repo || !path) throw new Error("Use: github: write owner/repo/path/to/file <message>\n---\n<content>");
    const { first: message, body: content } = splitBody(write[2]);
    if (!content) throw new Error("GitHub write needs complete file content after ---");
    const current = await readGitHubFile({ data: { owner, repo, path } }).catch(() => null);
    const result = await writeGitHubFile({
      data: { owner, repo, path, content, message: message || "Update from Bossnu SlieLo", ...(current?.sha ? { sha: current.sha } : {}) },
    });
    return JSON.stringify({ action: "write", repository: `${owner}/${repo}`, path, result }, null, 2);
  }
  const branch = prompt.match(/^github:\s*branch\s+([^\s]+)\s+([^\s]+)(?:\s+([^\s]+))?\s*$/i);
  if (branch) {
    const [owner, repo] = branch[1].split("/");
    if (!owner || !repo) throw new Error("Use: github: branch owner/repo new-branch [from-branch]");
    return JSON.stringify(await createGitHubBranch({ data: { owner, repo, branch: branch[2], ...(branch[3] ? { from: branch[3] } : {}) } }), null, 2);
  }
  const pr = prompt.match(/^github:\s*pr\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([\s\S]+)$/i);
  if (pr) {
    const [owner, repo] = pr[1].split("/");
    if (!owner || !repo) throw new Error("Use: github: pr owner/repo head-branch base-branch <title>\n<body>");
    const { first: title, body } = splitBody(pr[4]);
    return JSON.stringify(await createGitHubPullRequest({ data: { owner, repo, head: pr[2], base: pr[3], title, ...(body ? { body } : {}) } }), null, 2);
  }
  const issue = prompt.match(/^github:\s*issue\s+([^\s]+)\s+([\s\S]+)$/i);
  if (issue) {
    const [owner, repo] = issue[1].split("/");
    if (!owner || !repo) throw new Error("Use: github: issue owner/repo <title>\n<body>");
    const { first: title, body } = splitBody(issue[2]);
    return JSON.stringify(await createGitHubIssue({ data: { owner, repo, title, ...(body ? { body } : {}) } }), null, 2);
  }
  const actions = prompt.match(/^github:\s*actions\s+([^\s]+)(?:\s+([^\s]+))?\s*$/i);
  if (actions) {
    const [owner, repo] = actions[1].split("/");
    if (!owner || !repo) throw new Error("Use: github: actions owner/repo [branch]");
    return JSON.stringify(await getGitHubActions({ data: { owner, repo, ...(actions[2] ? { branch: actions[2] } : {}) } }), null, 2);
  }
  const workflow = prompt.match(/^github:\s*workflow\s+([^\s]+)\s+([^\s]+)(?:\s+([^\s]+))?\s*$/i);
  if (workflow) {
    const [owner, repo] = workflow[1].split("/");
    if (!owner || !repo) throw new Error("Use: github: workflow owner/repo workflow-file-or-id [branch]");
    return JSON.stringify(await dispatchGitHubWorkflow({ data: { owner, repo, workflow: workflow[2], ...(workflow[3] ? { branch: workflow[3] } : {}) } }), null, 2);
  }
  return undefined;
}

function wantsAgentLoop(prompt: string) {
  return /แก้|ซ่อม|debug|fix|repair|deploy|ดีพลอย|ci|github|sandbox|ตรวจ|verify|build|error|502|503|401|403|typescript|runtime/i.test(
    prompt,
  );
}

async function runOpenRouterTurn(data: FleetRequest, userMessage: string, onDelta?: (full: string) => void, onActivity?: (activity: string[]) => void): Promise<ChatResult> {
  const key = getActiveApiKey();
  if (!key) return { ok: false, error: "ยังไม่มี OpenRouter API key (sk-or-...)" };
  onActivity?.(["ตรวจ OpenRouter API key"]);
  let models = getCachedOpenRouterModels();
  if (!models.length) {
    const verified = await verifyOpenRouterKey(key);
    if (!verified.ok) return { ok: false, error: verified.error };
    models = verified.models;
  }
  onActivity?.(["ตรวจ OpenRouter API key", "อ่าน OpenRouter model catalog"]);
  const requested = (data.modelId || "").replace(/^openrouter:/i, "").trim();
  const selected = requested
    ? models.find((m) => m.id === requested) ?? models.find((m) => m.id.split("/").pop() === requested)
    : chooseOpenRouterModel(models, data.prompt);
  if (!selected) {
    return { ok: false, error: "OpenRouter key ใช้งานได้ แต่ยังไม่มีโมเดลข้อความที่บัญชีนี้เรียกได้ — ยังไม่เปิดตัวเลือกหลอก" };
  }
  const result = await callOpenRouter({
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.chat },
      ...(data.history ?? []).slice(-8),
      { role: "user", content: userMessage },
    ],
    model: selected.id,
    onDelta,
  });
  if (!result.ok) return result;
  const activity = [
    "ตรวจ OpenRouter API key",
    "อ่าน OpenRouter model catalog",
    `Gateway: OpenRouter (ไม่ใช่ Puter)`,
    `OpenRouter model: ${selected.id}`,
    "ส่งผลลัพธ์",
  ];
  onActivity?.(activity);
  return { ok: true, text: result.text, model: `openrouter:${selected.id}`, activity, verified: false };
}

export async function runFleet(
  data: FleetRequest,
  onDelta?: (full: string) => void,
  onActivity?: (activity: string[]) => void,
): Promise<ChatResult> {
  const systemPrompt = SYSTEM_PROMPTS[data.mode as keyof typeof SYSTEM_PROMPTS] ?? SYSTEM_PROMPTS.chat;
  const githubContext = await runGitHubCommand(data.prompt).catch((error) =>
    `GitHub tool error: ${error instanceof Error ? error.message : String(error)}`,
  );
  const userMessage = buildUserMessage(data, githubContext);
  const selectedModelId = (data.modelId || "").trim();
  const explicitPuter = /^puter:/i.test(selectedModelId) || data.gateway === "puter";
  const explicitOpenRouter = /^openrouter:/i.test(selectedModelId) || data.gateway === "openrouter";
  const key = getActiveApiKey();

  if (explicitOpenRouter || (data.gateway !== "puter" && key && !explicitPuter && data.gateway === "openrouter")) {
    return runOpenRouterTurn(data, userMessage, onDelta, onActivity);
  }
  if (!explicitPuter && key && data.gateway === "openrouter") {
    return runOpenRouterTurn(data, userMessage, onDelta, onActivity);
  }
  if (!explicitPuter && key && data.gateway === "auto" && !wantsAgentLoop(data.prompt)) {
    return runOpenRouterTurn(data, userMessage, onDelta, onActivity);
  }

  if (wantsAgentLoop(data.prompt)) {
    try {
      onActivity?.(["วิเคราะห์", "เลือกเครื่องมือ", "ลงมือทำ"]);
      const tools = await selectToolsForTask(data.prompt);
      const loop = await runAgentLoop(
        `${systemPrompt}\n\n${userMessage}`,
        tools,
      );
      onDelta?.(loop.text);
      const activity = loop.steps.map((step) => `${step.phase}: ${step.detail}`);
      onActivity?.(activity);
      if (!loop.ok || loop.verified !== true) {
        return {
          ok: false,
          error: loop.text || "งานยังไม่ผ่าน verification gate จึงยังไม่ประกาศว่าสำเร็จ",
          activity,
          verified: false,
        };
      }
      return {
        ok: true,
        text: loop.text,
        model: selectedModelId || DEFAULT_PUTER_MODEL,
        activity,
        verified: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const activity = ["วิเคราะห์", "เลือกเครื่องมือ", "Agent loop error"];
      onActivity?.([...activity, message.slice(0, 180)]);
      return {
        ok: false,
        error: `Agent loop หยุดเพราะเกิดข้อผิดพลาดจริง: ${message.slice(0, 500)}`,
        activity: [...activity, message.slice(0, 180)],
        verified: false,
      };
    }
  }

  try {
    const tools = await selectToolsForTask(data.prompt);
    if (tools.length) {
      const history = (data.history ?? [])
        .slice(-8)
        .map((turn) => `${turn.role}: ${turn.content}`)
        .join("\n");
      const prompt = [`System instructions:\n${systemPrompt}`, history ? `Conversation history:\n${history}` : "", `Current user request:\n${userMessage}`]
        .filter(Boolean)
        .join("\n\n");
      const puterModel = selectedModelId.replace(/^puter:/i, "") || DEFAULT_PUTER_MODEL;
      const fleet = await callWithFallback(prompt, tools, [puterModel, DEFAULT_PUTER_MODEL], onActivity);
      if (fleet.ok) {
        onDelta?.(fleet.text);
        const toolNames = fleet.toolCalls.map((call) => call.name).filter(Boolean).slice(0, 8);
        const activity = [
          "วิเคราะห์",
          "Tool Registry",
          ...(toolNames.length ? [`ใช้เครื่องมือ: ${toolNames.join(", ")}`] : ["ประมวลผล"]),
          ...(fleet.toolResults.length ? [`Observe: ${fleet.toolResults.filter((item) => item.ok).length}/${fleet.toolResults.length} ผ่าน`] : []),
          "ส่งผลลัพธ์",
        ];
        onActivity?.(activity);
        return {
          ok: true,
          text: fleet.text,
          model: fleet.model ?? puterModel,
          activity,
          verified: fleet.verified === true,
        };
      }
    }
  } catch {
    /* fall through to Puter chat */
  }

  return chatWithPuter({
    messages: [
      { role: "system", content: systemPrompt },
      ...(data.history ?? []).slice(-8),
      { role: "user", content: userMessage },
    ],
    model: selectedModelId.replace(/^puter:/i, "") || DEFAULT_PUTER_MODEL,
    onDelta,
  });
}
