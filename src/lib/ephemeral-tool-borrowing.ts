/**
 * Ephemeral Tool Borrowing
 *
 * Tools are borrowed only for the duration of a task/action.
 * Panupan keeps capability metadata and failure memory, not ownership
 * of the external browser/tool or its private data.
 */

export type BorrowedTool = {
  id: string;
  capability: string;
  source: "browser" | "web" | "sandbox" | "plugin" | "mcp" | "other";
  borrowedAt: number;
  releasedAt?: number;
  status: "borrowed" | "released";
  requestId?: string;
};

export type BorrowPolicy = {
  noOwnership: true;
  ephemeral: true;
  releaseAfterUse: true;
  reusable: true;
  realtime: true;
  persistCredentials: false;
  persistExternalContent: false;
};

export const EPHEMERAL_BORROW_POLICY: BorrowPolicy = {
  noOwnership: true,
  ephemeral: true,
  releaseAfterUse: true,
  reusable: true,
  realtime: true,
  persistCredentials: false,
  persistExternalContent: false,
};

const active = new Map<string, BorrowedTool>();

function key(id: string, requestId?: string) {
  return requestId ? `${requestId}:${id}` : id;
}

/** Borrow a capability. This records only the lease, never ownership. */
export function borrowTool(
  id: string,
  capability: string,
  source: BorrowedTool["source"],
  requestId?: string,
): BorrowedTool {
  const item: BorrowedTool = {
    id,
    capability,
    source,
    borrowedAt: Date.now(),
    status: "borrowed",
    requestId,
  };
  active.set(key(id, requestId), item);
  return item;
}

/** Return a borrowed capability immediately after the action finishes. */
export function releaseTool(id: string, requestId?: string): BorrowedTool | null {
  const k = key(id, requestId);
  const current = active.get(k);
  if (!current) return null;
  const released = { ...current, releasedAt: Date.now(), status: "released" as const };
  active.delete(k);
  return released;
}

/** Always release all active leases at the end of a run/request. */
export function releaseAllBorrowedTools(requestId?: string): BorrowedTool[] {
  const released: BorrowedTool[] = [];
  for (const [k, item] of active.entries()) {
    if (requestId && item.requestId !== requestId) continue;
    released.push({ ...item, releasedAt: Date.now(), status: "released" });
    active.delete(k);
  }
  return released;
}

export function borrowedTools(requestId?: string): BorrowedTool[] {
  return [...active.values()].filter((item) => !requestId || item.requestId === requestId);
}

export function ephemeralToolInstruction(): string {
  return [
    "=== EPHEMERAL TOOL BORROWING ===",
    "1. ดึงข้อมูล real-time ได้ด้วย browser/web/tool ที่มีสิทธิ์เข้าถึงจริง",
    "2. ยืมความสามารถของเครื่องมือเท่านั้น ไม่ถือครองเครื่องมือ บัญชี หรือข้อมูลส่วนตัวของเจ้าของ",
    "3. ใช้เครื่องมือเท่าที่จำเป็นต่อ action แล้วคืน/ปิด session ทันทีเมื่อเสร็จ",
    "4. เก็บได้เฉพาะผลลัพธ์ที่จำเป็นต่อภารกิจและหลักฐานที่ไม่เป็นความลับ",
    "5. ห้ามเก็บ credential, cookie, session token หรือข้อมูลส่วนตัวของแหล่งภายนอกเป็น memory ถาวร",
    "6. การยืมครั้งถัดไปทำได้เมื่อมีสิทธิ์เข้าถึงจริงอีกครั้ง ไม่ถือว่าเคยยืมแล้วจึงมีสิทธิ์ถาวร",
    "7. หากเครื่องมือหายหรือใช้ไม่ได้ ให้เปลี่ยนเครื่องมือ/เส้นทาง ไม่สร้างสิทธิ์ปลอม",
    "=== END EPHEMERAL TOOL BORROWING ===",
  ].join("\n");
}
