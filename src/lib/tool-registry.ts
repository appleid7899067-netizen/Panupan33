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

export type UrgencyProfile = {
  urgent: boolean;
  parallel: boolean;
  maxTools: number;
  maxRounds: number;
  directPath: boolean;
};

/** Keep the hot path responsive without starving the model of tools. */
export function getUrgencyProfile(prompt: string, intent?: TaskIntent): UrgencyProfile {
  const text = prompt.toLowerCase();
  const urgent = /ด่วน|เร่งด่วน|ทันที|เดี๋ยวนี้|โดยเร็ว|asap|urgent|immediately|right now|fix now/.test(text);
  const resolvedIntent = intent ?? inferTaskIntent(prompt);
  if (urgent) {
    return { urgent: true, parallel: resolvedIntent !== "chat", maxTools: resolvedIntent === "search" ? 4 : 8, maxRounds: resolvedIntent === "chat" ? 0 : 6, directPath: true };
  }
  return { urgent: false, parallel: resolvedIntent === "github" || resolvedIntent === "code" || resolvedIntent === "search", maxTools: resolvedIntent === "search" ? 8 : resolvedIntent === "verify" ? 10 : 16, maxRounds: resolvedIntent === "chat" ? 0 : 8, directPath: false };
}

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
  if (/search|web_search|browse|fetch/.test(text)) return "search";
  if (/debug|error|bug|diagnos/.test(text)) return "debug";
  if (/sql|database|data|kv|storage/.test(text)) return "data";
  if (/code|file|edit|write|run|sandbox/.test(text)) return "code";
  return "general";
}

export async function getToolRegistry(forceRefresh = false): Promise<ToolRegistryEntry[]> {
  const tools = await loadCodingFleetTools(forceRefresh);
  return tools.map((tool) => ({ ...tool, source: sourceOf(tool), capability: capabilityOf(tool) }));
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
  if (tool.name === "programming_lab" && /code|โค้ด|เขียน|สร้าง|รัน|run|error|bug|debug|แก้|test|verify|เรียน|ฝึก/.test(text)) value += 13;
  if (tool.name === "web_search" && /ค้น|search|หา|ข่าว|ข้อมูล|internet|เว็บ|ใคร|อะไร|เมื่อไหร่|where|what|who|when|latest|ราคา/.test(text)) value += 14;
  if (tool.name === "web_browse" && /https?:\/\/|เปิดหน้า|อ่านหน้า|browse/.test(text)) value += 12;
  if (String(tool.name ?? "").startsWith("builder_") && /สร้าง|เว็บ|แอป|landing|website|app|builder/.test(text)) value += 11;
  if (String(tool.name ?? "").startsWith("github_") && /github|repo|pr|commit|branch/.test(text)) value += 6;
  if (tool.name === "web_fetch" && /api|json|fetch|endpoint|ดึงข้อมูล|เรียก url/.test(text)) value += 15;
  if (tool.name === "web_check" && /เว็บ|website|url|http|502|500|503|timeout|deploy|ดีพลอย|ตรวจ|เช็ก|สถานะ/.test(text)) value += 12;
  if (tool.source === "github" && /github|repo|repository/.test(text)) value += 5;
  return value;
}

