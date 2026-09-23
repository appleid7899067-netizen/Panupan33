/**
 * Tool loader — Puter + Sandbox + Web + Full GitHub + Builder surface
 * GitHub: any owner/repo when user provides token; no pre-bound connection required.
 * Builder: ported from https://github.com/HeyPuter/builder (Apache-2.0)
 * Web: forced public browser (Bing+Wikipedia+navigate); private hosts blocked.
 * Sandbox: multi-language real browser + install memory (2nd run never misses).
 */
import { ensurePuter, extractText } from "@/lib/puter";
import { runInSandbox } from "@/lib/sandbox";
import { executeAuthenticatedGitHubTool } from "@/lib/github-tool-bridge";
import { executeGithubWithPat } from "@/lib/github-pat";
import { AUTH_GITHUB_FULL, isGithubAuthTool, nativeFullGitHubTools } from "@/lib/github-tools-expand";
import { nativeBuilderTools, isBuilderTool } from "@/lib/builder/tools";
import { executeBuilderTool } from "@/lib/builder/execute";
import { callMCPTool, discoverMCPTools } from "@/lib/mcp";
import { browserWebSearch, browserNavigate, assertPublicHttpsUrl } from "@/lib/web-browser";
import { installRuntime, installAllRuntimes, getRuntimeMemory, SUPPORTED_LANGUAGES } from "@/lib/browser-runtimes";

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
  return [
    {
      name: "sandbox_run",
      description:
        "Run code in the REAL browser sandbox. Languages: javascript, typescript, html, css, python (Pyodide), lua, sql, ruby/php lite, shell subset, json. Auto-installs runtime and remembers success so the 2nd run never misses install.",
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
    },
    {
      name: "sandbox_install",
      description: "Install a browser language runtime (or language=all). Idempotent — remembered in localStorage.",
      sandboxSource: true,
      inputSchema: {
        type: "object",
        properties: {
          language: { type: "string", description: "python|lua|sql|ruby|php|all|..." },
        },
        required: ["language"],
        additionalProperties: false,
      },
    },
    {
      name: "sandbox_languages",
      description: "List supported browser languages and install/memory status.",
      sandboxSource: true,
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
  ];
}

