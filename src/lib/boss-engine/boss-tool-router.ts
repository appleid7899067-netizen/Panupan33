/**
 * Smart Tool Router
 * ตัดสินใจระดับ: "งานนี้ต้องใช้ GitHub + Sandbox แต่ไม่ต้องใช้ Web" โดยอัตโนมัติ
 */

import {
  buildToolRegistry,
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
    sandbox: /code|โค้ด|รัน|run|build|test|bug|error|debug|แก้|เขียน|สร้าง|sandbox|typecheck|lint/.test(text),
    web:
      /เว็บ|website|url|http|ตรวจ.*เว็บ|เช็ก.*ลิงก์|preview|health|502|503|deploy.*ตรวจ|web_check/.test(text) ||
      /https?:\/\//.test(text),
    deploy: /deploy|ดีพลอย|vercel|netlify|railway|render|publish|hosting|puter host/.test(text),
    search: /ค้นหา|search|หาข้อมูล|research|browse/.test(text),
    puter: /puter|ฟรี host|publish.*puter/.test(text),
    ci: /ci\b|github actions|workflow|pipeline/.test(text),
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

  if ((needs.sandbox || needs.deploy || needs.web) && cap === "verify") return true;

  return false;
}

export async function routeToolsForTask(prompt: string, maxTools = 4): Promise<RouterDecision> {
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

  const registry = await buildToolRegistry();
  const limit = Math.max(1, Math.min(maxTools, urgency.maxTools));

  const excludedSources: string[] = [];
  if (!needs.web && !needs.search && !needs.deploy) excludedSources.push("optional-web");
  if (!needs.github && !needs.ci) excludedSources.push("optional-github");

  const candidates = registry.filter((tool) => matchesNeeds(tool, needs));

  const priorityName = (name: string) => {
    const n = name.toLowerCase();
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
  for (const { tool } of ranked) {
    if (selected.length >= limit) break;
    if (!selected.some((s) => s.name === tool.name)) selected.push(tool);
  }

  if (!selected.length && intent !== "chat") {
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
