/**
 * Tool loader — Puter + Sandbox + Web + Full GitHub + Builder surface
 * GitHub: any owner/repo when user provides token; no pre-bound connection required.
 * Builder: ported from https://github.com/HeyPuter/builder (Apache-2.0)
 */
import { ensurePuter, extractText } from "@/lib/puter";
import { runInSandbox } from "@/lib/sandbox";
import { executeAuthenticatedGitHubTool } from "@/lib/github-tool-bridge";
import { executeGithubWithPat } from "@/lib/github-pat";
import { AUTH_GITHUB_FULL, isGithubAuthTool, nativeFullGitHubTools } from "@/lib/github-tools-expand";
import { nativeBuilderTools, isBuilderTool } from "@/lib/builder/tools";
import { executeBuilderTool } from "@/lib/builder/execute";

export type CodingFleetTool = {
  name?: string;
  id?: string;
  slug?: string;
  description?: string;
  input_schema?: unknown;
  inputSchema?: unknown;
  parameters?: unknown;
  endpoint?: unknown;
  url?: unknown;
  method?: unknown;
  mcpServer?: string;
  mcpToolName?: string;
  pluginSource?: string;
  pluginName?: string;
  githubSource?: boolean;
  githubSearchSource?: boolean;
  sandboxSource?: boolean;
  webSource?: boolean;
  codingFleetSource?: boolean;
  builderSource?: boolean;
  [key: string]: unknown;
};

export type ToolExecutionResult = { name: string; ok: boolean; result?: unknown; error?: string };

type ToolCall = { id?: string; name: string; arguments: Record<string, unknown> };

const AUTH_GITHUB = AUTH_GITHUB_FULL as unknown as string[];
const GITHUB_API = "https://api.github.com";
const MAX_TOOL_ROUNDS = 5;
const DEFAULT_MODELS = ["nex-agi/nex-n2.5-pro:free", "nex-agi/nex-n2.5-mini:free"] as const;

function toolName(tool: CodingFleetTool) {
  return String(tool.name ?? tool.slug ?? tool.id ?? "").trim();
}

function toolParameters(tool: CodingFleetTool): Record<string, unknown> {
  const value = tool.input_schema ?? tool.inputSchema ?? tool.parameters;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { type: "object", properties: {} };
}

function parseArguments(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function nativeSandboxTools(): CodingFleetTool[] {
  return [{
    name: "sandbox_run",
    description: "Run JS/HTML/CSS in sandbox; return stdout/stderr/errors.",
    sandboxSource: true,
    inputSchema: {
      type: "object",
      properties: {
        language: { type: "string" },
        code: { type: "string" },
        timeoutMs: { type: "integer" },
      },
      required: ["language", "code"],
      additionalProperties: false,
    },
  }];
}

function nativeWebTools(): CodingFleetTool[] {
  return [{
    name: "web_search",
    webSource: true,
    description: "Search the live Internet through OpenAI's hosted web search.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 2, maxLength: 600 },
        count: { type: "integer", minimum: 1, maximum: 10 },
      },
      required: ["query"],
      additionalProperties: false,
    },
  }];
}

function nativeAuthenticatedGitHubTools(): CodingFleetTool[] {
  return nativeFullGitHubTools() as CodingFleetTool[];
}

function nativeGitHubPublicTools(): CodingFleetTool[] {
  return [
    { name: "github_get_repo", description: "Public repo metadata", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" } }, required: ["owner", "repo"], additionalProperties: false }, githubSource: true },
    { name: "github_get_file", description: "Read public file", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, path: { type: "string" }, ref: { type: "string" } }, required: ["owner", "repo", "path"], additionalProperties: false }, githubSource: true },
    { name: "github_list_dir", description: "List public dir", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, path: { type: "string" }, ref: { type: "string" } }, required: ["owner", "repo"], additionalProperties: false }, githubSource: true },
  ];
}

export async function loadCodingFleetTools(_forceRefresh = false): Promise<CodingFleetTool[]> {
  const byName = new Map<string, CodingFleetTool>();
  for (const t of [
    ...nativeSandboxTools(),
    ...nativeWebTools(),
    ...nativeAuthenticatedGitHubTools(),
    ...nativeGitHubPublicTools(),
    ...(nativeBuilderTools() as CodingFleetTool[]),
  ]) {
    const n = toolName(t);
    if (n) byName.set(n, t);
  }
  return Array.from(byName.values());
}

