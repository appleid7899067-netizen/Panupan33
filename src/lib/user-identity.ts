const STORAGE_KEY = "bossnu:user-identity-v1";
const MIN_ID = 10000;
const MAX_ID = 99999;

export type BrowserIdentity = { id: number; shortId: string };

function createIdentity(): BrowserIdentity {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  const id = MIN_ID + (random[0] % (MAX_ID - MIN_ID + 1));
  return { id, shortId: String(id).padStart(5, "0") };
}

export function getBrowserIdentity(): BrowserIdentity {
  if (typeof window === "undefined") return { id: 30000, shortId: "30000" };
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing) as Partial<BrowserIdentity>;
      if (typeof parsed.id === "number" && parsed.id >= MIN_ID && parsed.id <= MAX_ID) {
        return { id: parsed.id, shortId: String(parsed.id).padStart(5, "0") };
      }
    }
    const identity = createIdentity();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    return identity;
  } catch {
    return createIdentity();
  }
}
