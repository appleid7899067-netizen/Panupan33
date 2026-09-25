/**
 * Smart Tool Router
 * ตัดสินใจระดับ: "งานนี้ต้องใช้ GitHub + Sandbox แต่ไม่ต้องใช้ Web" โดยอัตโนมัติ
 */

import { AUTH_GITHUB_FULL } from "@/lib/github-tools-expand";
import {
  getToolRegistry,
  inferTaskIntent,
  getUrgencyProfile,
  type ToolRegistryEntry,
  type TaskIntent,
} from "@/lib/tool-registry";

export type CapabilityNeed = {
  github: boolean;
  sandbox: boolean;
  web: boolean;
  deploy: boolean;
  search: boolean;
  puter: boolean;
  ci: boolean;
  documents: boolean;
  mcp: boolean;
  plugins: boolean;
  builder: boolean;
  writing: boolean;
  maps: boolean;
  terminal: boolean;
};

export type RouterDecision = {
  intent: TaskIntent;
  needs: CapabilityNeed;
  reason: string;
  maxTools: number;
  selected: ToolRegistryEntry[];
  excludedSources: string[];
};

export function inferCapabilityNeeds(prompt: string): CapabilityNeed {
  const text = prompt.toLowerCase();
  return {
    github: /github|repo|repository|pull request|pr\b|branch|commit|ci|workflow|actions/.test(text),
    sandbox: /code|โค้ด|รัน|run|build|test|bug|error|debug|แก้|เขียน|สร้าง|sandbox|typecheck|lint|html|css|javascript|javascript|live preview|live html|เว็บเพจ/.test(text),
    web:
      /เว็บ|website|url|http|ตรวจ.*เว็บ|เช็ก.*ลิงก์|preview|health|502|503|deploy.*ตรวจ|web_check/.test(text) ||
      /https?:\/\//.test(text),
    deploy: /deploy|ดีพลอย|vercel|netlify|railway|render|publish|hosting|puter host/.test(text),
    search: /ค้นหา|search|หาข้อมูล|research|browse/.test(text),
    puter: /puter|ฟรี host|publish.*puter/.test(text),
    ci: /ci\b|github actions|workflow|pipeline/.test(text),
    documents: /pdf|เอกสาร|document|ไฟล์|csv|json|markdown|md\b|ข้อความในไฟล์/.test(text),
    mcp: /mcp|model context protocol|connector|เชื่อมต่อเครื่องมือ/.test(text),
    plugins: /plugin|ปลั๊กอิน|integration|แอปภายนอก/.test(text),
    builder: /สร้าง.*(?:เว็บ|แอป|หน้าเว็บ|html)|(?:เว็บ|แอป|หน้าเว็บ|html).*(?:สร้าง|ทำ|แก้|preview)|landing|website|web app|mobile app|html editor|html viewer|live html|live preview|builder|preview|พรีวิว/.test(text),
    writing: /เขียน(?:บทความ|บล็อก|อีเมล|โฆษณา|โพสต์|สคริปต์)|บทความ|blog|article|email|copywriting|โฆษณา|social media|rewrite|paraphrase|proofread|grammar|แปล|translate|สรุป/.test(text),
    maps: /แผนที่|map|maps|street view|streetview|satellite|ดาวเทียม|earth map|earthcam|live cam|webcam|360|gps|พิกัด|สถานที่|landmark|เส้นทาง|route|นำทาง|navigation|traffic|จราจร|nearby|ใกล้ฉัน/.test(text),
    terminal: /terminal|shell|command line|cli|คอนโซล|เทอร์มินัล|คำสั่ง|รันคำสั่ง|npm run|pnpm|yarn|bun|bash|powershell/.test(text),
  };
}

function reasonFor(needs: CapabilityNeed, intent: TaskIntent): string {
  const parts: string[] = [`intent=${intent}`];
  if (needs.github) parts.push("GitHub");
  if (needs.sandbox) parts.push("Sandbox");
  if (needs.web) parts.push("Web");
  if (needs.deploy) parts.push("Deploy");
  if (needs.search) parts.push("Search");
  if (needs.puter) parts.push("Puter");
  if (needs.ci) parts.push("CI");
  if (parts.length === 1) parts.push("chat-only (no tools)");
  return `งานนี้ต้องใช้: ${parts.join(" + ")}`;
}

function matchesNeeds(tool: ToolRegistryEntry, needs: CapabilityNeed): boolean {
  const cap = tool.capability;
  const src = tool.source;
  const name = String(tool.name ?? "").toLowerCase();

  if (needs.search && (cap === "search" || src === "web" || name.includes("search"))) return true;
  if (needs.github && (cap === "code-repository" || src === "github" || src === "github-search")) return true;
  if (needs.sandbox && (src === "sandbox" || name === "sandbox_run" || cap === "code" || cap === "debug")) return true;
  if (needs.web && (src === "web" || name.includes("web_") || cap === "verify")) return true;
  if (needs.deploy && (cap === "deploy" || name.includes("deploy") || name.includes("vercel") || name.includes("netlify")))
    return true;
  if (needs.ci && (name.includes("workflow") || name.includes("actions") || name.includes("ci"))) return true;
  if (needs.puter && name.includes("puter")) return true;
  if (needs.documents && (/pdf|document|file|parse|extract|csv|json/.test(name) || cap === "data")) return true;
  if (needs.mcp && (src === "mcp" || name.startsWith("mcp_"))) return true;
  if (needs.plugins && (src === "plugin" || name.startsWith("plugin_"))) return true;
  if (needs.builder && (name.startsWith("builder_") || cap === "builder" || cap === "deploy" || cap === "verify")) return true;
  if (needs.writing && /^(write_continue|rewrite_text|fix_grammar|change_tone|generate_reply|translate_text|summarize_text)$/.test(name)) return true;
  if (needs.maps && (src === "web" || name.includes("web_") || /map|location|gps|street|satellite|earth|camera|cam|weather|traffic|route|nearby|search/.test(name))) return true;
  if (needs.terminal && (src === "sandbox" || name === "terminal_execute" || name === "programming_lab" || name === "sandbox_run")) return true;

  if ((needs.sandbox || needs.deploy || needs.web) && cap === "verify") return true;

  return false;
}

