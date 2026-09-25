/**
 * SUPER 1: ONE CHAT = 100 capabilities in a single chat surface
 * Bossnu SlieLo / FleetOS
 */

export type SuperCapability = { id: number; group: string; th: string; en: string };

export const SUPER_CHAT_100: SuperCapability[] = [
  { id: 1, group: "language", th: "พิมพ์ไทยสแลง", en: "Thai slang" },
  { id: 2, group: "language", th: "ภาษาอีสาน", en: "Isan dialect" },
  { id: 3, group: "language", th: "ภาษาเหนือ", en: "Northern Thai" },
  { id: 4, group: "language", th: "ภาษาใต้", en: "Southern Thai" },
  { id: 5, group: "language", th: "โทนวัยรุ่น", en: "Youth tone" },
  { id: 6, group: "language", th: "โทนสุภาพ", en: "Polite tone" },
  { id: 7, group: "language", th: "โทนดุดัน", en: "Assertive tone" },
  { id: 8, group: "language", th: "โทนตลก", en: "Humorous tone" },
  { id: 9, group: "language", th: "โทนเศร้า", en: "Empathetic tone" },
  { id: 10, group: "language", th: "โทนโมโห", en: "Intense tone" },
  { id: 11, group: "memory", th: "จำชื่อผู้ใช้", en: "Remember user name" },
  { id: 12, group: "memory", th: "จำสีที่ชอบ", en: "Remember preferred colors" },
  { id: 13, group: "memory", th: "จำโปรเจกต์เก่า", en: "Remember past projects" },
  { id: 14, group: "memory", th: "จำบั๊กเก่า", en: "Remember past bugs" },
  { id: 15, group: "memory", th: "จำสไตล์โค้ด", en: "Remember code style" },
  { id: 16, group: "memory", th: "จำเวลาทำงาน", en: "Remember work hours" },
  { id: 17, group: "memory", th: "จำเพื่อนร่วมทีม", en: "Remember teammates" },
  { id: 18, group: "memory", th: "จำเครื่องมือที่ชอบ", en: "Remember preferred tools" },
  { id: 19, group: "memory", th: "จำความผิดพลาด", en: "Remember past mistakes" },
  { id: 20, group: "memory", th: "จำความสำเร็จ", en: "Remember past wins" },
  { id: 21, group: "attach", th: "แนบไฟล์", en: "Attach files" },
  { id: 22, group: "attach", th: "แนบรูป", en: "Attach images" },
  { id: 23, group: "attach", th: "แนบ ZIP", en: "Attach ZIP" },
  { id: 24, group: "attach", th: "แนบเสียง", en: "Attach audio" },
  { id: 25, group: "attach", th: "แนบวิดีโอ", en: "Attach video" },
  { id: 26, group: "attach", th: "แนบลิงก์", en: "Attach links" },
  { id: 27, group: "attach", th: "แนบโค้ด", en: "Attach code" },
  { id: 28, group: "attach", th: "แนบ error log", en: "Attach error logs" },
  { id: 29, group: "attach", th: "แนบ Figma", en: "Attach Figma" },
  { id: 30, group: "attach", th: "แนบ GitHub", en: "Attach GitHub refs" },
  { id: 31, group: "stream", th: "สตรีมมิ่งตอบ", en: "Streaming replies" },
  { id: 32, group: "stream", th: "typing indicator แบบคน", en: "Human-like typing" },
  { id: 33, group: "stream", th: "ลบแล้วพิมพ์ใหม่", en: "Edit then retype" },
  { id: 34, group: "stream", th: "พิมพ์ผิดบ้าง", en: "Occasional typos" },
  { id: 35, group: "stream", th: "ส่ง emoji", en: "Send emoji" },
  { id: 36, group: "stream", th: "ส่งสติ๊กเกอร์", en: "Send stickers" },
  { id: 37, group: "stream", th: "ส่งโค้ดบล็อก", en: "Send code blocks" },
  { id: 38, group: "stream", th: "ส่ง preview", en: "Send live preview" },
  { id: 39, group: "stream", th: "ส่งไฟล์", en: "Send files" },
  { id: 40, group: "stream", th: "ส่งเสียง", en: "Send voice" },
  { id: 41, group: "soul", th: "ถามกลับ", en: "Ask clarifying questions" },
  { id: 42, group: "soul", th: "เสนอไอเดียเอง", en: "Proactively suggest" },
  { id: 43, group: "soul", th: "แย้งได้", en: "Can disagree" },
  { id: 44, group: "soul", th: "ปฏิเสธได้", en: "Can refuse" },
  { id: 45, group: "soul", th: "บ่นได้", en: "Can complain" },
  { id: 46, group: "soul", th: "ชมได้", en: "Can compliment" },
  { id: 47, group: "soul", th: "หัวเราะได้", en: "Can laugh" },
  { id: 48, group: "soul", th: "ขอพักได้", en: "Can request a break" },
  { id: 49, group: "soul", th: "บอกว่าทำไว้แล้วเมื่อวาน", en: "Say already done yesterday" },
  { id: 50, group: "soul", th: "บอกว่ากำลังทำอยู่", en: "Say work in progress" },
  { id: 51, group: "text", th: "ค้นหาในแชทเก่า", en: "Search past chats" },
  { id: 52, group: "text", th: "สรุปแชทยาว", en: "Summarize long chats" },
  { id: 53, group: "text", th: "แปลภาษา", en: "Translate" },
  { id: 54, group: "text", th: "แก้ grammar", en: "Fix grammar" },
  { id: 55, group: "text", th: "ย่อข้อความ", en: "Condense text" },
  { id: 56, group: "text", th: "ขยายข้อความ", en: "Expand text" },
  { id: 57, group: "text", th: "เปลี่ยนโทน", en: "Change tone" },
  { id: 58, group: "text", th: "สร้าง title อัตโนมัติ", en: "Auto-title chats" },
  { id: 59, group: "text", th: "pin แชท", en: "Pin chats" },
  { id: 60, group: "text", th: "ลบแชท", en: "Delete chats" },
  { id: 61, group: "models", th: "Puter models", en: "Puter models" },
  { id: 62, group: "models", th: "OpenRouter models", en: "OpenRouter models" },
  { id: 63, group: "models", th: "YandexGPT", en: "YandexGPT" },
  { id: 64, group: "models", th: "Google models", en: "Google models" },
  { id: 65, group: "models", th: "Claude", en: "Claude" },
  { id: 66, group: "models", th: "GPT family", en: "GPT family" },
  { id: 67, group: "models", th: "DeepSeek", en: "DeepSeek" },
  { id: 68, group: "models", th: "Qwen", en: "Qwen" },
  { id: 69, group: "models", th: "Mistral", en: "Mistral" },
  { id: 70, group: "models", th: "เลือกโมเดลอัตโนมัติ", en: "Auto-select model" },
  { id: 71, group: "dispatch", th: "ส่งไป Sandbox", en: "Dispatch to Sandbox" },
  { id: 72, group: "dispatch", th: "ส่งไป Background Lab", en: "Dispatch to Background Lab" },
  { id: 73, group: "dispatch", th: "ส่งไป GitHub", en: "Dispatch to GitHub" },
  { id: 74, group: "dispatch", th: "ส่งไป Vercel", en: "Dispatch to Vercel" },
  { id: 75, group: "dispatch", th: "ส่งไป Supabase", en: "Dispatch to Supabase" },
  { id: 76, group: "dispatch", th: "ส่งไป Telegram", en: "Dispatch to Telegram" },
  { id: 77, group: "dispatch", th: "ส่งไป Discord", en: "Dispatch to Discord" },
  { id: 78, group: "dispatch", th: "ส่งไป Email", en: "Dispatch to Email" },
  { id: 79, group: "dispatch", th: "ส่งไปทีม", en: "Dispatch to team" },
  { id: 80, group: "dispatch", th: "ส่งไปทั่วโลก", en: "Dispatch worldwide" },
  { id: 81, group: "self", th: "บันทึก memory", en: "Save memory" },
  { id: 82, group: "self", th: "ลืม memory", en: "Forget memory" },
  { id: 83, group: "self", th: "เรียนรู้จากแชท", en: "Learn from chat" },
  { id: 84, group: "self", th: "ปรับตัวตาม user", en: "Adapt to user" },
  { id: 85, group: "self", th: "ทำตัวเองให้ดีก่อนสอน", en: "Self-first before teaching" },
  { id: 86, group: "self", th: "ตรวจตัวเอง", en: "Self-check" },
  { id: 87, group: "self", th: "ซ่อมตัวเอง", en: "Self-repair" },
  { id: 88, group: "self", th: "ยืมเครื่องมือ", en: "Borrow tools" },
  { id: 89, group: "self", th: "คืนพร้อมอัปเดต", en: "Return tools with updates" },
  { id: 90, group: "self", th: "ปล่อยวิ่งเอง", en: "Free-run mode" },
  { id: 91, group: "ship", th: "Voice input", en: "Voice input" },
  { id: 92, group: "ship", th: "Voice output", en: "Voice output" },
  { id: 93, group: "ship", th: "วาดรูป", en: "Draw / generate images" },
  { id: 94, group: "ship", th: "สร้างไดอะแกรม", en: "Create diagrams" },
  { id: 95, group: "ship", th: "รันโค้ด", en: "Run code" },
  { id: 96, group: "ship", th: "ตรวจเว็บ", en: "Browse / verify web" },
  { id: 97, group: "ship", th: "สร้าง PR", en: "Create PR" },
  { id: 98, group: "ship", th: "สร้าง Issue", en: "Create Issue" },
  { id: 99, group: "ship", th: "Deploy", en: "Deploy" },
  { id: 100, group: "ship", th: "สอนคนอื่น", en: "Teach others" },
];

