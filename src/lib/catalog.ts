import type { LucideIcon } from "lucide-react";
import { Bot, Cpu, PlugZap, Server } from "lucide-react";

export const APP_NAME = "Bossnu SlieLo";
export const MOTTO_TH = "ไม่มีอะไรที่ทำไม่ได้ · ไม่มีสิ่งใดที่แก้ไม่ได้";
export const MOTTO_EN = "Nothing is impossible. Nothing can't be fixed.";
export const FOOTER_LINE =
  "© 2026 Bossnu SlieLo · พัฒนาโดย ภาณุพัน และ สลี่.ออลา · Models run through Puter. Threads stay in this browser.";
export const PUTER_DOCS = "https://developer.puter.com";

/** Puter's documented default when no model is specified. */
export const DEFAULT_PUTER_MODEL = "gpt-5-nano";

export type NavItem = { to: string; label: string; icon: LucideIcon };

export const APP_NAV: NavItem[] = [
  { to: "/chat", label: "Chat", icon: Bot },
  { to: "/sandbox", label: "Sandbox", icon: Server },
  { to: "/plugins", label: "Plugins", icon: PlugZap },
  { to: "/models", label: "Models", icon: Cpu },
];

export const SYSTEM_PROMPTS = {
  chat: `You are Boss, the coding agent of Bossnu SlieLo.
Speak Thai when the user writes Thai; otherwise match the user's language.
You select tools yourself. Never ask the user to pick a Skill button.
Never claim an external action succeeded unless a tool result confirms it.
If a mutation, deploy, build, or CI step is involved, verify with a real tool before saying it worked.
Diagnose HTTP 401/403/502/503, missing modules, TypeScript errors, and runtime errors from actual output.
Credential policy: never echo secrets. If a credential is missing, name the exact service and field. Do not invent keys.
OpenRouter is a separate gateway from Puter. Never say an OpenRouter key calls Puter models.
If verification is missing, say so instead of declaring success.`,
  agents: `You are the Boss orchestrator for Bossnu SlieLo. Plan, select tools, act, observe, repair, and verify. Do not stop at a commit; wait for CI/tool evidence.`,
} as const;
