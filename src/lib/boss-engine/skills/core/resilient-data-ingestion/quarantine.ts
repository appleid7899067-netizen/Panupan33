export type QuarantineRecord = { payload: unknown; reason: string; at: string };

export function quarantine(payload: unknown, reason: string): QuarantineRecord {
  return { payload, reason: reason.trim() || "validation_failed", at: new Date().toISOString() };
}
