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

/** Instructions injected so the model persists via puter_kv_* tools. */
export function persistInstructions(threadId?: string): string {
  const key = bossKvKey(threadId);
  return [
    "BOSS MEMORY PROTOCOL:",
    `- After meaningful progress, call puter_kv_set with key "${key}" and JSON state { version:1, task, githubLoop?, preview?, updatedAt }.`,
    `- At the start of a continuing task, call puter_kv_get key "${key}" and resume from stored task/plan if present.`,
    "- Keep the value compact (< 50KB). Do not store secrets or tokens.",
  ].join("\n");
}