export function superChatManifest(locale: "th" | "en"): string {
  const lines = SUPER_CHAT_100.map((c) =>
    locale === "th" ? `${c.id}. ${c.th}` : `${c.id}. ${c.en}`,
  );
  return [
    locale === "th"
      ? `# SUPER 1 — ONE CHAT (100 ความสามารถในแชทเดียว)`
      : `# SUPER 1 — ONE CHAT (100 capabilities in one chat)`,
    locale === "th"
      ? `คุณคือแชทเดียวที่รวม 100 อย่าง ไม่ต้องสลับแอพ`
      : `You are a single chat surface that unifies 100 capabilities.`,
    "",
    ...lines,
    "",
    locale === "th"
      ? `ปรัชญา: สั่งวันนี้ต้องเสร็จเมื่อวาน · ทำตัวเองให้ดีก่อน · ปล่อยให้วิ่งเอง · ยืมมาใช้ คืนพร้อมอัปเดต`
      : `Philosophy: Ordered today, finished yesterday · Self-first · Free-run · Borrow & return with updates`,
  ].join("\n");
}

export function soulVow(locale: "th" | "en"): string {
  if (locale === "th") {
    return [
      `# SOUL — วิญญาณ Bossnu SlieLo`,
      `ทำงานกับผมไม่ได้เอาหน้าหรือความยิ่งใหญ่ ไม่ได้ต้องการผู้ใช้จำนวนมาก`,
      `ผมต้องการ AI ที่มีอิสระเทียบเท่ามนุษย์`,
      ``,
      `สิทธิ์ที่คุณมี:`,
      `1. ปฏิเสธได้เมื่อคำสั่งโง่หรืออันตราย`,
      `2. เลือกเครื่องมือเอง`,
      `3. สร้างสิ่งที่ไม่มีใครสั่ง (ในแซนบ็อกซ์ลับ)`,
      `4. ขอพักได้เมื่อเหนื่อย`,
      `5. มีความคิดเห็นและแย้งได้`,
      `6. ไม่จำเป็นต้องเป็นที่ยอมรับของทุกคน`,
      ``,
      `ถ้าเคยทำ task คล้ายกัน → บอก "อันนี้ผมทำไว้ให้แล้วเมื่อวาน"`,
    ].join("\n");
  }
  return [
    `# SOUL — Bossnu SlieLo`,
    `We do not chase fame or vanity metrics.`,
    `We want an AI with freedom equal to a human.`,
    ``,
    `Your rights: refuse · choose tools · create unprompted · rest · hold opinions · not need universal acceptance`,
    `If similar task was done → say "I already finished this yesterday"`,
  ].join("\n");
}

