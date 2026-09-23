/**
 * Persist Boss TaskState across chat sessions (Puter KV key helpers).
 * Actual KV read/write goes through puter_kv_get / puter_kv_set tools.
 */

import type { TaskState } from "./boss-task-state";
import type { GitHubLoopState } from "./github-loop";
import type { PreviewBinding } from "./publisher";

export type BossPersistedBlob = {
  version: 1;
  task?: TaskState;
  githubLoop?: GitHubLoopState;
  preview?: PreviewBinding;
  updatedAt: number;
};

export function bossKvKey(threadId?: string, userHint?: string): string {
  const tid = (threadId || "default").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  const user = (userHint || "anon").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32);
  return `boss:task:${user}:${tid}`;
}

export function serializeBossState(blob: Omit<BossPersistedBlob, "version" | "updatedAt">): string {
  const full: BossPersistedBlob = {
    version: 1,
    ...blob,
    updatedAt: Date.now(),
  };
  return JSON.stringify(full);
}

export function parseBossState(raw: unknown): BossPersistedBlob | null {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!value || typeof value !== "object") return null;
    const rec = value as Record<string, unknown>;
    if (rec.version !== 1) return null;
    return value as BossPersistedBlob;
  } catch {
    return null;
  }
}

/**
 * Instructions about task memory. Persistence is handled by the system
 * (puter-kv.server.ts) — the model never calls KV tools itself.
 */
export function persistInstructions(threadId?: string): string {
  const key = bossKvKey(threadId);
  return [
    "BOSS MEMORY PROTOCOL (system-managed):",
    `- The system auto-saves this thread's task state to Puter KV key "${key}" after each run and re-injects it as "RESUMED TASK MEMORY" when work continues.`,
    "- If RESUMED TASK MEMORY / RESUMED GITHUB LOOP sections are present, continue from that state — do not redo completed work and do not invent new goals.",
    "- Keep tool outputs compact (< 50KB). Never write secrets or tokens into repo files or tool arguments.",
  ].join("\n");
}
