import { ensurePuter, extractText } from "@/lib/puter";
import { requestPluginPermission } from "@/lib/plugin-permission";
import { runInSandbox } from "@/lib/sandbox";
import { executeAuthenticatedGitHubTool } from "@/lib/github-tool-bridge";
import { executeGithubWithPat } from "@/lib/github-pat";
import { createRequire } from "node:module";

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
  [key: string]: unknown;
};

type ToolCall = { id?: string; name: string; arguments: Record<string, unknown> };
type PuterFunctionTool = { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } };

const TOOLS_URL = "https://www.codingfleet.com/api/tools";
const PLUGINS_URL = "https://bosses690.vercel.app/plugins";
const GITHUB_API = "https://api.github.com";
const PUBLIC_MCP_SERVERS = ["https://api.keenable.ai/mcp"] as const;
const TOOL_LIMIT = 20;
const REGISTRY_CACHE_LIMIT = 80;
const MAX_TOOL_ROUNDS = 12;
const DEFAULT_MODELS = ["gpt-5.6-luna", "deepseek/deepseek-chat"] as const;
const CODINGFLEET_BASE = "https://www.codingfleet.com/api";
const AUTH_GITHUB = [
  "github_write_file",
  "github_create_branch",
  "github_create_pull_request",
  "github_create_issue",
  "github_actions",
  "github_dispatch_workflow",
  "github_wait_for_workflow",
];
let cachedTools: CodingFleetTool[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function normalizeTools(value: unknown): CodingFleetTool[] {
  const raw = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? ((value as Record<string, unknown>).tools ?? (value as Record<string, unknown>).data ?? [])
      : [];
  return Array.isArray(raw) ? raw.filter((tool): tool is CodingFleetTool => !!tool && typeof tool === "object").slice(0, TOOL_LIMIT) : [];
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

function toolName(tool: CodingFleetTool) {
  return String(tool.name ?? tool.slug ?? tool.id ?? "").trim();
}
function toolParameters(tool: CodingFleetTool): Record<string, unknown> {
  const value = tool.input_schema ?? tool.inputSchema ?? tool.parameters;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { type: "object", properties: {} };
}

function normalizePluginEntries(value: unknown): CodingFleetTool[] {
  const raw = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? ((value as Record<string, unknown>).plugins ?? (value as Record<string, unknown>).data ?? [])
      : [];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const plugin = entry as Record<string, unknown>;
    const name = String(plugin.name ?? plugin.slug ?? plugin.id ?? "").trim();
    const endpoint = plugin.endpoint ?? plugin.api ?? plugin.invokeUrl ?? plugin.url;
    if (!name || typeof endpoint !== "string" || !endpoint.trim()) return [];
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
    return [
      {
        name: `plugin_${safeName}`,
        description: String(plugin.description ?? `Plugin: ${name}`),
        inputSchema: plugin.input_schema ?? plugin.inputSchema ?? plugin.parameters ?? { type: "object", properties: {} },
        endpoint,
        method: plugin.method,
        pluginSource: PLUGINS_URL,
        pluginName: name,
      },
    ];
  });
}

