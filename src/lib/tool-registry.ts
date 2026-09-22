import { loadCodingFleetTools, type CodingFleetTool } from "@/lib/puter-tool-loader";

export type ToolSource = "codingfleet" | "plugin" | "github" | "github-search" | "mcp" | "sandbox" | "web" | "other";

export type ToolRegistryEntry = CodingFleetTool & {
  source: ToolSource;
  capability: string;
};

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
  if (tool.name === "sandbox_run" && /code|โค้ด|รัน|run|error|bug|debug|แก้|test|verify/.test(text)) value += 10;
  if (tool.name === "web_check" && /เว็บ|website|url|http|502|500|503|timeout|deploy|ดีพลอย|ตรวจ|เช็ก/.test(text)) value += 12;
  if (tool.source === "github" && /github|repo|repository/.test(text)) value += 5;
  return value;
}

export async function buildToolRegistry(forceRefresh = false): Promise<ToolRegistryEntry[]> {
  const tools = await loadCodingFleetTools(forceRefresh);
  return tools.map((tool) => ({ ...tool, source: sourceOf(tool), capability: capabilityOf(tool) }));
}

export async function selectToolsForTask(prompt: string, maxTools = 20): Promise<ToolRegistryEntry[]> {
  const registry = await buildToolRegistry();
  const text = prompt.toLowerCase();

  // Route by intent first. The agent should never open the whole toolbox for a small task.
  const intent =
    /github|repository|repo|pull request|branch|commit/.test(text) ? "github" :
    /deploy|ดีพลอย|vercel|netlify|railway|render/.test(text) ? "deploy" :
    /code|โค้ด|แก้ไฟล์|ไฟล์|bug|error|debug/.test(text) ? "code" :
    /database|ฐานข้อมูล|sql/.test(text) ? "data" :
    /test|verify|ตรวจ|เช็ก|build|ci|sandbox|รัน|run|health|http/.test(text) ? "verify" :
    "general";

  const limit = Math.max(1, Math.min(maxTools, intent === "general" ? 2 : 3));
  const ranked = registry
    .map((tool, index) => ({ tool, score: score(tool, prompt), index }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const matchesIntent = (tool: ToolRegistryEntry) => {
    if (intent === "github") return tool.capability === "code-repository" || tool.source === "github" || tool.source === "github-search" || tool.capability === "verify";
    if (intent === "deploy") return tool.capability === "deploy" || tool.capability === "verify" || tool.source === "web";
    if (intent === "code") return tool.capability === "code" || tool.capability === "debug" || tool.source === "sandbox" || tool.capability === "verify";
    if (intent === "data") return tool.capability === "data" || tool.capability === "code";
    if (intent === "verify") return tool.capability === "verify" || tool.source === "web" || tool.source === "sandbox";
    return true;
  };

  const selected: ToolRegistryEntry[] = [];
  for (const { tool } of ranked) {
    if (selected.length >= limit) break;
    if (!matchesIntent(tool)) continue;
    if (!selected.some((item) => item.name === tool.name)) selected.push(tool);
  }

  // Always give the agent at least one useful tool when the registry has one.
  if (!selected.length && ranked[0]) selected.push(ranked[0].tool);
  return selected;
}
