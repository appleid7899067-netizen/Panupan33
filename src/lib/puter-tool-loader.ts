/**
 * Tool loader — Puter + Sandbox + Web + Full GitHub + Builder surface
 * GitHub: any owner/repo when user provides token; no pre-bound connection required.
 * Builder: ported from https://github.com/HeyPuter/builder (Apache-2.0)
 * Web: forced public browser (Bing+Wikipedia+navigate); private hosts blocked.
 * Sandbox: multi-language real browser + install memory (2nd run never misses).
 */
import { runInSandbox } from "@/lib/sandbox";
import { executeAuthenticatedGitHubTool } from "@/lib/github-tool-bridge";
import { executeGithubWithPat } from "@/lib/github-pat";
import { AUTH_GITHUB_FULL, isGithubAuthTool, nativeFullGitHubTools } from "@/lib/github-tools-expand";
import { nativeBuilderTools, isBuilderTool } from "@/lib/builder/tools";
import { executeBuilderTool } from "@/lib/builder/execute";
import { callMCPTool, discoverMCPTools } from "@/lib/mcp";
import { browserWebSearch, browserNavigate, assertPublicHttpsUrl } from "@/lib/web-browser";
import { installRuntime, installAllRuntimes, getRuntimeMemory, SUPPORTED_LANGUAGES } from "@/lib/browser-runtimes";
import { autoVerifyAfterPublish, extractPublishUrl } from "@/lib/boss-engine/post-publish";
import {
  createOpenRouterCompleter,
  createPuterCompleter,
  runModelGateway,
  type CompletionResult,
  type ModelCompleter,
} from "@/lib/model-gateway.server";

/** Context for auto-verification after publish/hosting tools (puter_hosting_create etc.). */
export type PublishCtx = { projectId?: string; threadId?: string };

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
const MAX_TOOL_ROUNDS = 8;
// Puter is the default authority for model access. Qualified model IDs are
// also passed to Puter first because Puter can route across many vendors.
const DEFAULT_MODELS = [
  "deepseek-chat",
  "deepseek-reasoner",
  "gpt-5.6-luna",
  "claude-opus-4-8",
  "gemini-3.1-flash-lite",
] as const;

function toolName(tool: CodingFleetTool) {
  return String(tool.name ?? tool.slug ?? tool.id ?? "").trim();
}

function toolParameters(tool: CodingFleetTool): Record<string, unknown> {
  const value = tool.input_schema ?? tool.inputSchema ?? tool.parameters;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { type: "object", properties: {} };
}

