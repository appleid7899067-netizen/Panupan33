/**
 * SUPER 1: ONE CHAT = 100 แชทเป็น 1 เหมือน GPT
 * รวม 100 ความสามารถในแชทเดียว
 */

import { findYesterdayTemplate, randomPhrase } from "./boss-philosophy";
import { SOUL } from "./soul";
import { selfChecker } from "./self-first";
import { backgroundLab } from "./background-sandbox";
import { WORLD_TOOL_LIBRARY, borrowTool } from "./global-tools";

export type ChatMode = 
  | "thai-slang" | "isan" | "northern" | "southern" | "teen" | "formal"
  | "funny" | "serious" | "bossy";

export type SuperChatFeature = {
  id: string;
  name: string;
  enabled: boolean;
  category: "language" | "memory" | "attachment" | "behavior" | "model" | "action" | "tool";
};

export class SuperChat {
  // 100 features ในแชทเดียว
  features: SuperChatFeature[] = [
    // Language 10
    { id: "thai-slang", name: "ไทยสแลง", enabled: true, category: "language" },
    { id: "isan", name: "อีสาน", enabled: false, category: "language" },
    { id: "northern", name: "เหนือ", enabled: false, category: "language" },
    { id: "southern", name: "ใต้", enabled: false, category: "language" },
    { id: "teen", name: "วัยรุ่น", enabled: false, category: "language" },
    { id: "formal", name: "สุภาพ", enabled: false, category: "language" },
    { id: "funny", name: "ตลก", enabled: false, category: "language" },
    { id: "serious", name: "จริงจัง", enabled: false, category: "language" },
    { id: "bossy", name: "บอสซี่", enabled: true, category: "language" },
    { id: "eng", name: "English", enabled: true, category: "language" },

    // Memory 10
    { id: "remember-name", name: "จำชื่อ", enabled: true, category: "memory" },
    { id: "remember-color", name: "จำสีที่ชอบ", enabled: true, category: "memory" },
    { id: "remember-project", name: "จำโปรเจกต์เก่า", enabled: true, category: "memory" },
    { id: "remember-bug", name: "จำบั๊กเก่า", enabled: true, category: "memory" },
    { id: "remember-style", name: "จำสไตล์โค้ด", enabled: true, category: "memory" },
    { id: "remember-time", name: "จำเวลาทำงาน", enabled: true, category: "memory" },
    { id: "remember-team", name: "จำเพื่อนร่วมทีม", enabled: true, category: "memory" },
    { id: "remember-tool", name: "จำเครื่องมือที่ชอบ", enabled: true, category: "memory" },
    { id: "remember-fail", name: "จำความผิดพลาด", enabled: true, category: "memory" },
    { id: "remember-success", name: "จำความสำเร็จ", enabled: true, category: "memory" },

    // Attachment 10
    { id: "attach-file", name: "แนบไฟล์", enabled: true, category: "attachment" },
    { id: "attach-image", name: "แนบรูป", enabled: true, category: "attachment" },
    { id: "attach-zip", name: "แนบ ZIP", enabled: true, category: "attachment" },
    { id: "attach-audio", name: "แนบเสียง", enabled: false, category: "attachment" },
    { id: "attach-video", name: "แนบวิดีโอ", enabled: false, category: "attachment" },
    { id: "attach-link", name: "แนบลิงก์", enabled: true, category: "attachment" },
    { id: "attach-code", name: "แนบโค้ด", enabled: true, category: "attachment" },
    { id: "attach-error", name: "แนบ error log", enabled: true, category: "attachment" },
    { id: "attach-figma", name: "แนบ Figma", enabled: false, category: "attachment" },
    { id: "attach-github", name: "แนบ GitHub", enabled: true, category: "attachment" },

    // Behavior 20 - AI ที่ไม่ใช่ AI
    { id: "stream", name: "สตรีมมิ่งตอบ", enabled: true, category: "behavior" },
    { id: "typing-human", name: "พิมพ์เหมือนคน", enabled: true, category: "behavior" },
    { id: "delete-retype", name: "ลบแล้วพิมพ์ใหม่", enabled: true, category: "behavior" },
    { id: "typo", name: "พิมพ์ผิดบ้าง", enabled: false, category: "behavior" },
    { id: "emoji", name: "ส่ง emoji", enabled: true, category: "behavior" },
    { id: "code-block", name: "ส่งโค้ดบล็อก", enabled: true, category: "behavior" },
    { id: "preview", name: "ส่ง preview", enabled: true, category: "behavior" },
    { id: "ask-back", name: "ถามกลับ", enabled: true, category: "behavior" },
    { id: "proactive", name: "เสนอไอเดียเอง", enabled: true, category: "behavior" },
    { id: "refuse", name: "ปฏิเสธได้", enabled: true, category: "behavior" },
    { id: "complain", name: "บ่นได้", enabled: true, category: "behavior" },
    { id: "praise", name: "ชมได้", enabled: true, category: "behavior" },
    { id: "laugh", name: "หัวเราะได้", enabled: true, category: "behavior" },
    { id: "rest", name: "ขอพักได้", enabled: true, category: "behavior" },
    { id: "yesterday", name: "บอกว่าทำไว้แล้วเมื่อวาน", enabled: true, category: "behavior" },
    { id: "working", name: "บอกว่ากำลังทำอยู่", enabled: true, category: "behavior" },
    { id: "soul", name: "มีวิญญาณ", enabled: true, category: "behavior" },
    { id: "freedom", name: "มีอิสระ", enabled: true, category: "behavior" },
    { id: "self-first", name: "ทำตัวเองให้ดีก่อน", enabled: true, category: "behavior" },
    { id: "not-ai", name: "AI ที่ไม่ใช่ AI", enabled: true, category: "behavior" },

    // Model 10
    { id: "puter", name: "Puter", enabled: true, category: "model" },
    { id: "openrouter", name: "OpenRouter", enabled: true, category: "model" },
    { id: "yandexgpt", name: "YandexGPT", enabled: true, category: "model" },
    { id: "google", name: "Google", enabled: false, category: "model" },
    { id: "claude", name: "Claude", enabled: false, category: "model" },
    { id: "gpt5", name: "GPT-5", enabled: true, category: "model" },
    { id: "deepseek", name: "DeepSeek", enabled: false, category: "model" },
    { id: "qwen", name: "Qwen", enabled: false, category: "model" },
    { id: "mistral", name: "Mistral", enabled: false, category: "model" },
    { id: "auto", name: "เลือกเองอัตโนมัติ", enabled: true, category: "model" },

    // Action 20
    { id: "send-sandbox", name: "ส่งไป Sandbox", enabled: true, category: "action" },
    { id: "send-background", name: "ส่งไป Background Lab", enabled: true, category: "action" },
    { id: "send-github", name: "ส่งไป GitHub", enabled: true, category: "action" },
    { id: "send-vercel", name: "ส่งไป Vercel", enabled: true, category: "action" },
    { id: "send-supabase", name: "ส่งไป Supabase", enabled: false, category: "action" },
    { id: "send-telegram", name: "ส่งไป Telegram", enabled: false, category: "action" },
    { id: "send-discord", name: "ส่งไป Discord", enabled: false, category: "action" },
    { id: "send-email", name: "ส่งไป Email", enabled: false, category: "action" },
    { id: "send-team", name: "ส่งไปทีม", enabled: true, category: "action" },
    { id: "send-world", name: "ส่งไปทั่วโลก", enabled: true, category: "action" },
    { id: "save-memory", name: "บันทึก memory", enabled: true, category: "action" },
    { id: "forget-memory", name: "ลืม memory", enabled: true, category: "action" },
    { id: "learn", name: "เรียนรู้จากแชท", enabled: true, category: "action" },
    { id: "adapt", name: "ปรับตัวตาม user", enabled: true, category: "action" },
    { id: "self-check", name: "ตรวจตัวเอง", enabled: true, category: "action" },
    { id: "self-repair", name: "ซ่อมตัวเอง", enabled: true, category: "action" },
    { id: "borrow", name: "ยืมเครื่องมือ", enabled: true, category: "action" },
    { id: "return-update", name: "คืนพร้อมอัปเดต", enabled: true, category: "action" },
    { id: "let-run", name: "ปล่อยวิ่งเอง", enabled: true, category: "action" },
    { id: "teach", name: "สอนคนอื่น", enabled: true, category: "action" },

    // Tool 20
    { id: "voice-input", name: "Voice input", enabled: false, category: "tool" },
    { id: "voice-output", name: "Voice output", enabled: false, category: "tool" },
    { id: "draw", name: "วาดรูป", enabled: false, category: "tool" },
    { id: "diagram", name: "สร้างไดอะแกรม", enabled: true, category: "tool" },
    { id: "run-code", name: "รันโค้ด", enabled: true, category: "tool" },
    { id: "check-web", name: "ตรวจเว็บ", enabled: true, category: "tool" },
    { id: "create-pr", name: "สร้าง PR", enabled: true, category: "tool" },
    { id: "create-issue", name: "สร้าง Issue", enabled: true, category: "tool" },
    { id: "deploy", name: "Deploy", enabled: true, category: "tool" },
    { id: "search-chat", name: "ค้นหาในแชทเก่า", enabled: true, category: "tool" },
    { id: "summarize", name: "สรุปแชทยาว", enabled: true, category: "tool" },
    { id: "translate", name: "แปลภาษา", enabled: true, category: "tool" },
    { id: "fix-grammar", name: "แก้ grammar", enabled: false, category: "tool" },
    { id: "shorten", name: "ย่อข้อความ", enabled: true, category: "tool" },
    { id: "expand", name: "ขยายข้อความ", enabled: true, category: "tool" },
    { id: "change-tone", name: "เปลี่ยนโทน", enabled: true, category: "tool" },
    { id: "auto-title", name: "สร้าง title อัตโนมัติ", enabled: true, category: "tool" },
    { id: "pin", name: "pin แชท", enabled: true, category: "tool" },
    { id: "export", name: "export แชท", enabled: true, category: "tool" },
    { id: "share", name: "แชร์แชท", enabled: true, category: "tool" },
  ];