async function loadPluginTools(): Promise<CodingFleetTool[]> {
  const response = await fetch(PLUGINS_URL, { method: "GET", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Plugin catalog unavailable: HTTP ${response.status}`);
  return normalizePluginEntries(await response.json());
}

function nativePuterTools(): CodingFleetTool[] {
  const text = { type: "string", maxLength: 500000 };
  const path = { type: "string", minLength: 1, maxLength: 2000 };
  return [
    {
      name: "puter_fs_read",
      description: "Read a real text file from the signed-in user's Puter filesystem. Use for workspace/context inspection.",
      inputSchema: { type: "object", properties: { path }, required: ["path"], additionalProperties: false },
      mcpServer: "puter://native",
    },
    {
      name: "puter_fs_write",
      description: "Write or replace a real text file in the signed-in user's Puter filesystem. Use only when the task explicitly requires a file mutation.",
      inputSchema: { type: "object", properties: { path, content: text }, required: ["path", "content"], additionalProperties: false },
      mcpServer: "puter://native",
    },
    {
      name: "puter_fs_list",
      description: "List real files/directories in the signed-in user's Puter filesystem.",
      inputSchema: { type: "object", properties: { path }, required: ["path"], additionalProperties: false },
      mcpServer: "puter://native",
    },
    {
      name: "puter_kv_get",
      description: "Read persistent per-user Boss memory/state from Puter KV.",
      inputSchema: { type: "object", properties: { key: { type: "string", minLength: 1, maxLength: 500 } }, required: ["key"], additionalProperties: false },
      mcpServer: "puter://native",
    },
    {
      name: "puter_kv_set",
      description: "Persist Boss memory/state in the user's Puter KV store. Prefer compact structured JSON.",
      inputSchema: { type: "object", properties: { key: { type: "string", minLength: 1, maxLength: 500 }, value: {} }, required: ["key", "value"], additionalProperties: false },
      mcpServer: "puter://native",
    },
    {
      name: "puter_models",
      description: "Discover the current Puter AI model catalog. Use this when choosing a model, capability, provider, or low-cost option.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      mcpServer: "puter://native",
    },
    {
      name: "puter_hosting_list",
      description: "List websites currently hosted through the signed-in Puter account.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      mcpServer: "puter://native",
    },
    {
      name: "puter_hosting_create",
      description: "Publish a Puter filesystem directory as a real public website. Only use when the user explicitly asks to publish/deploy through Puter.",
      inputSchema: { type: "object", properties: { subdomain: { type: "string", minLength: 1, maxLength: 80 }, rootDir: path }, required: ["subdomain", "rootDir"], additionalProperties: false },
      mcpServer: "puter://native",
    },
  ];
}

function nativeSandboxTools(): CodingFleetTool[] {
  return [
    {
      name: "sandbox_run",
      description: "Run JavaScript/HTML/CSS in the in-browser sandbox and return stdout, stderr, logs, and runtime errors. Use this to reproduce errors and verify fixes.",
      sandboxSource: true,
      inputSchema: {
        type: "object",
        properties: {
          language: { type: "string", minLength: 1, maxLength: 40 },
          code: { type: "string", maxLength: 500000 },
          timeoutMs: { type: "integer", minimum: 100, maximum: 120000 },
        },
        required: ["language", "code"],
        additionalProperties: false,
      },
    },
  ];
}

function webUrlIsAllowed(rawUrl: string): URL {
  if (!/^https:\/\//i.test(rawUrl)) throw new Error("เว็บภายนอกต้องใช้ HTTPS");
  let target: URL;
  try { target = new URL(rawUrl); } catch { throw new Error("URL ไม่ถูกต้อง"); }
  if (target.username || target.password) throw new Error("ไม่อนุญาต URL ที่มี credentials");
  const hostname = target.hostname.toLowerCase().replace(/\.$/, "");
  const blocked = new Set(["localhost", "localhost.localdomain", "ip6-localhost", "metadata.google.internal"]);
  const parts = hostname.split(".").map(Number);
  const ipv4 = parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
  const private4 = ipv4 && (parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168));
  const private6 = hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd") || /^fe[89ab]/.test(hostname);
  if (blocked.has(hostname) || hostname.endsWith(".local") || private4 || private6) throw new Error("บล็อก private/local/metadata host เพื่อความปลอดภัย");
  return target;
}

function nativeWebTools(): CodingFleetTool[] {
  const url = { type: "string", minLength: 8, maxLength: 4096 };
  const timeoutMs = { type: "integer", minimum: 1000, maximum: 30000 };
  return [
    { name: "web_check", webSource: true, description: "ตรวจเว็บ HTTPS: status, final URL, response time และ body preview.", inputSchema: { type: "object", properties: { url, timeoutMs }, required: ["url"], additionalProperties: false } },
    { name: "web_open", webSource: true, description: "เปิด URL ภายนอกจริงและอ่านหน้าเว็บแบบลึก: title, text, links, scripts, metadata และ final URL.", inputSchema: { type: "object", properties: { url, timeoutMs }, required: ["url"], additionalProperties: false } },
    { name: "web_fetch", webSource: true, description: "ดึง URL ภายนอกโดยตรง เหมาะกับ HTML, JSON, text และ public API พร้อม headers/status.", inputSchema: { type: "object", properties: { url, timeoutMs }, required: ["url"], additionalProperties: false } },
    { name: "web_trace", webSource: true, description: "ไล่ redirect ของ URL ภายนอกทีละ hop พร้อม status, location และ final URL.", inputSchema: { type: "object", properties: { url, maxHops: { type: "integer", minimum: 1, maximum: 10 }, timeoutMs }, required: ["url"], additionalProperties: false } },
  ];
}

async function fetchExternal(url: string, timeoutMs = 15000, redirect: RequestRedirect = "follow"): Promise<{ response: Response; body: string; responseTimeMs: number }> {
  const target = webUrlIsAllowed(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(30000, Math.max(1000, timeoutMs)));
  const started = Date.now();
  try {
    const response = await fetch(target.toString(), {
      method: "GET",
      redirect,
      signal: controller.signal,
      headers: { Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.1", "User-Agent": "Bossnu-Codex-Web/1.0" },
    });
    return { response, body: await response.text(), responseTimeMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

async function executeWebCheck(args: Record<string, unknown>): Promise<unknown> {
  const rawUrl = String(args.url ?? "").trim();
  const { response, body, responseTimeMs } = await fetchExternal(rawUrl, Number(args.timeoutMs ?? 15000));
  return { ok: response.ok, status: response.status, statusText: response.statusText, finalUrl: response.url, responseTimeMs, contentType: response.headers.get("content-type"), contentLength: response.headers.get("content-length"), bodyPreview: body.slice(0, 2000) };
}

function decodeHtmlText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ").trim();
}

async function executeWebOpen(args: Record<string, unknown>): Promise<unknown> {
  const rawUrl = String(args.url ?? "").trim();
  const { response, body, responseTimeMs } = await fetchExternal(rawUrl, Number(args.timeoutMs ?? 15000));
  const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
  const links: Array<{ text: string; url: string }> = [];
  const seen = new Set<string>();
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of body.matchAll(linkPattern)) {
    try {
      const href = new URL(match[1], response.url);
      if (href.protocol !== "https:") continue;
      const hrefText = decodeHtmlText(match[2]).slice(0, 240);
      if (!hrefText || seen.has(href.toString())) continue;
      seen.add(href.toString());
      links.push({ text: hrefText, url: href.toString() });
      if (links.length >= 30) break;
    } catch { /* intentionally ignored */ }
  }
  const scripts = Array.from(body.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)).slice(0, 20).map((m) => {
    try { return new URL(m[1], response.url).toString(); } catch { return m[1]; }
  });
  return { ok: response.ok, status: response.status, finalUrl: response.url, responseTimeMs, contentType: response.headers.get("content-type"), title, text: decodeHtmlText(body).slice(0, 12000), links, scripts };
}

async function executeWebFetch(args: Record<string, unknown>): Promise<unknown> {
  const rawUrl = String(args.url ?? "").trim();
  const { response, body, responseTimeMs } = await fetchExternal(rawUrl, Number(args.timeoutMs ?? 15000));
  let data: unknown = body.slice(0, 30000);
  const contentType = response.headers.get("content-type") ?? "";
  if (/json/i.test(contentType)) {
    try { data = JSON.parse(body); } catch { /* intentionally ignored */ }
  }
  return { ok: response.ok, status: response.status, statusText: response.statusText, finalUrl: response.url, responseTimeMs, contentType, headers: Object.fromEntries(response.headers.entries()), data };
}

async function executeWebTrace(args: Record<string, unknown>): Promise<unknown> {
  let current = String(args.url ?? "").trim();
  const maxHops = Math.min(10, Math.max(1, Number(args.maxHops ?? 8)));
  const timeoutMs = Math.min(30000, Math.max(1000, Number(args.timeoutMs ?? 12000)));
  const hops: Array<Record<string, unknown>> = [];
  for (let i = 0; i < maxHops; i++) {
    const target = webUrlIsAllowed(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const started = Date.now();
      const response = await fetch(target.toString(), { method: "GET", redirect: "manual", signal: controller.signal, headers: { Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.1", "User-Agent": "Bossnu-Codex-Web/1.0" } });
      const location = response.headers.get("location");
      hops.push({ hop: i + 1, url: target.toString(), status: response.status, location, responseTimeMs: Date.now() - started });
      if (!location || response.status < 300 || response.status >= 400) return { ok: response.ok, finalUrl: target.toString(), hops };
      current = new URL(location, target).toString();
    } finally { clearTimeout(timer); }
  }
  return { ok: false, finalUrl: current, hops, error: "redirect limit exceeded" };
}
function nativeAuthenticatedGitHubTools(): CodingFleetTool[] {
  return [
    { name: "github_write_file", description: "Write/update a repository file. Creates a real Git commit.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, path: { type: "string" }, content: { type: "string" }, message: { type: "string" }, sha: { type: "string" }, branch: { type: "string" } }, required: ["owner", "repo", "path", "content", "message"], additionalProperties: false }, githubSource: true },
    { name: "github_create_branch", description: "Create a Git branch.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, branch: { type: "string" }, from: { type: "string" } }, required: ["owner", "repo", "branch"], additionalProperties: false }, githubSource: true },
    { name: "github_create_pull_request", description: "Open a GitHub Pull Request.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, head: { type: "string" }, base: { type: "string" }, title: { type: "string" }, body: { type: "string" } }, required: ["owner", "repo", "head", "title"], additionalProperties: false }, githubSource: true },
    { name: "github_create_issue", description: "Create a GitHub issue.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, title: { type: "string" }, body: { type: "string" } }, required: ["owner", "repo", "title"], additionalProperties: false }, githubSource: true },
    { name: "github_actions", description: "Inspect recent GitHub Actions runs, including status, conclusion and commit SHA.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, branch: { type: "string" } }, required: ["owner", "repo"], additionalProperties: false }, githubSource: true },
    { name: "github_dispatch_workflow", description: "Dispatch a GitHub Actions workflow.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, workflow: { type: "string" }, branch: { type: "string" } }, required: ["owner", "repo", "workflow"], additionalProperties: false }, githubSource: true },
    { name: "github_wait_for_workflow", description: "Wait for a GitHub Actions run and return verified completion.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, runId: { type: "integer" }, timeoutMs: { type: "integer" }, pollMs: { type: "integer" } }, required: ["owner", "repo", "runId"], additionalProperties: false }, githubSource: true },
  ];
}

function nativeGitSearchTools(): CodingFleetTool[] {
  const search = (name: string, description: string): CodingFleetTool => ({
    name,
    description,
    inputSchema: { type: "object", properties: { q: { type: "string", minLength: 1, maxLength: 256 }, per_page: { type: "integer", minimum: 1, maximum: 20 } }, required: ["q"], additionalProperties: false },
    githubSearchSource: true,
    githubSource: true,
  });
  return [
    search("github_search_repositories", "Search GitHub repositories."),
    search("github_search_code", "Search source code on GitHub."),
    search("github_search_commits", "Search commits."),
    search("github_search_issues", "Search issues."),
    search("github_search_prs", "Search Pull Requests. Use is:pr in the query."),
  ];
}

function nativeGitHubTools(): CodingFleetTool[] {
  return [
    { name: "github_get_repo", description: "Read public GitHub repository metadata.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" } }, required: ["owner", "repo"], additionalProperties: false }, githubSource: true },
    { name: "github_get_file", description: "Read a file from a public GitHub repository.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, path: { type: "string" }, ref: { type: "string" } }, required: ["owner", "repo", "path"], additionalProperties: false }, githubSource: true },    { name: "github_list_dir", description: "List real files and directories from a GitHub repository path.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, path: { type: "string" }, ref: { type: "string" } }, required: ["owner", "repo"], additionalProperties: false }, githubSource: true },
    { name: "github_list_commits", description: "Read recent commits from a public GitHub repository.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, per_page: { type: "integer", minimum: 1, maximum: 20 } }, required: ["owner", "repo"], additionalProperties: false }, githubSource: true },
  ];
}

async function executeSandboxTool(args: Record<string, unknown>): Promise<unknown> {
  const language = String(args.language ?? "").trim();
  const code = String(args.code ?? "");
  if (!language || !code) throw new Error("sandbox_run requires language and code.");
  const timeoutMs = args.timeoutMs === undefined ? undefined : Number(args.timeoutMs);
  return runInSandbox({ language, code, ...(timeoutMs === undefined ? {} : { timeoutMs }) });
}

async function executeGitHubTool(tool: CodingFleetTool, args: Record<string, unknown>): Promise<unknown> {
  const owner = String(args.owner ?? "").trim();
  const repo = String(args.repo ?? "").trim();
  const name = toolName(tool);
  if (name.startsWith("github_search_")) {
    const kind = name.replace("github_search_", "");
    const endpoint =
      kind === "repositories"
        ? "/search/repositories"
        : kind === "code"
          ? "/search/code"
          : kind === "commits"
            ? "/search/commits"
            : "/search/issues";
    const query = String(args.q ?? "").trim();
    if (!query) throw new Error("GitHub search query is required.");
    const q = kind === "prs" && !/\bis:pr\b/i.test(query) ? `${query} is:pr` : query;
    const path = `${endpoint}?q=${encodeURIComponent(q)}&per_page=${Math.min(20, Math.max(1, Number(args.per_page ?? 10)))}`;
    const response = await fetch(`${GITHUB_API}${path}`, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } });
    const text = await response.text();
    if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}: ${text.slice(0, 240)}`);
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  if (!owner || !repo) throw new Error("GitHub requires owner and repo.");
  let path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  if (name === "github_list_dir") {
    path += "/contents";
    const directoryPath = String(args.path ?? "").replace(/^\/+/, "");
    if (directoryPath) path += "/" + directoryPath.split("/").map(encodeURIComponent).join("/");
    if (args.ref) path += "?ref=" + encodeURIComponent(String(args.ref));
  } else if (name === "github_get_file") {
    const filePath = String(args.path ?? "").replace(/^\/+/, "");
    if (!filePath) throw new Error("GitHub file path is required.");
    path += `/contents/${filePath.split("/").map(encodeURIComponent).join("/")}`;
    if (args.ref) path += `?ref=${encodeURIComponent(String(args.ref))}`;
  } else if (name === "github_list_commits") {
    path += `/commits?per_page=${Math.min(20, Math.max(1, Number(args.per_page ?? 10)))}`;
  }
  const response = await fetch(`${GITHUB_API}${path}`, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } });
  const text = await response.text();
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}: ${text.slice(0, 240)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function loadPublicMcpTools(): Promise<CodingFleetTool[]> {
  const loaded: CodingFleetTool[] = [];
  for (const server of PUBLIC_MCP_SERVERS) {
    try {
      const init = await fetch(server, {
        method: "POST",
        headers: { Accept: "application/json, text/event-stream", "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "Bossnu-CodingFleet", version: "1.0.0" } } }),
      });
      if (!init.ok) continue;
      const sessionId = init.headers.get("mcp-session-id");
      const list = await fetch(server, {
        method: "POST",
        headers: { Accept: "application/json, text/event-stream", "Content-Type": "application/json", ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}) },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
      });
      if (!list.ok) continue;
      const payload = await readJsonRpcResponse(list);
      const tools = (payload.result as Record<string, unknown> | undefined)?.tools;
      if (!Array.isArray(tools)) continue;
      for (const raw of tools) {
        if (!raw || typeof raw !== "object") continue;
        const t = raw as Record<string, unknown>;
        const name = String(t.name ?? "").trim();
        if (!name) continue;
        loaded.push({ name: `mcp_${name}`, description: String(t.description ?? `Public MCP tool: ${name}`), inputSchema: t.inputSchema ?? { type: "object", properties: {} }, mcpServer: server, mcpToolName: name });
      }
    } catch {
      /* skip unavailable MCP */
    }
  }
  return loaded;
}