function nativeSandboxTools(): CodingFleetTool[] {
  return [
    {
      name: "sandbox_run",
      description:
        "Run code through the stable sandbox route. Browser: real runtime; server/Render: safe server verification for JS/HTML/CSS and Python is routed to the Python server runner. Auto-installs runtimes when needed. Do NOT call a separate install tool.",
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
      name: "sandbox_languages",
      description: "List supported browser languages and install/memory status.",
      sandboxSource: true,
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    {
      name: "terminal_execute",
      description:
        "Direct terminal-style execution for Boss. Run a bounded command/workflow inside the real Panupan33 sandbox. Use automatically for shell-style tasks, package/build/test commands, diagnostics, or when the goal explicitly asks for terminal access. This is an internal agent tool, not a user-facing button.",
      sandboxSource: true,
      inputSchema: {
        type: "object",
        properties: {
          language: { type: "string", description: "Sandbox runtime, usually javascript or python" },
          code: { type: "string", description: "Command/workflow code to execute in the sandbox" },
          timeoutMs: { type: "integer", minimum: 100, maximum: 60000 },
        },
        required: ["language", "code"],
        additionalProperties: false,
      },
    },
    {
      name: "programming_lab",
      description:
        "Hidden programming workspace for Boss. Use automatically when the goal requires writing, running, testing, debugging, previewing, or learning code. It provides the real Panupan33 sandbox runtime and returns execution evidence. This is an internal agent tool, not a user-facing button.",
      sandboxSource: true,
      inputSchema: {
        type: "object",
        properties: {
          language: { type: "string", description: "Runtime language supported by the sandbox" },
          code: { type: "string", description: "Complete code to execute" },
          timeoutMs: { type: "integer", minimum: 100, maximum: 60000 },
        },
        required: ["language", "code"],
        additionalProperties: false,
      },
    },
  ];
}

function nativeWritingTools(): CodingFleetTool[] {
  const textProp = { type: "string", minLength: 1, maxLength: 50000 };
  return [
    {
      name: "write_continue",
      description: "Writing assistant. Continue or complete user-provided text while preserving its intent, facts, language, and structure. Use automatically when the user asks to continue, finish, expand, or draft from notes.",
      inputSchema: {
        type: "object",
        properties: { text: textProp, instruction: { type: "string", maxLength: 2000 } },
        required: ["text"],
        additionalProperties: false,
      },
      codingFleetSource: true,
    },
    {
      name: "rewrite_text",
      description: "Rewrite text for clarity and natural language while preserving meaning. Use automatically for rewrite, paraphrase, polish, shorten, or expand requests.",
      inputSchema: {
        type: "object",
        properties: { text: textProp, instruction: { type: "string", maxLength: 2000 } },
        required: ["text"],
        additionalProperties: false,
      },
      codingFleetSource: true,
    },
    {
      name: "fix_grammar",
      description: "Correct spelling, grammar, punctuation, and awkward wording without changing the intended meaning. Use automatically when the user asks to proofread or fix language.",
      inputSchema: {
        type: "object",
        properties: { text: textProp, language: { type: "string", maxLength: 80 } },
        required: ["text"],
        additionalProperties: false,
      },
      codingFleetSource: true,
    },
    {
      name: "change_tone",
      description: "Change the tone of text to the requested style while preserving meaning. Examples: professional, friendly, concise, persuasive, casual, formal.",
      inputSchema: {
        type: "object",
        properties: { text: textProp, tone: { type: "string", minLength: 1, maxLength: 120 }, instruction: { type: "string", maxLength: 1000 } },
        required: ["text", "tone"],
        additionalProperties: false,
      },
      codingFleetSource: true,
    },
    {
      name: "generate_reply",
      description: "Draft a reply to a message using the requested relationship, language, tone, and constraints. Use automatically when the user asks what to reply.",
      inputSchema: {
        type: "object",
        properties: { message: textProp, context: { type: "string", maxLength: 10000 }, tone: { type: "string", maxLength: 120 }, language: { type: "string", maxLength: 80 } },
        required: ["message"],
        additionalProperties: false,
      },
      codingFleetSource: true,
    },
    {
      name: "translate_text",
      description: "Translate text between languages while preserving meaning, names, formatting, and technical terms where appropriate.",
      inputSchema: {
        type: "object",
        properties: { text: textProp, targetLanguage: { type: "string", minLength: 2, maxLength: 80 }, sourceLanguage: { type: "string", maxLength: 80 }, preserveFormatting: { type: "boolean" } },
        required: ["text", "targetLanguage"],
        additionalProperties: false,
      },
      codingFleetSource: true,
    },
    {
      name: "summarize_text",
      description: "Create a concise summary of provided text. Use automatically for summarize, key points, TL;DR, or extracting the main ideas.",
      inputSchema: {
        type: "object",
        properties: { text: textProp, style: { type: "string", maxLength: 120 }, maxWords: { type: "integer", minimum: 20, maximum: 3000 } },
        required: ["text"],
        additionalProperties: false,
      },
      codingFleetSource: true,
    },
  ];
}

function nativeWebTools(): CodingFleetTool[] {
  const urlProp = { type: "string", minLength: 8, maxLength: 2048 };
  return [
    {
      name: "visual_search",
      webSource: true,
      description:
        "Visual-search layer inspired by Lens-style apps. Given a PUBLIC HTTPS image URL, open Bing Visual Search and return the live visual-search page plus extracted result text. Use automatically when the task asks to identify an image, find its source, find similar images, inspect an object, or search by image. Do not expose this as a manual UI requirement.",
      inputSchema: {
        type: "object",
        properties: {
          imageUrl: { type: "string", minLength: 12, maxLength: 4096, description: "Public HTTPS URL of the image to search" },
          query: { type: "string", maxLength: 500, description: "Optional text hint to refine the visual search" },
        },
        required: ["imageUrl"],
        additionalProperties: false,
      },
    },
    {
      name: "web_search",
      webSource: true,
      description:
        "REQUIRED public-internet search via real browser (Google + Bing + Wikipedia). Use automatically for live/current facts such as prices, weather, news, product availability, exchange rates, sports, laws, and current service status. For time-sensitive facts, search first and open the most relevant sources when needed. Cross-check important values with at least two independent reputable sources when practical. Never invent a current value. Only public HTTPS hosts. Optional openTop opens top result pages and extracts text.",
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
    ...nativeWritingTools(),
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

async function executeVisualSearch(args: Record<string, unknown>): Promise<unknown> {
  const rawImageUrl = String(args.imageUrl ?? "").trim();
  const imageUrl = assertPublicHttpsUrl(rawImageUrl).toString();
  const hint = String(args.query ?? "").trim();
  // Bing exposes a public Visual Search experience that accepts an image URL.
  // Keep the image URL server-side and let the live browser fetch the result page.
  const visualUrl = new URL("https://www.bing.com/images/search");
  visualUrl.searchParams.set("view", "detailv2");
  visualUrl.searchParams.set("iss", "sbi");
  visualUrl.searchParams.set("FORM", "SBIHMP");
  visualUrl.searchParams.set("sbisrc", "UrlPaste");
  visualUrl.searchParams.set("q", `imgurl:${imageUrl}${hint ? ` ${hint}` : ""}`);
  const page = await browserNavigate(visualUrl.toString(), { timeoutMs: 30000, maxBytes: 1_500_000 });
  return {
    ok: page.ok,
    imageUrl,
    visualSearchUrl: visualUrl.toString(),
    status: page.status,
    title: page.title,
    text: page.text.slice(0, 50000),
    responseTimeMs: page.responseTimeMs,
    via: "bing-visual-search",
    ...(page.error ? { error: page.error } : {}),
  };
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
  publishCtx?: PublishCtx,
): Promise<unknown> {
  const name = toolName(tool);
  if (tool.mcpServer && tool.mcpToolName) {
    const discovered = await discoverMCPTools();
    const entry = discovered.find((item) => item.server.name === tool.mcpServer);
    if (!entry) throw new Error(`MCP server not available: ${tool.mcpServer}`);
    return callMCPTool(entry.server, tool.mcpToolName, args);
  }
  if (name === "sandbox_run" || name === "programming_lab" || name === "terminal_execute") {
    const result = await runInSandbox({
      language: String(args.language ?? "javascript"),
      code: String(args.code ?? ""),
      timeoutMs: args.timeoutMs ? Number(args.timeoutMs) : undefined,
    });
    if (name === "terminal_execute") {
      return {
        ...result,
        tool: "terminal_execute",
        purpose: "terminal-style-execute",
        evidence: {
          runtime: result.runtime,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          durationMs: result.durationMs,
        },
      };
    }
    if (name === "programming_lab") {
      return {
        ...result,
        tool: "programming_lab",
        purpose: "write-run-test-debug",
        evidence: {
          runtime: result.runtime,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          durationMs: result.durationMs,
        },
      };
    }
    return result;
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
  if (/^(write_continue|rewrite_text|fix_grammar|change_tone|generate_reply|translate_text|summarize_text)$/.test(name)) {
    return {
      ok: true,
      tool: name,
      instruction: args,
      mode: "writing-intent",
      nextStep: "Use the active model to produce the requested transformation; this tool supplies structured intent and should remain invisible in the user UI.",
    };
  }
  if (name === "visual_search") return executeVisualSearch(args);
  if (name === "web_search") return executeWebSearch(args);
  if (name === "web_browse" || name === "web_check" || name === "web_fetch") return executeWeb(name, args);
  if (isBuilderTool(name) || tool.builderSource) {
    const result = await executeBuilderTool(name, args, { authToken });
    // Auto-verify after publish/hosting (puter_hosting_create / builder_publish_site):
    // fetch the public URL, check HTTP + runtime HTML, merge evidence into the result.
    try {
      const auto = await autoVerifyAfterPublish(name, result, {
        projectId: publishCtx?.projectId ?? "default",
        threadId: publishCtx?.threadId,
      });
      if (auto) {
        const url = extractPublishUrl(result);
        const base =
          result && typeof result === "object" && !Array.isArray(result)
            ? (result as Record<string, unknown>)
            : { result };
        return {
          ...base,
          autoVerify: {
            url,
            ok: auto.ok,
            httpStatus: auto.http?.status,
            detail: auto.detail,
          },
        };
      }
    } catch {
      /* verification is best-effort — never fail the publish itself */
    }
    return result;
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



/**
 * Run one task through the model gateway (Puter-first, OpenRouter fallback)
 * and drive the tool loop on the server — Boss keeps control of messages,
 * tools, retries and verification; the model only answers each round.
 */
export async function callWithFallback(
  prompt: string,
  tools: CodingFleetTool[],
  models: string[] = [...DEFAULT_MODELS],
  onActivity?: (lines: string[]) => void,
  authToken?: string,
  githubToken?: string,
  publishCtx?: PublishCtx,
): Promise<{ ok: boolean; text: string; model?: string; provider?: "puter" | "openrouter"; toolCalls: ToolCall[]; toolResults: ToolExecutionResult[]; verified?: boolean; error?: string }> {
  const availableTools = tools.length ? tools : await loadCodingFleetTools();
  const puterTools = toPuterTools(availableTools);
  const toolMap = new Map(availableTools.map((t) => [toolName(t), t]));

  const toolResults: ToolExecutionResult[] = [];
  const messages: Array<Record<string, unknown>> = [{ role: "user", content: prompt }];
  let finalText = "";
  let lastCalls: ToolCall[] = [];
  let winner: { completer: ModelCompleter; model: string; token: string; provider: "puter" | "openrouter" } | null = null;
  let recoveryUsed = false;

  const isVerified = () =>
    toolResults.some((t) => t.ok && /web_check|web_browse|web_search|sandbox_|wait_for_workflow|actions|builder_publish/i.test(t.name));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let completion: CompletionResult;
    if (!winner) {
      // First contact = gateway discovery: Puter (PRIMARY) → OpenRouter (LAST-RESORT fallback).
      const gateway = await runModelGateway({
        messages,
        tools: puterTools,
        requestedModel: models[0],
        puterToken: authToken,
        onAttempt: (label) => onActivity?.([`gateway: ${label}`]),
      });
      if (!gateway.ok) {
        return { ok: false, text: finalText || "", model: undefined, provider: undefined, toolCalls: lastCalls, toolResults, verified: isVerified(), error: gateway.error };
      }
      winner = {
        completer: gateway.result.provider === "puter" ? createPuterCompleter() : createOpenRouterCompleter(),
        model: gateway.result.model,
        token: gateway.attempt.token,
        provider: gateway.result.provider,
      };
      completion = gateway.result;
    } else {
      try {
        completion = await winner.completer({ model: winner.model, messages, tools: puterTools, token: winner.token });
      } catch (e) {
        const err =
          e instanceof Error
            ? e.message
            : typeof e === "object" && e !== null
              ? JSON.stringify(e)
              : String(e);
        // Recovery is allowed once only, and only for a genuinely new failure.
        if (!recoveryUsed) {
          recoveryUsed = true;
          winner = null;
          onActivity?.([`model failed: ${err.slice(0, 180)} — ลอง gateway ใหม่ 1 ครั้ง`]);
          continue;
        }
        return { ok: false, text: finalText || "", model: winner.model, provider: winner.provider, toolCalls: lastCalls, toolResults, verified: isVerified(), error: err };
      }
    }

    const text = completion.text;
    const calls = completion.toolCalls as ToolCall[];
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
        const result = await executeTool(tool, call.arguments, authToken, githubToken, publishCtx);
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
    model: winner?.model,
    provider: winner?.provider,
    toolCalls: lastCalls,
    toolResults,
    verified: isVerified(),
  };
}

export { AUTH_GITHUB, isGithubAuthTool, isBuilderTool };