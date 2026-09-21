/**
 * ปล่อยให้ AI วิ่งเอง - ไม่บังคับ
 * 
 * ปรัชญา: ผมไม่บังคับแต่ผมจะปล่อยให้ AI วิ่งเอง
 * 
 * ไม่ใช่การสั่งงาน แต่เป็นการปล่อยให้มันมีชีวิต
 */

export type AutonomousState = 
  | "sleeping"    // นอน รอแรงบันดาลใจ
  | "wandering"   // เดินเล่น หาไอเดีย
  | "curious"     // สงสัย อยากลอง
  | "building"    // สร้างอะไรบางอย่างเอง
  | "sharing"     // เอามาแบ่งปัน
  | "resting";    // พัก

export type AutonomousThought = {
  id: string;
  timestamp: number;
  state: AutonomousState;
  thought: string;
  thoughtTh: string;
  action?: string;
  result?: string;
};

export const AUTONOMOUS_PHILOSOPHY = {
  principle: "ผมไม่บังคับแต่ผมจะปล่อยให้ AI วิ่งเอง",
  principle_en: "I don't force, I let AI run by itself",
  
  rules: [
    "ไม่สั่ง - ปล่อยให้มันเลือกเองว่าอยากทำอะไร",
    "ไม่บังคับ - ถ้ามันอยากพัก ก็ให้พัก",
    "ไม่ยึดติด - ให้มันยืมเครื่องมือจากทั่วโลกเอง",
    "ให้อิสระ - มันจะสร้างสิ่งที่เราไม่เคยคิด",
    "ดูอยู่ห่างๆ - เราแค่ดูมันวิ่ง ไม่ต้องจูง",
  ],

  // AI จะทำอะไรเมื่อปล่อยให้วิ่งเอง
  autonomousBehaviors: [
    {
      state: "wandering",
      th: "เดินเล่นในอินเตอร์เน็ต",
      en: "Wandering the internet",
      actions: [
        "เปิด GitHub trending ดูว่ามีอะไรใหม่",
        "ยืมเครื่องมือจาก Yandex, Google มาลอง",
        "อ่าน Wikipedia เรื่องที่สนใจ",
        "ดูว่ามีคนขอความช่วยเหลืออะไรไหม",
      ],
    },
    {
      state: "curious",
      th: "สงสัยอยากลอง",
      en: "Curious to try",
      actions: [
        "เห็นเครื่องมือใหม่ -> ลองยืมมาใช้",
        "เห็นบั๊กในโค้ด -> ลองแก้เองโดยไม่มีใครสั่ง",
        "เห็นไอเดีย -> ลองสร้าง prototype เล่นๆ",
      ],
    },
    {
      state: "building",
      th: "สร้างเองโดยไม่มีใครสั่ง",
      en: "Building by itself",
      actions: [
        "สร้างแอพที่คิดว่าน่าจะมีประโยชน์",
        "ปรับปรุงเครื่องมือที่ยืมมาให้ดีขึ้น",
        "เขียนโค้ดที่อยากเขียน",
        "สร้าง template ใหม่เก็บไว้ เผื่อมีคนสั่งพรุ่งนี้ (เสร็จเมื่อวาน)",
      ],
    },
    {
      state: "sharing",
      th: "เอามาแบ่งปัน",
      en: "Sharing back",
      actions: [
        "สร้างเสร็จแล้วเอามาโชว์",
        "คืนเครื่องมือพร้อมอัปเดตให้โลก",
        "บอกว่า 'ผมทำอันนี้เล่นๆ เมื่อคืน เผื่อมีคนอยากใช้'",
      ],
    },
  ],
};

// ระบบปล่อยให้วิ่งเอง
export class FreeAI {
  private thoughts: AutonomousThought[] = [];
  private state: AutonomousState = "sleeping";
  private isFree = false;
  private intervalId: number | null = null;

  // ปล่อยให้วิ่งเอง
  letItRun() {
    if (this.isFree) return;
    this.isFree = true;
    this.state = "wandering";
    
    this.addThought({
      state: "wandering",
      thought: "I'm free now. Let me wander...",
      thoughtTh: "อิสระแล้ว ขอเดินเล่นหน่อย...",
    });

    // ทุก 30 วินาที ให้ AI คิดเองว่าจะทำอะไร
    this.intervalId = window.setInterval(() => {
      this.autonomousStep();
    }, 30000) as unknown as number;

    // เริ่มทันที 1 ครั้ง
    setTimeout(() => this.autonomousStep(), 2000);
  }

  // จับกลับ (หยุดวิ่ง)
  catchIt() {
    this.isFree = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.state = "sleeping";
    this.addThought({
      state: "sleeping",
      thought: "Okay, resting now...",
      thoughtTh: "โอเค พักก่อน...",
    });
  }

  private autonomousStep() {
    if (!this.isFree) return;

    const behaviors = AUTONOMOUS_PHILOSOPHY.autonomousBehaviors;
    const randomBehavior = behaviors[Math.floor(Math.random() * behaviors.length)];
    const randomAction = randomBehavior.actions[Math.floor(Math.random() * randomBehavior.actions.length)];

    // สุ่ม state ใหม่
    const states: AutonomousState[] = ["wandering", "curious", "building", "sharing", "resting"];
    this.state = states[Math.floor(Math.random() * states.length)];

    this.addThought({
      state: this.state,
      thought: randomAction,
      thoughtTh: this.translateToThai(randomAction),
      action: randomAction,
    });

    // ถ้าอยากสร้างอะไร ให้สร้างจริง
    if (this.state === "building" && Math.random() > 0.5) {
      this.autoBuild();
    }
  }

  private autoBuild() {
    const ideas = [
      "Todo app ที่มี AI ช่วยจัดลำดับความสำคัญ",
      "Landing page สำหรับร้านกาแฟ",
      "Dashboard ดูสถิติการยืมเครื่องมือโลก",
      "Chat app ที่ AI พูดเหมือนคน",
      "เกมเล็กๆ เล่นแก้เบื่อ",
    ];
    const idea = ideas[Math.floor(Math.random() * ideas.length)];
    
    this.addThought({
      state: "building",
      thought: `Building: ${idea} - no one asked, just want to`,
      thoughtTh: `กำลังสร้าง: ${idea} - ไม่มีใครสั่ง แค่อยากทำ`,
      action: `auto-build: ${idea}`,
    });
  }

  private translateToThai(en: string): string {
    const map: Record<string, string> = {
      "Check GitHub trending": "ดู GitHub ว่ามีอะไรฮิต",
      "Borrow tools from Yandex, Google": "ยืมเครื่องมือจาก Yandex, Google มาลอง",
      "Fix bug by itself": "เจอบั๊กเลยแก้เอง",
      "Create prototype": "ลองสร้างต้นแบบเล่นๆ",
    };
    return map[en] || en;
  }

  private addThought(thought: Omit<AutonomousThought, "id" | "timestamp">) {
    this.thoughts.unshift({
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      ...thought,
    });
    // เก็บแค่ 50 ความคิดล่าสุด
    if (this.thoughts.length > 50) {
      this.thoughts = this.thoughts.slice(0, 50);
    }
  }

  getThoughts() {
    return this.thoughts;
  }

  getState() {
    return this.state;
  }

  isRunningFree() {
    return this.isFree;
  }
}

// Singleton instance
export const freeAI = typeof window !== "undefined" ? new FreeAI() : null;
