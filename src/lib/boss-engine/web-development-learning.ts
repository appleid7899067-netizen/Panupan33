export type WebLearningMode = "lesson" | "practice" | "review" | "project";

export type WebLearningStep = {
  mode: WebLearningMode;
  title: string;
  instruction: string;
  verification: string[];
};

export function createWebLearningStep(level: "beginner" | "intermediate" | "advanced" = "beginner"): WebLearningStep {
  if (level === "advanced") {
    return {
      mode: "project",
      title: "Build and verify",
      instruction: "สร้างฟีเจอร์เว็บจริง แล้วตรวจ syntax, logic, responsive UI และ Preview ก่อนสรุปผล",
      verification: ["syntax", "runtime", "preview"],
    };
  }
  if (level === "intermediate") {
    return {
      mode: "practice",
      title: "Practice with feedback",
      instruction: "ให้โจทย์ HTML/CSS/JavaScript หรือ DOM แล้วตรวจคำตอบ พร้อมอธิบายจุดที่พลาด",
      verification: ["answer", "logic", "preview"],
    };
  }
  return {
    mode: "lesson",
    title: "Bite-sized web lesson",
    instruction: "สอนทีละหัวข้อจาก HTML → CSS → JavaScript → DOM พร้อมตัวอย่างและแบบฝึกหัดสั้น ๆ",
    verification: ["understanding", "exercise"],
  };
}

export function webLearningPrompt(topic = "Web Development"): string {
  return [
    "เข้าสู่โหมด Web Development Learning Lab",
    `หัวข้อ: ${topic}`,
    "สอนแบบสั้นและลงมือทำ ไม่ใช่บรรยายยาว",
    "ให้ตัวอย่างโค้ดที่รันได้ ตามด้วยแบบฝึกหัด แล้วตรวจคำตอบหรือ Preview จริงก่อนให้ผ่าน",
    "ปรับระดับจากผลงานล่าสุด และทบทวนจุดที่ผิดซ้ำก่อนขยับหัวข้อ",
  ].join("\n");
}