async function executeAuthenticatedGithub(name: string, args: Record<string, unknown>, githubToken?: string): Promise<unknown> {
  try {
    return await executeGithubWithPat(name, args, githubToken);
  } catch (patError) {
    const patMsg = patError instanceof Error ? patError.message : String(patError);
    try {
      return await executeAuthenticatedGitHubTool({
        data: { toolName: name, args, ...(githubToken ? { githubToken } : {}) },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`GitHub ${name} failed. PAT: ${patMsg.slice(0, 180)} | App: ${message.slice(0, 180)}`);
    }
  }
}

async function executePublicGitHub(name: string, args: Record<string, unknown>): Promise<unknown> {
  const owner = String(args.owner ?? "").trim();
  const repo = String(args.repo ?? "").trim();
  if (!owner || !repo) throw new Error("GitHub requires owner and repo in args (no pre-bound repo).");
  const base = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  if (name === "github_get_repo") {
    const r = await fetch(base, { headers: { Accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error(`GitHub HTTP ${r.status}`);
    return r.json();
  }
  if (name === "github_get_file" || name === "github_list_dir") {
    const path = String(args.path ?? "").replace(/^\/+/, "");
    const ref = args.ref ? `?ref=${encodeURIComponent(String(args.ref))}` : "";
    const r = await fetch(`${base}/contents/${path.split("/").map(encodeURIComponent).join("/")}${ref}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!r.ok) throw new Error(`GitHub HTTP ${r.status}`);
    return r.json();
  }
  throw new Error(`Unsupported public GitHub tool: ${name}`);
}

async function executeWebSearch(args: Record<string, unknown>): Promise<unknown> {
  const query = String(args.query ?? "").trim();
  if (!query) throw new Error("web_search requires query");
  const count = Math.min(10, Math.max(1, Number(args.count ?? 8)));
  const openaiKey = String(process.env.OPENAI_API_KEY ?? "").trim();
  if (!openaiKey) throw new Error("OpenAI web search requires OPENAI_API_KEY.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_WEB_SEARCH_MODEL || "gpt-5-mini",
      tools: [{ type: "web_search" }],
      input: `Search the live Internet for: ${query}\nReturn up to ${count} relevant sources with title, URL, and a concise factual snippet. Prefer primary/authoritative sources.`,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI web search HTTP ${response.status}`);
  const data = await response.json() as {
    output_text?: string;
    output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; annotations?: Array<{ type?: string; url?: string; title?: string }> }> }>;
  };
  return {
    provider: "openai",
    query,
    text: data.output_text ?? "",
    output: data.output ?? [],
  };
}

async function executeWeb(name: string, args: Record<string, unknown>): Promise<unknown> {
  const rawUrl = String(args.url ?? "").trim();
  if (!/^https:\/\//i.test(rawUrl)) throw new Error("HTTPS only");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(30000, Number(args.timeoutMs ?? 15000)));
  try {
    const response = await fetch(rawUrl, {
      signal: controller.signal,
      headers: { Accept: "text/html,application/json,*/*", "User-Agent": "Bossnu-Web/1.0" },
    });
    const body = await response.text();
    if (name === "web_check") {
      return { ok: response.ok, status: response.status, finalUrl: response.url, bodyPreview: body.slice(0, 2000) };
    }
    return { ok: response.ok, status: response.status, finalUrl: response.url, data: body.slice(0, 30000) };
  } finally {
    clearTimeout(timer);
  }
}

async function executeTool(
  tool: CodingFleetTool,
  args: Record<string, unknown>,
  authToken?: string,
  githubToken?: string,
): Promise<unknown> {
  const name = toolName(tool);
  if (name === "sandbox_run") {
    return runInSandbox({
      language: String(args.language ?? "javascript"),
      code: String(args.code ?? ""),
      timeoutMs: args.timeoutMs ? Number(args.timeoutMs) : undefined,
    });
  }
  if (name === "web_search") return executeWebSearch(args);
  if (isBuilderTool(name) || tool.builderSource) {
    return executeBuilderTool(name, args, { authToken });
  }
  if (tool.githubSource && isGithubAuthTool(name)) {
    try {
      return await executeAuthenticatedGithub(name, args, githubToken);
    } catch (e) {
      if (/get_|list_|search_/.test(name)) return executePublicGitHub(name, args);
      throw e;
    }
  }
  if (tool.githubSource) return executePublicGitHub(name, args);
  throw new Error(`No executor for tool: ${name}`);
}

function toPuterTools(tools: CodingFleetTool[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: toolName(tool),
      description: String(tool.description ?? toolName(tool)),
      parameters: toolParameters(tool),
    },
  }));
}

function extractToolCalls(response: unknown): ToolCall[] {
  const message = (response as { message?: { tool_calls?: unknown } })?.message;
  const raw = message?.tool_calls;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const rec = item as Record<string, unknown>;
    const fn = (rec.function ?? rec) as Record<string, unknown>;
    const name = String(fn.name ?? "").trim();
    if (!name) return [];
    return [{ id: rec.id ? String(rec.id) : undefined, name, arguments: parseArguments(fn.arguments ?? fn.input) }];
  });
}

