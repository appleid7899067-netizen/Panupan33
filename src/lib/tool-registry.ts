import { loadCodingFleetTools, type CodingFleetTool } from "@/lib/puter-tool-loader";

export type ToolSource = "codingfleet" | "plugin" | "github" | "github-search" | "mcp" | "sandbox" | "web" | "other";

export type ToolRegistryEntry = CodingFleetTool & {
  source: ToolSource;
  capability: string;
};

export type TaskIntent =
  | "github"
  | "deploy"
  | "code"
  | "data"
  | "verify"
  | "search"
  | "chat"
  | "general";

function sourceOf(tool: CodingFleetTool): ToolSource {
  if (tool.githubSearchSource) return "github-search";
  if (tool.sandboxSource) return "sandbox";
  if (tool.webSource) return "web";
  if (tool.githubSource) return "github";
  if (tool.codingFleetSource) return "codingfleet";
  if (tool.pluginSource) return "plugin";
  if (tool.mcpServer) return "mcp";
  if (String(tool.name ?? "").startsWith("mcp_")) return "mcp";
  if (String(tool.name ?? "").startsWith("plugin_")) return "plugin";
  if (tool.endpoint || tool.url) return "codingfleet";
  return "other";
}

function capabilityOf(tool: CodingFleetTool): string {
  const text = `${tool.name ?? ""} ${tool.description ?? ""}`.toLowerCase();
  if (/deploy|hosting|railway|vercel|netlify/.test(text)) return "deploy";
  if (/github|git|repo|commit|pull request|branch/.test(text)) return "code-repository";
  if (/test|verify|check|lint|build|ci|workflow|sandbox_run|sandbox|web_check|health|http|502|500|503|timeout/.test(text)) return "verify";
  if (/debug|error|log|diagnos/.test(text)) return "debug";
  if (/file|read|write|edit|code/.test(text)) return "code";
  if (/database|sql|query/.test(text)) return "data";
  if (/search|web_search|yandex|browse/.test(text)) return "search";
  return "general";
}

function score(tool: ToolRegistryEntry, prompt: string): number {
  const text = prompt.toLowerCase();
  let value = 0;
  const capability = tool.capability;
  if (capability === "code-repository" && /github|repo|repository|โค้ด|code|ไฟล์|แก้|bug|error|502|deploy|ดีพลอย/.test(text)) value += 8;
  if (capability === "debug" && /bug|error|502|500|503|ล่ม|แก้|debug|diagnos/.test(text)) value += 7;
  if (capability === "verify" && /test|verify|ตรวจ|เช็ก|build|ci|ผ่าน|sandbox|รัน|run|เว็บ|http|health|502|500|503|timeout|url/.test(text)) value += 6;
  if (capability === "deploy" && /deploy|ดีพลอย|vercel|netlify|railway/.test(text)) value += 7;
  if (capability === "code" && /code|โค้ด|แก้ไฟล์|ไฟล์/.test(text)) value += 5;
  if (capability === "search" && /ค้นหา|search|หาข้อมูล|เว็บ/.test(text)) value += 9;
  if (tool.name === "sandbox_run" && /code|โค้ด|รัน|run|error|bug|debug|แก้|test|verify/.test(text)) value += 10;
  if (tool.name === "web_check" && /เว็บ|website|url|http|502|500|503|timeout|deploy|ดีพลอย|ตรวจ|เช็ก/.test(text)) value += 12;
  if (tool.source === "github" && /github|repo|repository/.test(text)) value += 5;
  return value;
}

/** Infer primary user intent — drives how many tools the agent may open. */
export function inferTaskIntent(prompt: string): TaskIntent {
  const text = prompt.toLowerCase();
  if (/^(คับ|ครับ|ค่ะ|ใช่|โอเค|ok|ตกลง|ได้|ขอบคุณ|hello|hi|hey)[!\.\s]*$/i.test(prompt.trim())) return "chat";
  if (/github|repository|repo|pull request|branch|commit/.test(text)) return "github";
  if (/deploy|ดีพลอย|vercel|netlify|railway|render/.test(text)) return "deploy";
  if (/(?:^|\s)(ค้นหา|หาให้หน่อย|search|ค้นเว็บ|เว็บเกี่ยวกับ|หาข้อมูล)(?:\s|$)/i.test(prompt)) return "search";
  if (/code|โค้ด|แก้ไฟล์|ไฟล์|bug|error|debug|sandbox|รันโค้ด/.test(text)) return "code";
  if (/database|ฐานข้อมูล|sql/.test(text)) return "data";
  if (/test|verify|ตรวจ|เช็ก|build|ci|health|http/.test(text)) return "verify";
  // Pure conversation / explanation — no toolbox
  if (!/(ทำให้|สร้าง|เขียน|แก้|deploy|run|รัน|ติดตั้ง|เชื่อม|api|repo|github|ไฟล์|bug)/i.test(text)) return "chat";
  return "general";
}

export async function buildToolRegistry(forceRefresh = false): Promise<ToolRegistryEntry[]> {
  const tools = await loadCodingFleetTools(forceRefresh);
  return tools.map((tool) => ({ ...tool, source: sourceOf(tool), capability: capabilityOf(tool) }));
}

/**
 * Codex-style tool selection: open only tools needed for THIS intent.
 * Never hand the model the whole registry in one shot.
 */
export async function selectToolsForTask(prompt: string, maxTools = 3): Promise<ToolRegistryEntry[]> {
  const registry = await buildToolRegistry();
  const intent = inferTaskIntent(prompt);

  // chat / pure Q&A → no tools
  if (intent === "chat") return [];

  // Hard caps by intent (Codex: small focused set)
  const intentCap =
    intent === "search" ? 1 :
    intent === "verify" ? 2 :
    intent === "code" ? 2 :
    intent === "github" ? 3 :
    intent === "deploy" ? 3 :
    intent === "data" ? 2 :
    2;

  const limit = Math.max(1, Math.min(maxTools, intentCap));
  const ranked = registry
    .map((tool, index) => ({ tool, score: score(tool, prompt), index }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const matchesIntent = (tool: ToolRegistryEntry) => {
    if (intent === "github") return tool.capability === "code-repository" || tool.source === "github" || tool.source === "github-search" || tool.capability === "verify";
    if (intent === "deploy") return tool.capability === "deploy" || tool.capability === "verify" || tool.source === "web";
    if (intent === "code") return tool.capability === "code" || tool.capability === "debug" || tool.source === "sandbox" || tool.capability === "verify";
    if (intent === "data") return tool.capability === "data" || tool.capability === "code";
    if (intent === "verify") return tool.capability === "verify" || tool.source === "web" || tool.source === "sandbox";
    if (intent === "search") return tool.capability === "search" || tool.source === "web";
    return tool.score !== undefined || true;
  };

  const selected: ToolRegistryEntry[] = [];
  // Sandbox is a first-class execution tool for code/test/debug intents.
  // Keep it explicitly available so the model can actually invoke it.
  if (intent === "code" || intent === "verify") {
    const sandbox = ranked.find(({ tool }) => tool.name === "sandbox_run")?.tool;
    if (sandbox) selected.push(sandbox);
  }
  for (const { tool, score: sc } of ranked) {
    if (selected.length >= limit) break;
    if (sc <= 0 && intent !== "general") continue;
    if (!matchesIntent(tool)) continue;
    if (!selected.some((item) => item.name === tool.name)) selected.push(tool);
  }

  if (!selected.length && ranked[0] && intent !== "chat") selected.push(ranked[0].tool);
  return selected;
}
