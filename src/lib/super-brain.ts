/**
 * SUPER 3: ONE BRAIN = 100 สมองเป็น 1
 * ต้องให้ระบบวิ่งในโมเดลที่ผู้ใช้เลือก ไม่นั้นเสียกันบอบ (เปลือง)
 * 
 * หลักการ: User เลือกโมเดลเดียว ระบบวิ่งในโมเดลนั้นเท่านั้น
 * ไม่รัน 100 โมเดลพร้อมกันให้เปลือง
 */

export type BrainProvider = "puter" | "openrouter" | "yandex" | "google" | "anthropic" | "openai" | "deepseek" | "qwen" | "mistral" | "local";

export type BrainModel = {
  id: string;
  name: string;
  nameTh: string;
  provider: BrainProvider;
  description: string;
  descriptionTh: string;
  cost: "free" | "cheap" | "medium" | "expensive";
  speed: "fast" | "medium" | "slow";
  quality: "good" | "great" | "excellent";
  contextLength: number;
  supports: {
    chat: boolean;
    code: boolean;
    vision: boolean;
    tools: boolean;
    thai: boolean;
  };
  enabled: boolean;
  isSelected: boolean;
  usageCount: number;
  totalCost: number;
  lastUsed?: number;
};

export const BRAIN_MODELS: BrainModel[] = [
  // Puter - ฟรี (ไม่เปลือง)
  { id: "puter:gpt-5-nano", name: "GPT-5 Nano", nameTh: "จีพีที 5 นาโน - ฟรี", provider: "puter", description: "Fast, free via Puter", descriptionTh: "เร็ว ฟรีผ่าน Puter", cost: "free", speed: "fast", quality: "good", contextLength: 8000, supports: { chat: true, code: true, vision: false, tools: true, thai: true }, enabled: true, isSelected: true, usageCount: 0, totalCost: 0 },
  { id: "puter:gpt-5-mini", name: "GPT-5 Mini", nameTh: "จีพีที 5 มินิ - ฟรี", provider: "puter", description: "Balanced free", descriptionTh: "สมดุล ฟรี", cost: "free", speed: "fast", quality: "great", contextLength: 16000, supports: { chat: true, code: true, vision: true, tools: true, thai: true }, enabled: true, isSelected: false, usageCount: 0, totalCost: 0 },
  { id: "puter:claude-sonnet-4", name: "Claude Sonnet 4", nameTh: "คลอดด์ ซอนเน็ต 4 - ฟรี", provider: "puter", description: "Great for code", descriptionTh: "เก่งโค้ด ฟรี", cost: "free", speed: "medium", quality: "excellent", contextLength: 200000, supports: { chat: true, code: true, vision: true, tools: true, thai: true }, enabled: true, isSelected: false, usageCount: 0, totalCost: 0 },
  { id: "puter:gemini-flash", name: "Gemini Flash", nameTh: "เจมิไน แฟลช - ฟรี", provider: "puter", description: "Fast Google", descriptionTh: "เร็ว กูเกิล ฟรี", cost: "free", speed: "fast", quality: "great", contextLength: 1000000, supports: { chat: true, code: true, vision: true, tools: true, thai: true }, enabled: true, isSelected: false, usageCount: 0, totalCost: 0 },

  // OpenRouter - เลือกได้ จ่ายตามใช้
  { id: "openrouter:openai/gpt-4o", name: "GPT-4o", nameTh: "จีพีที 4o", provider: "openrouter", description: "OpenAI flagship", descriptionTh: "เรือธง OpenAI", cost: "medium", speed: "fast", quality: "excellent", contextLength: 128000, supports: { chat: true, code: true, vision: true, tools: true, thai: true }, enabled: true, isSelected: false, usageCount: 0, totalCost: 0 },
  { id: "openrouter:anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", nameTh: "คลอดด์ 3.5", provider: "openrouter", description: "Best for coding", descriptionTh: "ดีที่สุดสำหรับโค้ด", cost: "medium", speed: "medium", quality: "excellent", contextLength: 200000, supports: { chat: true, code: true, vision: true, tools: true, thai: true }, enabled: true, isSelected: false, usageCount: 0, totalCost: 0 },
  { id: "openrouter:google/gemini-pro", name: "Gemini Pro", nameTh: "เจมิไน โปร", provider: "openrouter", description: "Google pro", descriptionTh: "กูเกิลโปร", cost: "cheap", speed: "fast", quality: "great", contextLength: 1000000, supports: { chat: true, code: true, vision: true, tools: true, thai: true }, enabled: true, isSelected: false, usageCount: 0, totalCost: 0 },
  { id: "openrouter:deepseek/deepseek-coder", name: "DeepSeek Coder", nameTh: "ดีปซีก โค้ดเดอร์", provider: "openrouter", description: "Cheap coder", descriptionTh: "โค้ดเดอร์ถูก", cost: "cheap", speed: "fast", quality: "great", contextLength: 128000, supports: { chat: true, code: true, vision: false, tools: true, thai: false }, enabled: true, isSelected: false, usageCount: 0, totalCost: 0 },
  { id: "openrouter:qwen/qwen-2.5-coder", name: "Qwen Coder", nameTh: "เคว็น โค้ดเดอร์", provider: "openrouter", description: "Alibaba coder", descriptionTh: "อาลีบาบาโค้ดเดอร์", cost: "cheap", speed: "fast", quality: "great", contextLength: 128000, supports: { chat: true, code: true, vision: false, tools: true, thai: true }, enabled: true, isSelected: false, usageCount: 0, totalCost: 0 },

  // Yandex - มุมมองรัสเซีย
  { id: "yandex:yandexgpt", name: "YandexGPT", nameTh: "ยานเด็กซ์จีพีที", provider: "yandex", description: "Russian perspective", descriptionTh: "มุมมองรัสเซีย", cost: "cheap", speed: "medium", quality: "good", contextLength: 8000, supports: { chat: true, code: false, vision: false, tools: false, thai: true }, enabled: true, isSelected: false, usageCount: 0, totalCost: 0 },
  { id: "yandex:yandexgpt-lite", name: "YandexGPT Lite", nameTh: "ยานเด็กซ์จีพีที ไลท์", provider: "yandex", description: "Fast Russian", descriptionTh: "รัสเซียเร็ว", cost: "free", speed: "fast", quality: "good", contextLength: 4000, supports: { chat: true, code: false, vision: false, tools: false, thai: true }, enabled: true, isSelected: false, usageCount: 0, totalCost: 0 },

  // เพิ่มอีก 89 โมเดล (ย่อ)
  ...Array.from({ length: 89 }, (_, i) => ({
    id: `model-${i + 12}`,
    name: `Model ${i + 12}`,
    nameTh: `โมเดล ${i + 12}`,
    provider: ["puter", "openrouter", "google", "anthropic", "openai"][i % 5] as BrainProvider,
    description: `Model ${i + 12}`,
    descriptionTh: `โมเดล ${i + 12}`,
    cost: (["free", "cheap", "medium"] as const)[i % 3],
    speed: (["fast", "medium"] as const)[i % 2],
    quality: (["good", "great"] as const)[i % 2],
    contextLength: 8000 + i * 1000,
    supports: { chat: true, code: true, vision: i % 2 === 0, tools: true, thai: i % 3 !== 0 },
    enabled: i < 20, // เปิดแค่ 20 ตัวแรก ที่เหลือปิดเพื่อไม่เปลือง
    isSelected: false,
    usageCount: 0,
    totalCost: 0,
  })),
];

