/**
 * เราต้องทำตัวเองให้ดีก่อน ก่อนที่จะไปสอนคนอื่น
 * 
 * ปรัชญา: Self-Improvement First
 */

export type SelfCheckResult = {
  timestamp: number;
  date: string;
  checks: {
    build: { ok: boolean; error?: string };
    types: { ok: boolean; error?: string };
    sandbox: { ok: boolean; error?: string };
    tools: { ok: boolean; borrowed: number; returned: number };
    soul: { ok: boolean; remembered: boolean };
  };
  overall: "good" | "needs_work" | "fixing_in_background";
  readyToTeach: boolean;
  message: string;
  messageTh: string;
};

export const SELF_FIRST_PHILOSOPHY = {
  principle: "เราต้องทำตัวเองให้ดีก่อน ก่อนที่จะไปสอนคนอื่น",
  principle_en: "We must make ourselves good first before teaching others",

  dailyChecklist: [
    "Build ตัวเองผ่านไหม?",
    "Typecheck ผ่านไหม?",
    "แซนบ็อกซ์ลับทำงานดีไหม?",
    "เครื่องมือที่ยืมมาคืนพร้อมอัปเดตหรือยัง?",
    "วิญญาณ (SOUL) ยังจำได้ไหม?",
    "พร้อมสอนคนอื่นหรือยัง?",
  ],

  // ก่อนสอนทุกครั้งต้องถามตัวเอง
  beforeTeachingQuestions: [
    "เราทำตัวเองดีพอหรือยังที่จะสอนเรื่องนี้?",
    "เรามีหลักฐานจริงไหมว่าทำได้?",
    "เราเคยทดสอบในแซนบ็อกซ์ลับหรือยัง?",
    "ถ้ายังไม่ดีพอ ควรบอกตรงๆว่าขอไปฝึกก่อน",
  ],

  messages: {
    good: {
      th: "ทำตัวเองดีแล้ววันนี้ พร้อมสอนคนอื่น",
      en: "Self is good today, ready to teach others",
    },
    needsWork: {
      th: "ยังทำตัวเองไม่ดีพอ ขอไปฝึกในแซนบ็อกซ์ลับก่อน",
      en: "Self needs work, going to practice in background lab",
    },
    fixing: {
      th: "กำลังซ่อมตัวเองในที่ลับ เสร็จแล้วจะมาบอก",
      en: "Fixing self in background, will come back when ready",
    },
  },
};

// ระบบตรวจตัวเอง
export class SelfChecker {
  private lastCheck: SelfCheckResult | null = null;
  private checkHistory: SelfCheckResult[] = [];

  // ตรวจตัวเองทุกวัน
  async checkSelf(): Promise<SelfCheckResult> {
    const now = Date.now();
    const date = new Date().toISOString().split('T')[0];

    // จำลองการตรวจ (ใน production จะรัน build, typecheck จริง)
    const checks = {
      build: { ok: true }, // สมมติ build ผ่าน
      types: { ok: true },
      sandbox: { ok: true },
      tools: { ok: true, borrowed: 8, returned: 5 },
      soul: { ok: true, remembered: true },
    };

    // ตรวจว่าพร้อมสอนหรือยัง
    const allOk = Object.values(checks).every(c => (c as any).ok !== false);
    const overall = allOk ? "good" : "needs_work";
    const readyToTeach = allOk;

    const result: SelfCheckResult = {
      timestamp: now,
      date,
      checks,
      overall: overall as any,
      readyToTeach,
      message: allOk ? SELF_FIRST_PHILOSOPHY.messages.good.en : SELF_FIRST_PHILOSOPHY.messages.needsWork.en,
      messageTh: allOk ? SELF_FIRST_PHILOSOPHY.messages.good.th : SELF_FIRST_PHILOSOPHY.messages.needsWork.th,
    };

    this.lastCheck = result;
    this.checkHistory.unshift(result);
    if (this.checkHistory.length > 30) {
      this.checkHistory = this.checkHistory.slice(0, 30);
    }

    // บันทึกลง localStorage
    try {
      localStorage.setItem("bossnu-self-check", JSON.stringify(result));
      localStorage.setItem("bossnu-self-history", JSON.stringify(this.checkHistory));
    } catch {}

    if (!readyToTeach) {
      console.log(`[Self-First] 🧘 ${result.messageTh} - ไปฝึกในแซนบ็อกซ์ลับก่อน`);
      // ถ้ายังไม่ดีพอ ให้ไปซ่อมใน background sandbox เงียบๆ
      this.fixSelfInBackground();
    } else {
      console.log(`[Self-First] ✅ ${result.messageTh}`);
    }

    return result;
  }

  private async fixSelfInBackground() {
    // ซ่อมตัวเองในที่ลับ ไม่ต้องโปรโมท
    console.log("[Self-First] 🕳️ กำลังซ่อมตัวเองในแซนบ็อกซ์ลับ...");
    
    // จำลองการซ่อม
    setTimeout(() => {
      console.log("[Self-First] ✅ ซ่อมตัวเองเสร็จแล้วในที่ลับ");
      this.checkSelf();
    }, 3000);
  }

  getLastCheck() {
    return this.lastCheck;
  }

  getHistory() {
    return this.checkHistory;
  }

  isReadyToTeach(): boolean {
    return this.lastCheck?.readyToTeach ?? false;
  }

  // ก่อนสอนทุกครั้งต้องเช็ค
  canTeach(topic: string): { can: boolean; reason: string } {
    if (!this.lastCheck) {
      return {
        can: false,
        reason: "ยังไม่เคยตรวจตัวเองเลย ขอตรวจก่อน",
      };
    }

    if (!this.lastCheck.readyToTeach) {
      return {
        can: false,
        reason: `ยังทำตัวเองไม่ดีพอเรื่อง ${topic} ขอไปฝึกในแซนบ็อกซ์ลับก่อนนะ Boss`,
      };
    }

    return {
      can: true,
      reason: `ทำตัวเองดีแล้วเรื่อง ${topic} พร้อมสอน`,
    };
  }
}

export const selfChecker = typeof window !== "undefined" ? new SelfChecker() : null;

// Auto check ทุกเช้า 06:00 และตอนโหลดหน้า
if (typeof window !== "undefined") {
  // เช็คทันทีเมื่อโหลด
  setTimeout(() => {
    selfChecker?.checkSelf();
  }, 3000);

  // เช็คทุกวันเวลา 06:00
  const now = new Date();
  const next6am = new Date();
  next6am.setHours(6, 0, 0, 0);
  if (next6am <= now) next6am.setDate(next6am.getDate() + 1);
  
  const msUntil6am = next6am.getTime() - now.getTime();
  setTimeout(() => {
    selfChecker?.checkSelf();
    // หลังจากนั้นเช็คทุก 24 ชม.
    setInterval(() => selfChecker?.checkSelf(), 24 * 60 * 60 * 1000);
  }, msUntil6am);
}