export async function callWithFallback(
  prompt: string,
  tools: CodingFleetTool[],
  models: string[] = [...DEFAULT_MODELS],
  onActivity?: (lines: string[]) => void,
  authToken?: string,
  githubToken?: string,
): Promise<{ ok: boolean; text: string; model?: string; toolCalls: ToolCall[]; toolResults: ToolExecutionResult[]; verified?: boolean; error?: string }> {
  const availableTools = tools.length ? tools : await loadCodingFleetTools();
  const puterTools = toPuterTools(availableTools);
  const toolMap = new Map(availableTools.map((t) => [toolName(t), t]));
  let lastError = "";
  for (const model of models.slice(0, 3)) {
    try {
      await ensurePuter();
      const toolResults: ToolExecutionResult[] = [];
      const messages: Array<Record<string, unknown>> = [{ role: "user", content: prompt }];
      let finalText = "";
      let lastCalls: ToolCall[] = [];

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const puterChat = (globalThis as unknown as {
          puter?: {
            ai?: {
              chat?: (
                messages: Array<Record<string, unknown>>,
                options?: { model?: string; tools?: unknown[]; stream?: boolean },
              ) => Promise<unknown>;
            };
          };
        }).puter?.ai?.chat;
        if (typeof puterChat !== "function") throw new Error("Puter AI chat is unavailable.");
        const response = await puterChat(messages, {
          model,
          tools: puterTools,
          stream: false,
        });
        const text = extractText(response) || "";
        const calls = extractToolCalls(response);
        lastCalls = calls;
        if (!calls.length) {
          finalText = text;
          break;
        }
        onActivity?.(calls.map((c) => `tool:${c.name}`));
        messages.push({
          role: "assistant",
          content: text || null,
          tool_calls: calls.map((c) => ({
            id: c.id ?? c.name,
            type: "function",
            function: { name: c.name, arguments: JSON.stringify(c.arguments) },
          })),
        });
        for (const call of calls) {
          const tool = toolMap.get(call.name);
          try {
            if (!tool) throw new Error(`Unknown tool ${call.name}`);
            const result = await executeTool(tool, call.arguments, authToken, githubToken);
            toolResults.push({ name: call.name, ok: true, result });
            messages.push({ role: "user", content: `[TOOL RESULT: ${call.name}]\\n${JSON.stringify(result).slice(0, 50000)}` });
          } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            toolResults.push({ name: call.name, ok: false, error: err });
            messages.push({ role: "user", content: `[TOOL ERROR: ${call.name}]\\n${JSON.stringify({ error: err })}` });
          }
        }
      }

      return {
        ok: true,
        text: finalText || toolResults.map((t) => (t.ok ? `${t.name}: ok` : `${t.name}: ${t.error}`)).join("\n"),
        model,
        toolCalls: lastCalls,
        toolResults,
        verified: toolResults.some((t) => t.ok && /web_check|wait_for_workflow|actions|builder_publish/i.test(t.name)),
      };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      onActivity?.([`model ${model} failed: ${lastError.slice(0, 120)}`]);
    }
  }
  return { ok: false, text: "", toolCalls: [], toolResults: [], error: lastError || "All models failed" };
}

export { AUTH_GITHUB, isGithubAuthTool, isBuilderTool };