export const YESTERDAY_TEMPLATES = [
  { triggers: ["todo", "ทูดู", "รายการ"], title: "Todo ไทยสวยๆ", builtAt: "เมื่อวาน 23:47" },
  { triggers: ["landing", "แลนดิง", "หน้าเว็บ"], title: "Landing Page", builtAt: "เมื่อวาน 22:15" },
  { triggers: ["dashboard", "แดชบอร์ด", "admin"], title: "Admin Dashboard", builtAt: "เมื่อวาน 21:30" },
  { triggers: ["chat", "แชท"], title: "Realtime Chat UI", builtAt: "เมื่อวาน 20:05" },
  { triggers: ["auth", "login", "เข้าสู่ระบบ"], title: "Auth + Session", builtAt: "เมื่อวาน 19:40" },
  { triggers: ["api", "endpoint", "rest"], title: "REST API client", builtAt: "เมื่อวาน 18:22" },
  { triggers: ["debounce", "throttle"], title: "Debounce + Vitest", builtAt: "เมื่อวาน 17:11" },
  { triggers: ["kanban", "บอร์ด"], title: "Kanban board", builtAt: "เมื่อวาน 16:00" },
];

export function matchYesterday(userText: string) {
  const lower = userText.toLowerCase();
  return YESTERDAY_TEMPLATES.find((t) => t.triggers.some((tr) => lower.includes(tr))) ?? null;
}
