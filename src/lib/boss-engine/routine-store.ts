/**
 * Teach Once → Routine
 * User shows a workflow once; Boss stores steps and can replay.
 * Persisted by caller (Puter KV / local) — this module is the pure store API.
 */

export type RoutineStep = {
  op: string;
  args?: Record<string, unknown>;
  note?: string;
};

export type Routine = {
  id: string;
  name: string;
  description: string;
  steps: RoutineStep[];
  createdAt: number;
  updatedAt: number;
  runCount: number;
  lastRunAt?: number;
  tags: string[];
};

export type RoutineStoreState = {
  routines: Routine[];
};

export function createEmptyRoutineStore(): RoutineStoreState {
  return { routines: [] };
}

export function teachRoutine(
  state: RoutineStoreState,
  input: { name: string; description: string; steps: RoutineStep[]; tags?: string[] },
): { state: RoutineStoreState; routine: Routine } {
  const now = Date.now();
  const routine: Routine = {
    id: `rtn_${now}_${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    description: input.description.trim(),
    steps: input.steps.map((s) => ({ op: s.op, args: s.args, note: s.note })),
    createdAt: now,
    updatedAt: now,
    runCount: 0,
    tags: input.tags ?? [],
  };
  return { state: { routines: [...state.routines, routine] }, routine };
}

export function findRoutines(state: RoutineStoreState, query: string, limit = 5): Routine[] {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!q.length) return state.routines.slice(-limit);
  return state.routines
    .map((r) => ({
      r,
      score:
        q.filter((t) => r.name.toLowerCase().includes(t) || r.description.toLowerCase().includes(t) || r.tags.some((x) => x.includes(t))).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.r.updatedAt - a.r.updatedAt)
    .slice(0, limit)
    .map((x) => x.r);
}

export function markRoutineRun(state: RoutineStoreState, id: string): RoutineStoreState {
  return {
    routines: state.routines.map((r) =>
      r.id === id ? { ...r, runCount: r.runCount + 1, lastRunAt: Date.now(), updatedAt: Date.now() } : r,
    ),
  };
}

/** Parse a simple teach message: "สอน routine ชื่อ X: step1; step2" */
export function parseTeachMessage(text: string): { name: string; steps: RoutineStep[] } | null {
  const m = text.match(/(?:สอน|teach)\s+(?:routine\s+)?["']?([^"'\n:]+)["']?\s*[:：]\s*(.+)/i);
  if (!m) return null;
  const name = m[1].trim();
  const steps = m[2]
    .split(/;|\n|→|->/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((op) => ({ op }));
  if (!name || !steps.length) return null;
  return { name, steps };
}
