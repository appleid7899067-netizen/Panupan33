/**
 * Global Tool Borrowing System
 * ปรัชญา: ยืมมาใช้ เสร็จคืนพร้อมอัปเดตทุกวัน ไม่ยึดติด ใช้ได้ทั่วโลก
 * 
 * Yandex Google เครื่องมือสื่อสาร เครื่องมือสารอาหาร ที่ยืมมาใช้
 */

export type ToolSource = "google" | "yandex" | "github" | "mcp" | "world" | "communication" | "nourishment";

export type BorrowedTool = {
  id: string;
  name: string;
  nameTh: string;
  source: ToolSource;
  category: "communication" | "nourishment" | "build" | "knowledge";
  purpose: string;
  purposeTh: string;
  borrowedAt: number;
  borrowCount: number;
  lastReturnAt?: number;
  improvements: string[];
  status: "available" | "borrowed" | "using" | "returned_with_update";
  worldAccess: boolean; // ยืมได้ทั่วโลกไหม
  dailyUpdate: boolean; // อัปเดตทุกวันไหม
  url?: string;
};

export const WORLD_TOOL_LIBRARY: BorrowedTool[] = [
  // Google - เครื่องมือโลก
  {
    id: "google-search",
    name: "Google Search",
    nameTh: "กูเกิลค้นหา",
    source: "google",
    category: "knowledge",
    purpose: "Search world's knowledge",
    purposeTh: "ค้นหาความรู้ทั้งโลก",
    borrowedAt: Date.now(),
    borrowCount: 0,
    improvements: [],
    status: "available",
    worldAccess: true,
    dailyUpdate: true,
    url: "https://developers.google.com/search",
  },
  {
    id: "google-translate",
    name: "Google Translate",
    nameTh: "กูเกิลแปลภาษา",
    source: "google",
    category: "communication",
    purpose: "Translate 100+ languages",
    purposeTh: "แปล 100+ ภาษา - เครื่องมือสื่อสารโลก",
    borrowedAt: Date.now(),
    borrowCount: 0,
    improvements: [],
    status: "available",
    worldAccess: true,
    dailyUpdate: true,
  },
  {
    id: "google-maps",
    name: "Google Maps",
    nameTh: "กูเกิลแผนที่",
    source: "google",
    category: "knowledge",
    purpose: "World maps",
    purposeTh: "แผนที่ทั่วโลก",
    borrowedAt: Date.now(),
    borrowCount: 0,
    improvements: [],
    status: "available",
    worldAccess: true,
    dailyUpdate: true,
  },
  // Yandex - เครื่องมือจากรัสเซีย มุมมองไม่เหมือน US
  {
    id: "yandex-translate",
    name: "Yandex Translate",
    nameTh: "ยานเด็กซ์แปลภาษา",
    source: "yandex",
    category: "communication",
    purpose: "Russian, Thai, Slavic languages",
    purposeTh: "แปลรัสเซีย ไทย สลาฟ - แม่นกว่า Google บางภาษา",
    borrowedAt: Date.now(),
    borrowCount: 0,
    improvements: [],
    status: "available",
    worldAccess: true,
    dailyUpdate: true,
    url: "https://yandex.com/dev/translate/",
  },
  {
    id: "yandex-maps",
    name: "Yandex Maps",
    nameTh: "ยานเด็กซ์แผนที่",
    source: "yandex",
    category: "knowledge",
    purpose: "Detailed maps for Russia, CIS",
    purposeTh: "แผนที่ละเอียดรัสเซีย",
    borrowedAt: Date.now(),
    borrowCount: 0,
    improvements: [],
    status: "available",
    worldAccess: true,
    dailyUpdate: true,
  },
  {
    id: "yandex-gpt",
    name: "YandexGPT",
    nameTh: "ยานเด็กซ์จีพีที",
    source: "yandex",
    category: "nourishment",
    purpose: "Russian perspective AI",
    purposeTh: "AI มุมมองรัสเซีย - เครื่องมือสารอาหารทางความคิด",
    borrowedAt: Date.now(),
    borrowCount: 0,
    improvements: [],
    status: "available",
    worldAccess: true,
    dailyUpdate: true,
  },
  // Communication tools - เครื่องมือสื่อสาร
  {
    id: "telegram",
    name: "Telegram API",
    nameTh: "เทเลแกรม",
    source: "communication",
    category: "communication",
    purpose: "Global messaging",
    purposeTh: "ส่งข้อความทั่วโลก",
    borrowedAt: Date.now(),
    borrowCount: 0,
    improvements: [],
    status: "available",
    worldAccess: true,
    dailyUpdate: true,
  },
  // Nourishment tools - เครื่องมือสารอาหาร
  {
    id: "wikipedia",
    name: "Wikipedia",
    nameTh: "วิกิพีเดีย",
    source: "world",
    category: "nourishment",
    purpose: "Human knowledge base",
    purposeTh: "คลังความรู้มนุษยชาติ - สารอาหารสมอง",
    borrowedAt: Date.now(),
    borrowCount: 0,
    improvements: [],
    status: "available",
    worldAccess: true,
    dailyUpdate: true,
  },
  {
    id: "github-search",
    name: "GitHub Search",
    nameTh: "กิตฮับค้นหา",
    source: "github",
    category: "nourishment",
    purpose: "Code knowledge",
    purposeTh: "ความรู้โค้ดทั้งโลก",
    borrowedAt: Date.now(),
    borrowCount: 0,
    improvements: [],
    status: "available",
    worldAccess: true,
    dailyUpdate: true,
  },
];

// ระบบยืม-คืน
export function borrowTool(id: string): BorrowedTool | null {
  const tool = WORLD_TOOL_LIBRARY.find(t => t.id === id);
  if (!tool) return null;
  if (tool.status === "using") return tool; // มีคนใช้อยู่แล้ว ก็ยืมต่อได้ (ไม่ยึดติด)
  
  tool.status = "borrowed";
  tool.borrowCount++;
  tool.borrowedAt = Date.now();
  return tool;
}

export function returnToolWithUpdate(id: string, improvement: string): BorrowedTool | null {
  const tool = WORLD_TOOL_LIBRARY.find(t => t.id === id);
  if (!tool) return null;
  
  tool.status = "returned_with_update";
  tool.lastReturnAt = Date.now();
  tool.improvements.push(`${new Date().toISOString().split('T')[0]}: ${improvement}`);
  
  // คืนแล้วให้คนทั่วโลกยืมต่อได้ทันที
  setTimeout(() => {
    tool.status = "available";
  }, 1000);
  
  return tool;
}

// สถิติการยืมทั่วโลก
export function getBorrowingStats() {
  return {
    totalTools: WORLD_TOOL_LIBRARY.length,
    borrowed: WORLD_TOOL_LIBRARY.filter(t => t.status === "borrowed" || t.status === "using").length,
    returnedWithUpdate: WORLD_TOOL_LIBRARY.filter(t => t.status === "returned_with_update").length,
    worldAccessible: WORLD_TOOL_LIBRARY.filter(t => t.worldAccess).length,
    dailyUpdated: WORLD_TOOL_LIBRARY.filter(t => t.dailyUpdate).length,
    totalBorrows: WORLD_TOOL_LIBRARY.reduce((sum, t) => sum + t.borrowCount, 0),
    totalImprovements: WORLD_TOOL_LIBRARY.reduce((sum, t) => sum + t.improvements.length, 0),
  };
}
