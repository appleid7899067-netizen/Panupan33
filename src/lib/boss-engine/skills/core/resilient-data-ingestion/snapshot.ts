export type Snapshot = { source: string; content: string; capturedAt: string; hash: string };

export function createSnapshot(source: string, content: string, hash: string): Snapshot {
  return { source, content, capturedAt: new Date().toISOString(), hash };
}