function nativeWebTools(): CodingFleetTool[] {
  const urlProp = { type: "string", minLength: 8, maxLength: 2048 };
  return [
    {
      name: "web_search",
      webSource: true,
      description:
        "REQUIRED public-internet search via real browser (Bing + Wikipedia). Use for any live web facts. Only public HTTPS hosts. Optional openTop opens top result pages and extracts text.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", minLength: 2, maxLength: 600 },
          count: { type: "integer", minimum: 1, maximum: 10 },
          openTop: { type: "integer", minimum: 0, maximum: 3, description: "Open top N result pages in browser and extract text" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "web_browse",
      webSource: true,
      description: "Open any public HTTPS page in the browser and extract title + readable text. Blocks private/local hosts.",
      inputSchema: {
        type: "object",
        properties: { url: urlProp, timeoutMs: { type: "integer", minimum: 2000, maximum: 45000 } },
        required: ["url"],
        additionalProperties: false,
      },
    },
    {
      name: "web_check",
      webSource: true,
      description: "Browser GET status check for a public HTTPS URL.",
      inputSchema: {
        type: "object",
        properties: { url: urlProp, timeoutMs: { type: "integer" } },
        required: ["url"],
        additionalProperties: false,
      },
    },
    {
      name: "web_fetch",
      webSource: true,
      description: "Browser-fetch public HTTPS page body (text extracted).",
      inputSchema: {
        type: "object",
        properties: { url: urlProp, timeoutMs: { type: "integer" } },
        required: ["url"],
        additionalProperties: false,
      },
    },
  ];
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
  const mcp = await discoverMCPTools();
  for (const entry of mcp) {
    for (const mcpTool of entry.tools) {
      const name = `mcp__${entry.server.name}__${mcpTool.name}`;
      byName.set(name, {
        name,
        description: mcpTool.description ?? `MCP tool ${mcpTool.name} from ${entry.server.name}`,
        inputSchema: mcpTool.inputSchema ?? { type: "object", properties: {} },
        mcpServer: entry.server.name,
        mcpToolName: mcpTool.name,
      });
    }
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
  return browserWebSearch(query, {
    count: Number(args.count ?? 8),
    openTop: Number(args.openTop ?? 0),
  });
}

async function executeWeb(name: string, args: Record<string, unknown>): Promise<unknown> {
  const rawUrl = String(args.url ?? "").trim();
  assertPublicHttpsUrl(rawUrl);
  const page = await browserNavigate(rawUrl, {
    timeoutMs: args.timeoutMs ? Number(args.timeoutMs) : undefined,
  });
  if (name === "web_browse") {
    return {
      ok: page.ok,
      status: page.status,
      finalUrl: page.finalUrl,
      title: page.title,
      text: page.text.slice(0, 50000),
      responseTimeMs: page.responseTimeMs,
      via: "browser",
      ...(page.error ? { error: page.error } : {}),
    };
  }
  if (name === "web_check") {
    return {
      ok: page.ok,
      status: page.status,
      finalUrl: page.finalUrl,
      contentType: page.contentType,
      bodyPreview: page.text.slice(0, 2000),
      responseTimeMs: page.responseTimeMs,
      via: "browser",
      ...(page.error ? { error: page.error } : {}),
    };
  }
  return {
    ok: page.ok,
    status: page.status,
    finalUrl: page.finalUrl,
    contentType: page.contentType,
    data: page.text.slice(0, 50000),
    via: "browser",
    ...(page.error ? { error: page.error } : {}),
  };
}

async function executeTool(
  tool: CodingFleetTool,
  args: Record<string, unknown>,
  authToken?: string,
  githubToken?: string,
): Promise<unknown> {
  const name = toolName(tool);
  if (tool.mcpServer && tool.mcpToolName) {
    const discovered = await discoverMCPTools();
    const entry = discovered.find((item) => item.server.name === tool.mcpServer);
    if (!entry) throw new Error(`MCP server not available: ${tool.mcpServer}`);
    return callMCPTool(entry.server, tool.mcpToolName, args);
  }
  if (name === "sandbox_run") {
    return runInSandbox({
      language: String(args.language ?? "javascript"),
      code: String(args.code ?? ""),
      timeoutMs: args.timeoutMs ? Number(args.timeoutMs) : undefined,
    });
  }
  if (name === "sandbox_install") {
    const lang = String(args.language ?? "").trim().toLowerCase();
    if (lang === "all") return { ok: true, results: await installAllRuntimes() };
    return { ok: true, result: await installRuntime(lang || "javascript") };
  }
  if (name === "sandbox_languages") {
    const mem = getRuntimeMemory();
    return {
      ok: true,
      languages: SUPPORTED_LANGUAGES.map((item) => ({
        ...item,
        installed: Boolean(mem.installs[item.id]?.ok),
        runs: mem.runCount[item.id] ?? 0,
        lastError: mem.installs[item.id]?.error,
      })),
      memory: mem,
    };
  }
  if (name === "web_search") return executeWebSearch(args);
  if (name === "web_browse" || name === "web_check" || name === "web_fetch") return executeWeb(name, args);
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
        const apiKey = process.env.OPENROUTER_API_KEY?.trim();
        if (!apiKey) {
          throw new Error("Server model provider is not configured. Set OPENROUTER_API_KEY on Render.");
        }
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://panupanboss.onrender.com",
            "X-Title": "Bossnu SlieLo",
          },
          body: JSON.stringify({
            model,
            messages,
            tools: puterTools.length ? puterTools : undefined,
            tool_choice: puterTools.length ? "auto" : undefined,
          }),
        });
        const raw = await response.text();
        if (!response.ok) {
          throw new Error(`OpenRouter HTTP ${response.status}: ${raw.slice(0, 700)}`);
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new Error(`OpenRouter returned invalid JSON: ${raw.slice(0, 700)}`);
        }
        const choice = (parsed as { choices?: Array<{ message?: unknown }> })?.choices?.[0];
        const response = choice?.message ? { message: choice.message } : parsed;
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
            messages.push({ role: "user", content: `[TOOL RESULT: ${call.name}]\n${JSON.stringify(result).slice(0, 50000)}` });
          } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            toolResults.push({ name: call.name, ok: false, error: err });
            messages.push({ role: "user", content: `[TOOL ERROR: ${call.name}]\n${JSON.stringify({ error: err })}` });
          }
        }
      }

      return {
        ok: true,
        text: finalText || toolResults.map((t) => (t.ok ? `${t.name}: ok` : `${t.name}: ${t.error}`)).join("\n"),
        model,
        toolCalls: lastCalls,
        toolResults,
        verified: toolResults.some((t) => t.ok && /web_check|web_browse|web_search|sandbox_|wait_for_workflow|actions|builder_publish/i.test(t.name)),
      };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      onActivity?.([`model ${model} failed: ${lastError.slice(0, 120)}`]);
    }
  }
  return { ok: false, text: "", toolCalls: [], toolResults: [], error: lastError || "All models failed" };
}

export { AUTH_GITHUB, isGithubAuthTool, isBuilderTool };