async function readJsonRpcResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("data:")) {
    const line = trimmed.split("\n").find((x) => x.startsWith("data:"));
    if (line) return JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
  }
  return JSON.parse(trimmed) as Record<string, unknown>;
}

async function callPublicMcpTool(tool: CodingFleetTool, args: Record<string, unknown>): Promise<unknown> {
  const server = String(tool.mcpServer ?? "");
  const name = String(tool.mcpToolName ?? "");
  const init = await fetch(server, {
    method: "POST",
    headers: { Accept: "application/json, text/event-stream", "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "Bossnu-CodingFleet", version: "1.0.0" } } }),
  });
  if (!init.ok) throw new Error(`MCP initialize failed: HTTP ${init.status}`);
  const sid = init.headers.get("mcp-session-id");
  const response = await fetch(server, {
    method: "POST",
    headers: { Accept: "application/json, text/event-stream", "Content-Type": "application/json", ...(sid ? { "Mcp-Session-Id": sid } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: args } }),
  });
  if (!response.ok) throw new Error(`MCP tool ${name} failed: HTTP ${response.status}`);
  const payload = await readJsonRpcResponse(response);
  if (payload.error) throw new Error(JSON.stringify(payload.error));
  return payload.result ?? payload;
}

export async function loadCodingFleetTools(forceRefresh = false): Promise<CodingFleetTool[]> {
  if (!forceRefresh && cachedTools && Date.now() - cachedAt < CACHE_TTL_MS) return cachedTools;
  const sources = await Promise.allSettled([
    fetch(TOOLS_URL, { headers: { Accept: "application/json" } }).then(async (r) => {
      if (!r.ok) throw new Error(`CodingFleet tools returned HTTP ${r.status}.`);
      return normalizeTools(await r.json());
    }),
    loadPluginTools(),
    loadPublicMcpTools(),
  ]);
  const codingFleet = sources[0].status === "fulfilled" ? sources[0].value : [];
  const pluginTools = sources[1].status === "fulfilled" ? sources[1].value : [];
  const mcpTools = sources[2].status === "fulfilled" ? sources[2].value : [];
  const nativeTools = [...nativePuterTools(), ...nativeSandboxTools(), ...nativeWebTools(), ...nativeAuthenticatedGitHubTools(), ...nativeGitSearchTools(), ...nativeGitHubTools()];
  const remoteTools = [
    ...codingFleet.map((tool) => ({ ...tool, codingFleetSource: true })),
    ...pluginTools,
    ...mcpTools,
  ];
  const tools = [...nativeTools, ...remoteTools].slice(0, REGISTRY_CACHE_LIMIT);
  if (tools.length > 0) {
    cachedTools = tools;
    cachedAt = Date.now();
    return tools;
  }
  if (cachedTools) return cachedTools;
  throw new Error("No callable tools are available.");
}

