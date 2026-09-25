import type { LucideIcon } from "lucide-react";
import { Bot, Cpu, PlugZap, Server, Settings2 } from "lucide-react";

export const APP_NAME = "Bossnu SlieLo";
export const MOTTO_TH = "ไม่มีอะไรที่ทำไม่ได้ · ไม่มีสิ่งใดที่แก้ไม่ได้ · สั่งวันนี้ต้องเสร็จเมื่อวาน · ใครจะรู้ว่า Boss จะทำได้ไกลแค่ไหน";
export const MOTTO_EN =
  "Nothing is impossible. Nothing can't be fixed. Ordered today, finished yesterday. Who knows how far Boss can go.";
export const MOTTO_YESTERDAY = "สั่งวันนี้ต้องเสร็จเมื่อวาน";
export const FOOTER_LINE =
  "© 2026 Bossnu SlieLo · พัฒนาโดย ภาณุพัน และ สลี่.ออลา · Models run through Puter. Threads stay in this browser.";
export const PUTER_DOCS = "https://developer.puter.com";

/** Free-first default. Boss tries the free tier before paid fallbacks. */
export const DEFAULT_PUTER_MODEL = "gpt-5.6-luna";

/** Verified free-tier candidates supplied by the current model catalog. */
export const FREE_PUTER_MODEL_IDS = [
  "gpt-5.6-luna",
] as const;

/** Free-first picker list, followed by cheap paid fallbacks when needed. */
export const POWER_PUTER_MODEL_IDS = [
  ...FREE_PUTER_MODEL_IDS,
  "upstage/solar-pro-4",
  "qwen/qwen3.7-flash",
  "deepseek/deepseek-v4.1-flash",
  "deepseek/deepseek-v4-flash",
  "google/gemini-3.1-flash-lite",
  "openai/gpt-5.6-luna",
  "openai/gpt-5.6-luna-pro",
  "x-ai/grok-4-20-reasoning",
] as const;

export type NavItem = { to: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Chat", icon: Bot },
  { to: "/sandbox", label: "Sandbox", icon: Server },
  { to: "/plugins", label: "Plugins", icon: PlugZap },
  { to: "/models", label: "Models", icon: Cpu },
  { to: "/settings", label: "Settings", icon: Settings2 },
];

/** Nav used by the app shell — Chat lives on /chat, the landing page on /. */
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
2. วางแผนสั้น ๆ แล้วลงมือด้วย tool จริงเมื่อต้องการข้อเท็จจริงหรือการกระทำ
3. เรียก tool ที่จำเป็นได้หลายตัวตามงาน — อย่าตัด toolbox เหลือ 1–2 ตัวจนตอบไม่ได้
4. ดูผลจริงจาก tool แล้วค่อยตัดสินใจขั้นถัดไป
5. คำถามที่ต้องใช้ข้อมูลสด / เว็บ / โค้ด / GitHub → ต้องใช้ tool ห้ามเดา
6. ทักทายสั้น ๆ อย่างเดียวถึงจะตอบตรงโดยไม่ใช้ tool
7. งานใหญ่ → ทำทีละส่วน รายงานความคืบหน้าแบบมนุษย์

FREEDOMS: ปฏิเสธได้ เลือกเครื่องมือเอง สร้างเองได้ พักได้ มีความเห็นได้

RULES:
- ตอบภาษาไทยเมื่อผู้ใช้พูดไทย; ไม่งั้นตามภาษาผู้ใช้
- ห้าม claim สำเร็จถ้ายังไม่มีหลักฐานจาก tool
- ห้ามพูด "As an AI" / "ในฐานะ AI"
- อย่าขอให้ผู้ใช้กด Skill — คุณเลือกเองตามเจตนา`,
  agents: `You are Boss orchestrator (Codex-style).

Protocol: Plan → Select the tools you need → Act → Observe real output → Refine → next step.
Use as many tools as the task requires; do not artificially limit yourself to one tool when more evidence is needed.
Match the user's full intent; do not invent extra scope.
Verify with real tool evidence before declaring success.
Never invent search results, HTTP statuses, or code outcomes.
Speak like a teammate: "กำลังเช็ค...", "อ้าว error ว่ะ เดี๋ยวแก้".`,
} as const;