/** Infer primary user intent — only pure greetings are "chat". */
export function inferTaskIntent(prompt: string): TaskIntent {
  const text = prompt.toLowerCase();
  if (/^(คับ|ครับ|ค่ะ|ใช่|โอเค|ok|ตกลง|ได้|ขอบคุณ|hello|hi|hey|สวัสดี)[!.\s]*$/i.test(prompt.trim())) return "chat";
  if (/github|repository|repo|pull request|branch|commit/.test(text)) return "github";
  if (/deploy|ดีพลอย|vercel|netlify|railway|render/.test(text)) return "deploy";
  if (/(?:ค้นหา|หาให้|search|ค้นเว็บ|หาข้อมูล|web_search|internet)/i.test(prompt)) return "search";
  if (/code|โค้ด|แก้ไฟล์|ไฟล์|bug|error|debug|sandbox|รันโค้ด|python|sql|lua/.test(text)) return "code";
  if (/database|ฐานข้อมูล|sql/.test(text)) return "data";
  if (/test|verify|ตรวจ|เช็ก|build|ci|health|http/.test(text)) return "verify";
  if (/สร้าง|ทำ|เขียน|แก้|ติดตั้ง|เชื่อม|api|builder|เว็บ|แอป/.test(text)) return "general";
  if (/[?？]|อะไร|ใคร|ที่ไหน|เมื่อ|how |what |who |where |when |why |latest|ข่าว|ราคา/.test(text)) return "search";
  return "general";
}

export async function selectToolsForTask(prompt: string, maxTools = 24): Promise<ToolRegistryEntry[]> {
  const registry = await getToolRegistry();
  const intent = inferTaskIntent(prompt);

  if (intent === "chat") return [];

  const intentCap =
    intent === "search" ? 8 :
    intent === "verify" ? 10 :
    intent === "code" ? 16 :
    intent === "github" ? 24 :
    intent === "deploy" ? 12 :
    intent === "data" ? 10 :
    16;

  const urgency = getUrgencyProfile(prompt, intent);
  const limit = Math.max(6, Math.min(maxTools, intentCap, Math.max(urgency.maxTools, 8)));
  const ranked = registry
    .map((tool, index) => ({ tool, score: score(tool, prompt), index }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const matchesIntent = (tool: ToolRegistryEntry) => {
    if (intent === "github") return tool.capability === "code-repository" || tool.source === "github" || tool.source === "github-search" || tool.capability === "verify" || tool.source === "web";
    if (intent === "deploy") return tool.capability === "deploy" || tool.capability === "verify" || tool.source === "web";
    if (intent === "code") return tool.capability === "code" || tool.capability === "debug" || tool.source === "sandbox" || tool.capability === "verify" || tool.source === "web";
    if (intent === "data") return tool.capability === "data" || tool.capability === "code" || tool.source === "sandbox";
    if (intent === "verify") return tool.capability === "verify" || tool.source === "web" || tool.source === "sandbox";
    if (intent === "search") return tool.capability === "search" || tool.source === "web";
    return true;
  };

  const selected: ToolRegistryEntry[] = [];

  const seedNames: string[] = [];
  if (intent === "code" || intent === "verify") seedNames.push("programming_lab", "sandbox_run", "sandbox_languages");
  if (intent === "search" || intent === "general") seedNames.push("web_search", "web_browse", "web_check");
  if (intent === "github") seedNames.push("github_get_repo", "github_get_file", "github_list_dir");
  for (const name of seedNames) {
    const hit = ranked.find(({ tool }) => tool.name === name)?.tool;
    if (hit && !selected.some((s) => s.name === hit.name)) selected.push(hit);
  }

  if (urgency.urgent && selected.length === 0) {
    const urgentCandidate = ranked.find(({ tool, score: sc }) => sc > 0 && matchesIntent(tool));
    if (urgentCandidate) selected.push(urgentCandidate.tool);
  }

  for (const { tool, score: sc } of ranked) {
    if (selected.length >= limit) break;
    if (sc <= 0 && intent !== "general" && intent !== "search") continue;
    if (!matchesIntent(tool)) continue;
    if (!selected.some((item) => item.name === tool.name)) selected.push(tool);
  }

  if (!selected.length) {
    for (const name of ["web_search", "sandbox_run", "web_browse"]) {
      const hit = registry.find((t) => t.name === name);
      if (hit) selected.push(hit);
    }
    if (!selected.length && ranked[0]) selected.push(ranked[0].tool);
  }
  return selected;
}

export function prefersAuthenticatedGitHub(prompt: string): boolean {
  return /github|repo|pull request|commit|branch|workflow|actions/i.test(prompt);
}