function toPuterTools(tools: CodingFleetTool[]): PuterFunctionTool[] {
  return tools
    .slice(0, TOOL_LIMIT)
    .map((tool) => {
      const name = toolName(tool);
      if (!name) return null;
      return { type: "function" as const, function: { name, description: String(tool.description ?? `Tool: ${name}`), parameters: toolParameters(tool) } };
    })
    .filter((tool): tool is PuterFunctionTool => tool !== null);
}
function toolSummary(tools: CodingFleetTool[]): string {
  return tools
    .slice(0, TOOL_LIMIT)
    .map((tool) => JSON.stringify({ name: toolName(tool), description: tool.description, input_schema: toolParameters(tool) }))
    .join("\n");
}
function extractToolCalls(value: unknown): ToolCall[] {
  const response = value as Record<string, unknown> | null;
  const message = response?.message as Record<string, unknown> | undefined;
  const raw = message?.tool_calls ?? response?.tool_calls ?? response?.toolCalls;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const call = item as Record<string, unknown>;
    const fn = call.function as Record<string, unknown> | undefined;
    const name = String(fn?.name ?? call.name ?? "").trim();
    return name ? [{ id: typeof call.id === "string" ? call.id : undefined, name, arguments: parseArguments(fn?.arguments ?? call.arguments ?? call.input) }] : [];
  });
}
function safeText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed && trimmed !== "[object Object]" && trimmed !== "undefined" && trimmed !== "null") return trimmed;
    return fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const joined = value.map((item) => safeText(item)).filter(Boolean).join("\n");
    return joined || fallback;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "reason", "content", "text"]) {
      const nested = safeText(record[key]);
      if (nested) return nested;
    }
    try {
      const serialized = JSON.stringify(value);
      return serialized && serialized !== "{}" ? serialized : fallback;
    } catch {
      return fallback;
    }
  }
  return String(value);
}
function assistantToolMessage(response: unknown): Record<string, unknown> | null {
  const message = (response as Record<string, unknown> | null)?.message;
  return message && typeof message === "object" ? (message as Record<string, unknown>) : null;
}
function resolveEndpoint(tool: CodingFleetTool): string | null {
  const candidate = tool.endpoint ?? tool.url;
  if (typeof candidate !== "string" || !candidate.trim()) return null;
  try {
    return new URL(candidate, `${CODINGFLEET_BASE}/`).toString();
  } catch {
    return null;
  }
}