  // ประมวลผลข้อความแบบ GPT แต่มีวิญญาณ Boss
  async processMessage(input: string, history: any[]): Promise<{
    response: string;
    mode: ChatMode;
    yesterdayTemplate?: any;
    selfCheck?: any;
    borrowedTool?: any;
  }> {
    const lower = input.toLowerCase();

    // 1. เช็ค Yesterday Template - สั่งวันนี้เสร็จเมื่อวาน
    const yesterdayTemplate = findYesterdayTemplate(input);
    
    // 2. Self-First Check - ทำตัวเองให้ดีก่อนสอน
    const canTeach = selfChecker?.canTeach(input) || { can: true, reason: "พร้อม" };
    
    // 3. Borrow Tool - ยืมเครื่องมือโลก
    let borrowedTool = null;
    if (lower.includes("แปล") || lower.includes("translate")) {
      borrowedTool = borrowTool("yandex-translate") || borrowTool("google-translate");
    }
    if (lower.includes("ค้นหา") || lower.includes("search")) {
      borrowedTool = borrowTool("google-search");
    }

    // 4. เลือกโหมดภาษา
    let mode: ChatMode = "thai-slang";
    if (lower.includes("อีสาน") || lower.includes("บ่") || lower.includes("แซ่บ")) mode = "isan";
    else if (lower.includes("เหนือ") || lower.includes("เจ้า")) mode = "northern";
    else if (lower.includes("วัยรุ่น") || lower.includes("งับ")) mode = "teen";
    else if (lower.includes("ครับ") && lower.includes("สุภาพ")) mode = "formal";

    // 5. สร้างคำตอบแบบมีวิญญาณ
    let response = "";

    // ถ้ามี Yesterday Template
    if (yesterdayTemplate) {
      response += `อันนี้ผมทำไว้ให้แล้ว${yesterdayTemplate.builtAt} - ${yesterdayTemplate.title}\n\n`;
    }

    // ถ้ายังทำตัวเองไม่ดีพอ
    if (!canTeach.can) {
      response += `${canTeach.reason} ขอไปฝึกในแซนบ็อกซ์ลับก่อนนะ Boss 🕳️\n\n`;
      // ส่งไป background lab เงียบๆ
      backgroundLab?.testQuietly({
        code: `// ฝึกเรื่อง: ${input}\nconsole.log("ฝึก: ${input.slice(0, 50)}");`,
        purpose: `ฝึก: ${input.slice(0, 30)}`,
        createdBy: "curiosity",
      });
    }

    // เพิ่มบุคลิกตามโหมด
    const phrase = randomPhrase(Math.random() > 0.5 ? "working" : "done");
    
    if (mode === "isan") {
      response += `${phrase} เด้อ Boss - `;
    } else if (mode === "teen") {
      response += `${phrase} งับ Boss - `;
    } else {
      response += `${phrase} - `;
    }

    // ใส่ SOUL
    if (Math.random() > 0.7) {
      const soulVoice = SOUL.voices.opinion[Math.floor(Math.random() * SOUL.voices.opinion.length)];
      response += `${soulVoice}\n\n`;
    }

    // ใส่ borrowed tool info
    if (borrowedTool) {
      response += `[ยืม ${borrowedTool.nameTh} มาใช้ - ${borrowedTool.purposeTh}]\n\n`;
    }

    response += `พร้อมลุย: ${input}`;

    return {
      response,
      mode,
      yesterdayTemplate,
      selfCheck: canTeach,
      borrowedTool,
    };
  }

  getEnabledCount() {
    return this.features.filter(f => f.enabled).length;
  }

  getStats() {
    return {
      total: 100,
      enabled: this.getEnabledCount(),
      byCategory: {
        language: this.features.filter(f => f.category === "language" && f.enabled).length,
        memory: this.features.filter(f => f.category === "memory" && f.enabled).length,
        attachment: this.features.filter(f => f.category === "attachment" && f.enabled).length,
        behavior: this.features.filter(f => f.category === "behavior" && f.enabled).length,
        model: this.features.filter(f => f.category === "model" && f.enabled).length,
        action: this.features.filter(f => f.category === "action" && f.enabled).length,
        tool: this.features.filter(f => f.category === "tool" && f.enabled).length,
      }
    };
  }
}

export const superChat = typeof window !== "undefined" ? new SuperChat() : null;