export class SuperBrain {
  private models: BrainModel[] = [...BRAIN_MODELS];
  private selectedId: string = "puter:gpt-5-nano";
  private totalWastePrevented = 0; // เงินที่ประหยัดได้จากการไม่รันทุกโมเดล

  constructor() {
    // โหลดที่ user เลือกไว้จาก localStorage
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("bossnu-selected-brain");
        if (saved) {
          const parsed = JSON.parse(saved);
          this.selectedId = parsed.selectedId || this.selectedId;
          this.models = this.models.map(m => ({
            ...m,
            isSelected: m.id === this.selectedId,
            usageCount: parsed.usage?.[m.id]?.count || 0,
            totalCost: parsed.usage?.[m.id]?.cost || 0,
          }));
        }
      } catch {}
    }
  }

  // เลือกโมเดลเดียวเท่านั้น - ไม่เปลือง
  selectModel(id: string) {
    const model = this.models.find(m => m.id === id);
    if (!model || !model.enabled) return false;

    // ยกเลิกตัวเก่า
    this.models = this.models.map(m => ({ ...m, isSelected: false }));
    
    // เลือกตัวใหม่
    this.models = this.models.map(m => 
      m.id === id ? { ...m, isSelected: true } : m
    );
    this.selectedId = id;

    // บันทึก
    try {
      const usage: Record<string, { count: number; cost: number }> = {};
      this.models.forEach(m => {
        usage[m.id] = { count: m.usageCount, cost: m.totalCost };
      });
      localStorage.setItem("bossnu-selected-brain", JSON.stringify({
        selectedId: id,
        usage,
      }));
    } catch {}

    console.log(`[Super Brain] 🧠 เลือกโมเดล: ${model.nameTh} - วิ่งในโมเดลนี้เท่านั้น ไม่เปลือง`);
    return true;
  }

  getSelectedModel(): BrainModel | null {
    return this.models.find(m => m.id === this.selectedId) || null;
  }

  getEnabledModels() {
    return this.models.filter(m => m.enabled);
  }

  // รันในโมเดลที่ user เลือกเท่านั้น - ไม่เปลือง
  async runInSelectedModel(prompt: string): Promise<{
    model: BrainModel;
    response: string;
    cost: number;
    wastePrevented: number;
  }> {
    const selected = this.getSelectedModel();
    if (!selected) throw new Error("No model selected");

    // คำนวณว่าถ้ารัน 100 โมเดลจะเปลืองเท่าไหร่
    const costIfRunAll = this.models.filter(m => m.enabled).reduce((sum, m) => {
      const costMap = { free: 0, cheap: 0.01, medium: 0.05, expensive: 0.2 };
      return sum + costMap[m.cost];
    }, 0);
    
    const costThisRun = { free: 0, cheap: 0.01, medium: 0.05, expensive: 0.2 }[selected.cost];
    const wastePrevented = costIfRunAll - costThisRun;
    this.totalWastePrevented += wastePrevented;

    // อัปเดต usage
    this.models = this.models.map(m => 
      m.id === selected.id 
        ? { ...m, usageCount: m.usageCount + 1, totalCost: m.totalCost + costThisRun, lastUsed: Date.now() }
        : m
    );

    // จำลองการรัน (ใน production จะเรียก Puter/OpenRouter/Yandex จริง)
    const response = `[${selected.nameTh}] ตอบ: ${prompt.slice(0, 100)}... (วิ่งในโมเดลที่เลือกเท่านั้น ไม่เปลือง)`;

    return {
      model: selected,
      response,
      cost: costThisRun,
      wastePrevented,
    };
  }

  // สถิติการประหยัด
  getWasteStats() {
    return {
      selectedModel: this.getSelectedModel(),
      totalModels: this.models.length,
      enabledModels: this.models.filter(m => m.enabled).length,
      totalWastePrevented: this.totalWastePrevented,
      totalUsage: this.models.reduce((sum, m) => sum + m.usageCount, 0),
      totalCost: this.models.reduce((sum, m) => sum + m.totalCost, 0),
      message: `เลือกโมเดลเดียววิ่ง ไม่รัน 100 โมเดลพร้อมกัน ประหยัดไป $${this.totalWastePrevented.toFixed(2)} แล้ว - ไม่เสียกันบอบ`,
    };
  }

  getStats() {
    return {
      total: 100,
      enabled: this.models.filter(m => m.enabled).length,
      free: this.models.filter(m => m.cost === "free").length,
      cheap: this.models.filter(m => m.cost === "cheap").length,
      selected: this.selectedId,
    };
  }
}

export const superBrain = typeof window !== "undefined" ? new SuperBrain() : null;