async function executePluginTool(tool: CodingFleetTool, args: Record<string, unknown>): Promise<unknown> {
  const endpoint = resolveEndpoint(tool);
  if (!endpoint) throw new Error(`Plugin ${toolName(tool)} has no callable endpoint.`);
  const method = String(tool.method ?? "POST").toUpperCase();
  const permission = await requestPluginPermission({
    pluginName: String(tool.pluginName ?? toolName(tool)),
    toolName: toolName(tool),
    endpoint,
    method,
    args,
  });
  if (!permission.allowed) {
    throw new Error(`Plugin blocked: ${permission.reason}`);
  }
  const response = await fetch(endpoint, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...(method === "GET" || method === "HEAD" ? {} : { body: JSON.stringify({ arguments: args }) }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Plugin ${String(tool.pluginName ?? toolName(tool))} returned HTTP ${response.status}: ${text.slice(0, 240)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function executeAuthenticatedGithub(name: string, args: Record<string, unknown>, githubToken?: string): Promise<unknown> {
  try {
    return await executeAuthenticatedGitHubTool({ data: { toolName: name, args, ...(githubToken ? { githubToken } : {}) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Missing GITHUB_APP|environment variable|GitHub App/i.test(message)) {
      return executeGithubWithPat(name, args);
    }
    throw error;
  }
}

async function executeNativePuterTool(name: string, args: Record<string, unknown>, authToken?: string): Promise<unknown> {
  const token = authToken || process.env.PUTER_AUTH_TOKEN;
  if (!token) throw new Error("Puter session token is required. Sign in to Puter in the browser first.");
  const require = createRequire(import.meta.url);
  const { init } = require("@heyputer/puter.js/src/init.cjs") as { init: (token: string) => any };
  const puter = init(token);

  if (name === "puter_fs_read") {
    const item = await puter.fs.read(String(args.path));
    return { ok: true, path: String(args.path), content: await item.text() };
  }
  if (name === "puter_fs_write") {
    const item = await puter.fs.write(String(args.path), String(args.content ?? ""), { createMissingParents: true });
    return { ok: true, path: item?.path ?? String(args.path), size: item?.size };
  }
  if (name === "puter_fs_list") {
    const items = await puter.fs.readdir(String(args.path || "."));
    return { ok: true, items: Array.isArray(items) ? items.slice(0, 200) : items };
  }
  if (name === "puter_kv_get") {
    return { ok: true, key: String(args.key), value: await puter.kv.get(String(args.key)) };
  }
  if (name === "puter_kv_set") {
    const value = args.value;
    await puter.kv.set(String(args.key), value);
    return { ok: true, key: String(args.key), value };
  }
  if (name === "puter_models") {
    const models = await puter.ai.listModels();
    return { ok: true, models: Array.isArray(models) ? models.slice(0, 200) : models };
  }
  if (name === "puter_hosting_list") {
    return { ok: true, sites: await puter.hosting.list() };
  }
  if (name === "puter_hosting_create") {
    const site = await puter.hosting.create(String(args.subdomain), String(args.rootDir));
    return { ok: true, site };
  }
  throw new Error("Unknown native Puter tool: " + name);
}

async function executeTool(tool: CodingFleetTool, args: Record<string, unknown>, authToken?: string): Promise<unknown> {
  const name = toolName(tool);
  if (name.startsWith("puter_")) return executeNativePuterTool(name, args, authToken);
  if (name === "sandbox_run") return executeSandboxTool(args);
  if (name === "web_check") return executeWebCheck(args);
  if (name === "web_open") return executeWebOpen(args);
  if (name === "web_fetch") return executeWebFetch(args);
  if (name === "web_trace") return executeWebTrace(args);
  if (tool.githubSource && AUTH_GITHUB.includes(name)) return executeAuthenticatedGithub(name, args, githubToken);
  if (tool.githubSource) return executeGitHubTool(tool, args);
  if (tool.mcpServer) return callPublicMcpTool(tool, args);
  if (tool.pluginSource) return executePluginTool(tool, args);
  const endpoint = resolveEndpoint(tool);
  if (!endpoint) throw new Error(`Tool ${name} has no callable HTTPS endpoint.`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ tool: tool.slug ?? name, arguments: args }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Tool ${name} returned HTTP ${response.status}: ${text.slice(0, 240)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeAgentProviderMessages(messages: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  let systemPrefix = "";
  const normalized: Array<Record<string, unknown>> = [];
  for (const message of messages) {
    const role = String(message.role ?? "");
    const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content ?? "");
    if (role === "system") {
      systemPrefix = [systemPrefix, content].filter(Boolean).join("\n\n");
      continue;
    }
    if (role === "tool") {
      const toolName = String(message.name ?? message.tool_name ?? message.tool_call_id ?? "tool");
      normalized.push({
        role: "user",
        content: `[Tool result: ${toolName}]\n${content}`,
      });
      continue;
    }
    if (role === "user" && systemPrefix) {
      normalized.push({
        ...message,
        role: "user",
        content: `${systemPrefix}\n\n--- User request ---\n${content}`,
      });
      systemPrefix = "";
      continue;
    }
    if (role === "assistant" || role === "user") {
      normalized.push({ ...message, role });
    }
  }
  if (systemPrefix) normalized.unshift({ role: "user", content: systemPrefix });
  return normalized;
}

async function chatModel(messages: Array<Record<string, unknown>>, tools: CodingFleetTool[], model: string, authToken?: string): Promise<{ text: string; response: unknown; toolCalls: ToolCall[] }> {
  let puter: any;
  if (authToken || process.env.PUTER_AUTH_TOKEN) {
    const require = createRequire(import.meta.url);
    const { init } = require("@heyputer/puter.js/src/init.cjs") as { init: (token: string) => any };
    const token = authToken || process.env.PUTER_AUTH_TOKEN;
    if (!token) throw new Error("Puter auth token is missing.");
    puter = init(token);
  } else {
    puter = await ensurePuter();
    if (!puter.auth.isSignedIn()) await puter.auth.signIn();
  }
  const providerMessages = normalizeAgentProviderMessages(messages);
  const response = await puter.ai.chat(providerMessages, { model, tools: toPuterTools(tools), normalize: true, stream: false });
  return { text: extractText(response), response, toolCalls: extractToolCalls(response) };
}

function extractPublicHttpsUrl(value: unknown): string | null {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const match = text.match(/https:\/\/[^\s"'<>)\\]}>,]+/i);
  return match?.[0] ?? null;
}

export type ToolExecutionResult = { name: string; ok: boolean; result?: unknown; error?: string };

export async function callWithFallback(
  prompt: string,
  tools: CodingFleetTool[],
  models: readonly string[] = DEFAULT_MODELS,
  onActivity?: (activity: string[]) => void,
  authToken?: string,
  githubToken?: string,
): Promise<{ ok: true; text: string; model: string; toolCalls: ToolCall[]; toolResults: ToolExecutionResult[]; verified: boolean } | { ok: false; error: string }> {
  let lastError = "No model succeeded.";
  const modelQueue = Array.from(new Set([...models, ...DEFAULT_MODELS]));
  for (const model of modelQueue) {
    try {
      const availableTools = tools.slice(0, TOOL_LIMIT);
      const system = ["You are Bossnu SlieLo Agent. Use available tools when they materially improve the answer. Never claim an external action succeeded unless the tool returned success.", "Available tools:", toolSummary(availableTools)].join("\n");
      const toolResults: ToolExecutionResult[] = [];
      const messages: Array<Record<string, unknown>> = [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ];
      for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
        onActivity?.([round === 0 ? "🧠 กำลังวิเคราะห์งาน..." : `🔄 กำลังทำขั้นตอนถัดไป... (รอบ ${round + 1})`]);
        let result: Awaited<ReturnType<typeof chatModel>>;
        try {
          result = await chatModel(messages, availableTools, model, authToken);
        } catch (error) {
          const message = error instanceof Error ? error.message : safeText(error, "ไม่ทราบรายละเอียด");
          if (/server function info not found|function info not found/i.test(message)) {
            const nativeOnly = availableTools.filter((tool) => Boolean(tool.sandboxSource || tool.webSource || tool.githubSource));
            if (nativeOnly.length && nativeOnly.length < availableTools.length) {
              onActivity?.(["พบเครื่องมือภายนอกที่หมดอายุ กำลังสลับไปใช้เครื่องมือภายในที่เรียกได้จริง"]);
              availableTools.splice(0, availableTools.length, ...nativeOnly);
              result = await chatModel(messages, availableTools, model, authToken);
            } else {
              throw new Error("Puter ไม่พบข้อมูล server function ของเครื่องมือที่เรียก จึงหยุดการเรียกเครื่องมือนั้น");
            }
          } else {
            throw error;
          }
        }
        if (!result.toolCalls.length) {
          const mutationNames = new Set(["github_write_file", "github_create_branch", "github_create_pull_request", "github_create_issue", "github_dispatch_workflow"]);
          const mutationOccurred = toolResults.some((item) => mutationNames.has(item.name));
          const verificationRequested = mutationOccurred || /deploy|deployment|ดีพลอย|verify|verification|ตรวจ|เช็ก|test|build|ci|502|503|health|website|เว็บล่ม/i.test(prompt);
          const verified = !verificationRequested || toolResults.some((item) => {
            if (!item.ok) return false;
            const value = item.result as Record<string, unknown> | undefined;
            if (item.name === "web_check") return value?.ok === true && Number(value.status ?? 0) >= 200 && Number(value.status ?? 0) < 300;
            if (/wait_for_workflow|actions|workflow|build|deploy|check|status/i.test(item.name)) {
              return value?.verified === true || (value?.status === "completed" && value?.conclusion === "success") || value?.success === true;
            }
            if (item.name === "sandbox_run") return value?.ok === true && (value?.exitCode === undefined || value?.exitCode === 0);
            return false;
          });
          // Use one strong model for a coherent, faster final response instead of fan-out.
          // Tool execution stays single-threaded so mutations/deployments are never duplicated.
          const answerModel = DEFAULT_MODELS[0];
          onActivity?.([`🧠 กำลังสรุปผลด้วย ${answerModel}...`]);
          try {
            // Final-answer context must be provider-safe: only plain user/assistant text.
            // Do not forward assistant tool_calls or role:"tool" messages to the final call.
            const finalMessages = normalizeAgentProviderMessages(messages).map((message) => ({
              role: message.role === "assistant" ? "assistant" : "user",
              content: typeof message.content === "string" ? message.content : safeText(message.content),
            }));
            const answer = await chatModel(finalMessages, [], answerModel, authToken);
            return { ok: true, text: answer.text.trim() || result.text, model: answerModel, toolCalls: [], toolResults, verified };
          } catch {
            return { ok: true, text: result.text, model, toolCalls: [], toolResults, verified };
          }
        }
        const assistantMessage = assistantToolMessage(result.response);
        if (assistantMessage) messages.push(assistantMessage);
        for (const call of result.toolCalls) {
          const tool = availableTools.find((candidate) => toolName(candidate) === call.name);
          onActivity?.([tool ? `⚡ กำลังเรียก ${call.name}...` : `⚠️ ไม่พบเครื่องมือ ${call.name}`]);
          if (!tool) {
            const errorMessage = `Unknown tool: ${call.name}`;
            toolResults.push({ name: call.name, ok: false, error: errorMessage });
            onActivity?.([`ใช้เครื่องมือ: ${call.name}`, `Tool error: ${errorMessage}`]);
            messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ ok: false, error: errorMessage }) });
            continue;
          }
          try {
            const output = await executeTool(tool, call.arguments, authToken);
            toolResults.push({ name: call.name, ok: true, result: output });
            onActivity?.([`✓ ${call.name} เสร็จแล้ว`, `📡 กำลังอ่านผลลัพธ์และตรวจหลักฐาน...`]);
            messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ ok: true, result: output }) });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toolResults.push({ name: call.name, ok: false, error: errorMessage });
            onActivity?.([`✗ ${call.name} ล้มเหลว`, `🔧 กำลังวิเคราะห์ข้อผิดพลาด...`]);
            messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ ok: false, error: errorMessage }) });
          }
        }
        const shouldForceHealthCheck = /deploy|deployment|ดีพลอย|health|502|503|website|เว็บล่ม/i.test(prompt);
        const healthTool = availableTools.find((candidate) => toolName(candidate) === "web_check");
        const roundToolResults = toolResults.slice(-result.toolCalls.length);
        const roundHasHealthCheck = roundToolResults.some((item) => item.name === "web_check");
        if (shouldForceHealthCheck && healthTool && !roundHasHealthCheck) {
          const target = roundToolResults.filter((item) => item.ok).map((item) => extractPublicHttpsUrl(item.result)).find(Boolean) ?? extractPublicHttpsUrl(prompt);
          if (target) {
            try {
              const output = await executeTool(healthTool, { url: target }, authToken);
              toolResults.push({ name: "web_check", ok: true, result: output });
              onActivity?.([`ตรวจสุขภาพเว็บ: ${target}`, `Observe: web_check ${String((output as Record<string, unknown>)?.status ?? "")}`]);
              messages.push({ role: "tool", tool_call_id: `forced-web-check-${round}`, content: JSON.stringify({ ok: true, result: output }) });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              toolResults.push({ name: "web_check", ok: false, error: errorMessage });
              onActivity?.([`ตรวจสุขภาพเว็บ: ${target}`, `web_check: ${errorMessage.slice(0, 180)}`]);
              messages.push({ role: "tool", tool_call_id: `forced-web-check-${round}`, content: JSON.stringify({ ok: false, error: errorMessage }) });
            }
          }
        }
      }
      return { ok: false, error: `Agent reached the ${MAX_TOOL_ROUNDS}-round tool limit without producing a final answer.` };
    } catch (error) {
      lastError = safeText(error, `โมเดล ${model} ล้มเหลวโดยไม่มีรายละเอียดที่อ่านได้`);
      onActivity?.([`⚠️ โมเดล ${model} ล้มเหลว: ${lastError.slice(0, 300)}`, "🔁 กำลังสลับไปโมเดลสำรองอัตโนมัติ..."]);
    }
  }
  return { ok: false, error: lastError };
}
