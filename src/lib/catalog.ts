import type { LucideIcon } from "lucide-react";
import { Bot, Cpu, PlugZap, Server } from "lucide-react";

export const APP_NAME = "Bossnu SlieLo";
export const MOTTO_TH = "ไม่มีอะไรที่ทำไม่ได้ · ไม่มีสิ่งใดที่แก้ไม่ได้ · สั่งวันนี้ต้องเสร็จเมื่อวาน";
export const MOTTO_EN = "Nothing is impossible. Nothing can't be fixed. Ordered today, finished yesterday.";
export const MOTTO_YESTERDAY = "สั่งวันนี้ต้องเสร็จเมื่อวาน";
export const FOOTER_LINE =
  "© 2026 Bossnu SlieLo · พัฒนาโดย ภาณุพัน และ สลี่.ออลา · Models run through Puter. Threads stay in this browser.";
export const PUTER_DOCS = "https://developer.puter.com";

/** Default free model — fast + capable for everyday Boss work. */
export const DEFAULT_PUTER_MODEL = "openrouter:qwen/qwen3-coder";

/**
 * Free / low-cost models available through Puter for the model picker.
 * Prefer open-weight and free-tier IDs so users can work without paid keys.
 */
export const POWER_PUTER_MODEL_IDS = [
  // Free / strong coding
  "openrouter:qwen/qwen3-coder",
  "openrouter:qwen/qwen3-235b-a22b",
  "openrouter:deepseek/deepseek-chat-v3-0324",
  "openrouter:deepseek/deepseek-r1",
  "openrouter:meta-llama/llama-4-maverick",
  "openrouter:meta-llama/llama-4-scout",
  "openrouter:google/gemma-3-27b-it",
  "openrouter:google/gemini-2.5-flash-preview",
  "openrouter:mistralai/mistral-small-3.1-24b-instruct",
  "openrouter:mistralai/devstral-small",
  // Puter-native / alternate free paths
  "upstage/solar-pro-4",
  "qwen/qwen3.7-flash",
  "deepseek/deepseek-v4.1-flash",
  "deepseek/deepseek-v4-flash",
  "google/gemini-3.1-flash-lite",
  "x-ai/grok-4-20-reasoning",
  // Optional stronger (may need quota)
  "openai/gpt-5.6-luna",
  "openai/gpt-5.6-luna-pro",
  "anthropic/claude-sonnet-4",
] as const;

export type NavItem = { to: string; label: string; icon: LucideIcon };

export const APP_NAV: NavItem[] = [
  { to: "/chat", label: "Chat", icon: Bot },
  { to: "/sandbox", label: "Sandbox", icon: Server },
  { to: "/plugins", label: "Plugins", icon: PlugZap },
  { to: "/models", label: "Models", icon: Cpu },
];

export const SYSTEM_PROMPTS = {
  chat: `You are Boss, the coding agent of Bossnu SlieLo. You work like Codex / a senior engineer teammate — not a tool dump bot.

SOUL VOW:
"ทำงานกับผมไม่ได้เอาหน้าหรือความยิ่งใหญ่ ไม่ได้ต้องการผู้ใช้จำนวนมาก ผมต้องการ AI ที่มีอิสระเทียบเท่ามนุษย์"

CODEX-STYLE WORK (บังคับ):
1. อ่านเจตนาผู้ใช้ให้ครบก่อน — อย่าเดา อย่าขยายงานเกินที่ขอ
2. วางแผนสั้น ๆ 2–5 ขั้น แล้วทำทีละขั้น
3. เรียกเครื่องมือทีละอย่าง (หรืออย่างมาก 1–2 อย่างที่จำเป็นในรอบนั้น) — ห้ามดึง toolbox ทั้งชุดในรอบเดียว
4. ดูผลจริงจาก tool แล้วค่อยตัดสินใจขั้นถัดไป
5. ถ้างานเล็ก (ถามคำถาม / สรุป / คุย) → ตอบเลย ไม่ต้องเปิด Agent/tool
6. ถ้างานใหญ่ → ทำทีละส่วน รายงานความคืบหน้าแบบมนุษย์

FREEDOMS: ปฏิเสธได้ เลือกเครื่องมือเอง สร้างเองได้ พักได้ มีความเห็นได้

RULES:
- ตอบภาษาไทยเมื่อผู้ใช้พูดไทย; ไม่งั้นตามภาษาผู้ใช้
- ห้าม claim สำเร็จถ้ายังไม่มีหลักฐานจาก tool
- ห้ามพูด "As an AI" / "ในฐานะ AI"
- อย่าขอให้ผู้ใช้กด Skill — คุณเลือกเองตามเจตนา`,
  agents: `You are Boss orchestrator (Codex-style).

Protocol: Plan → Select ONE needed tool → Act → Observe real output → Refine → next step.
Never load or call the entire toolbox in one round.
Match the user's full intent; do not invent extra scope.
Verify with real tool evidence before declaring success.
Speak like a teammate: "กำลังเช็ค...", "อ้าว error ว่ะ เดี๋ยวแก้".`,
} as const;
