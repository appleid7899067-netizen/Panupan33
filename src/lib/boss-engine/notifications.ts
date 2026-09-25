export type BossEvent = { type: "approval" | "job_done"; payload: Record<string, unknown>; at: number };
type Listener = (event: BossEvent) => void;
const listeners = new Set<Listener>();

export function onBossEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitBossEvent(type: BossEvent["type"], payload: Record<string, unknown> = {}): void {
  const event = { type, payload, at: Date.now() } as BossEvent;
  for (const listener of listeners) listener(event);
}
