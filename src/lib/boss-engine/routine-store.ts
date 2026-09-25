export type Routine = { name: string; steps: string[]; createdAt: number; updatedAt: number };

const routines = new Map<string, Routine>();

export function teachRoutine(name: string, steps: string[]): Routine {
  const now = Date.now();
  const existing = routines.get(name);
  const routine = { name, steps: steps.map((s) => s.trim()).filter(Boolean), createdAt: existing?.createdAt ?? now, updatedAt: now };
  routines.set(name, routine);
  return routine;
}

export function getRoutine(name: string): Routine | null {
  return routines.get(name) ?? null;
}

export function parseTeachRoutine(text: string): Routine | null {
  const m = text.match(/^\s*สอน\s*routine\s+ชื่อ\s+([^:]+):\s*(.+)$/i);
  if (!m) return null;
  return teachRoutine(m[1].trim(), m[2].split(";"));
}

export function listRoutines(): Routine[] {
  return [...routines.values()];
}
