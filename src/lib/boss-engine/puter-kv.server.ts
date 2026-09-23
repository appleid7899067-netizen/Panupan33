/**
 * Server-side Puter KV client for Boss task memory.
 *
 * Uses the same token-init path as the GitHub agent (puter.js CJS init) so the
 * persisted state lives in the signed-in Puter user's cloud KV — it survives
 * server restarts and Render redeploys, unlike the in-memory taskStore.
 *
 * The auth token comes from the browser session on every request and is never
 * stored, logged, or returned to the client.
 */
import { createRequire } from "node:module";
import { bossKvKey, parseBossState, serializeBossState, type BossPersistedBlob } from "./task-persist";

type PuterKV = {
  set: (key: string, value: string) => Promise<unknown>;
  get: (key: string) => Promise<unknown>;
};
type PuterInstance = { kv?: PuterKV };

function initPuterServer(token: string): PuterInstance {
  const require = createRequire(import.meta.url);
  const { init } = require("@heyputer/puter.js/src/init.cjs") as { init: (token: string) => PuterInstance };
  return init(token);
}

/** Load the persisted Boss blob for a thread. Never throws — memory is best-effort. */
export async function loadBossBlob(
  authToken: string | undefined,
  threadId: string | undefined,
): Promise<BossPersistedBlob | null> {
  if (!authToken) return null;
  const key = bossKvKey(threadId, undefined);
  try {
    const puter = initPuterServer(authToken);
    if (!puter.kv) return null;
    const raw = await puter.kv.get(key);
    if (raw == null) return null;
    const parsed = parseBossState(raw);
    return parsed;
  } catch {
    return null;
  }
}

/** Save the persisted Boss blob for a thread. Returns true when the write succeeded. */
export async function saveBossBlob(
  authToken: string | undefined,
  threadId: string | undefined,
  blob: Omit<BossPersistedBlob, "version" | "updatedAt">,
): Promise<boolean> {
  if (!authToken) return false;
  const key = bossKvKey(threadId, undefined);
  try {
    const puter = initPuterServer(authToken);
    if (!puter.kv) return false;
    await puter.kv.set(key, serializeBossState(blob));
    return true;
  } catch {
    return false;
  }
}