export async function routeToolsForTask(prompt: string, maxTools = 12): Promise<RouterDecision> {
  const intent = inferTaskIntent(prompt);
  const needs = inferCapabilityNeeds(prompt);
  const urgency = getUrgencyProfile(prompt, intent);
  const reason = reasonFor(needs, intent);

  if (intent === "chat") {
    return {
      intent,
      needs,
      reason: "chat-only — ไม่เปิด tool",
      maxTools: 0,
      selected: [],
      excludedSources: ["github", "sandbox", "web", "mcp", "codingfleet"],
    };
  }

  const registry = await getToolRegistry();
  // GitHub work is a dedicated execution path. Do not starve the model of authenticated GitHub tools: when the user asks for GitHub, expose the full installed GitHub surface so read/write/branch/PR/Actions/search operations cannot disappear merely because the generic router budget is small.\n  const limit = intent === "github"\n    ? Math.min(AUTH_GITHUB_FULL.length, Math.max(maxTools, AUTH_GITHUB_FULL.length))\n    : intent === "search" ? 1 : Math.max(1, Math.min(maxTools, urgency.maxTools));

  const excludedSources: string[] = [];
  if (!needs.web && !needs.search && !needs.deploy) excludedSources.push("optional-web");
  if (!needs.github && !needs.ci) excludedSources.push("optional-github");
  if (!needs.mcp) excludedSources.push("optional-mcp");
  if (!needs.plugins) excludedSources.push("optional-plugin");

  const candidates = registry.filter((tool) => matchesNeeds(tool, needs));

  // Seed concrete tools first, then let ranking fill the remaining slots.
  const seedNames: string[] = [];\n  if (intent === "github") seedNames.push(...AUTH_GITHUB_FULL);
  if (needs.github) seedNames.push("github_get_repo", "github_get_file", "github_list_dir");
  if (needs.search) seedNames.push("web_search");
  if (needs.web) seedNames.push("web_check", "web_browse");
  if (needs.sandbox) seedNames.push("programming_lab", "sandbox_run");
  if (needs.deploy) seedNames.push("web_check");
  if (needs.ci) seedNames.push("github_actions", "github_get_workflow_runs");
    if (needs.documents) seedNames.push("document_extract", "file_read", "web_fetch");
  if (needs.mcp) seedNames.push("mcp_list_tools");
  if (needs.plugins) seedNames.push("plugin_list");
  if (needs.builder) seedNames.push("builder_read", "builder_write", "builder_edit", "builder_update_preview", "builder_publish_site", "web_check");
  if (needs.writing) seedNames.push("write_continue", "rewrite_text", "fix_grammar", "change_tone", "generate_reply", "translate_text", "summarize_text");
  if (needs.maps) seedNames.push("web_search", "web_browse", "web_fetch", "web_check");
  if (needs.terminal) seedNames.push("terminal_execute", "programming_lab", "sandbox_run");

  const priorityName = (name: string) => {
    const n = name.toLowerCase();
    if (n === "programming_lab") return 105;
    if (n === "sandbox_run") return 100;
    if (n === "web_check") return 90;
    if (n.includes("github") && n.includes("read")) return 80;
    if (n.includes("github") && (n.includes("write") || n.includes("update"))) return 75;
    if (n.includes("deploy")) return 70;
    return 10;
  };

  const ranked = candidates
    .map((tool, index) => ({
      tool,
      score: priorityName(String(tool.name ?? "")) + (tool.capability === "verify" ? 5 : 0),
      index,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const selected: ToolRegistryEntry[] = [];
  for (const name of seedNames) {
    const hit = ranked.find(({ tool }) => tool.name === name)?.tool;
    if (hit && !selected.some((s) => s.name === hit.name)) selected.push(hit);
    if (selected.length >= limit) break;
  }
  for (const { tool } of ranked) {
    if (selected.length >= limit) break;
    if (!selected.some((s) => s.name === tool.name)) selected.push(tool);
  }

  // `intent === "chat"` already returned above, so no chat guard is needed here.
  if (!selected.length) {
    const fallback = registry.filter((t) => t.name === "sandbox_run" || t.name === "web_check").slice(0, 2);
    selected.push(...fallback);
  }

  return {
    intent,
    needs,
    reason,
    maxTools: limit,
    selected,
    excludedSources,
  };
}

export function routerDecisionSummary(d: RouterDecision): string {
  const tools = d.selected.map((t) => t.name).join(", ") || "(none)";
  return `${d.reason}\nTools opened: ${tools}`;
}