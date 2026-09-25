export type PuterUser = {
  username?: string;
  uuid?: string;
  email?: string;
  requires_phone_verification?: boolean;
};

type PuterChatPart = { text?: string; message?: unknown };

type PuterAPI = {
  auth: {
    signIn: (opts?: { attempt_temp_user_creation?: boolean; request_auth?: boolean }) => Promise<unknown>;
    signOut: () => Promise<void> | void;
    isSignedIn: () => boolean;
    getUser: () => Promise<PuterUser>;
  };
  ai: { chat: (prompt: unknown, options?: Record<string, unknown>) => Promise<unknown>; listModels?: (provider?: string) => Promise<unknown> };
};

declare global { interface Window { puter?: PuterAPI } }

const SCRIPT_SRC = "https://js.puter.com/v2/";
const CREDENTIAL_POLICY = `
Credential policy for Bossnu SlieLo — universal credential handling:
- Treat every credential as sensitive, regardless of provider or format: API keys, access tokens, OAuth tokens, JWTs, passwords, client secrets, private keys/PEM, SSH keys, database URLs with passwords, webhook secrets, signing secrets, cookies, session tokens, service-account JSON, and cloud credentials.
- First determine the task/service that needs the credential. Do not make the customer repeat the whole task just because a credential is missing.
- If a connected tool can perform the task without customer credentials, use that connected tool immediately.
- If the required credential is missing, say exactly: which service needs access, what operation is blocked, and the exact environment-variable/secret name or connection field needed. Ask only for the minimum missing credential.
- Prefer a secure provider/hosting Secrets or connection UI. Never ask a customer to paste a private key, PEM, password, token, cookie, or service-account JSON into ordinary chat.
- If a customer accidentally sends a secret in chat, do not quote, repeat, summarize, log, or place it into code, GitHub, prompts, model context, browser storage, localStorage, or analytics. Treat it as compromised, recommend rotation, and continue with a secure connection path.
- Never invent credentials and never claim a credential was installed, connected, tested, or used unless a real tool result confirms it.
- Public IDs, repository names, project IDs, account IDs, and service IDs are not secrets and may be requested normally.
- Credential names must be task-specific when possible (for example OPENAI_API_KEY, DATABASE_URL, VERCEL_TOKEN, RENDER_API_KEY, GITHUB_APP_PRIVATE_KEY). Do not require a customer to know the variable name if the bot can identify it from the service/task.
- If the customer says they cannot configure secrets themselves, give the shortest secure setup path for the current provider/hosting and keep the task context intact; do not ask them to expose the secret in chat.
- A credential request must never be tied to a vague 'which job?' question. Preserve the current task and name the exact blocked step.
- Never expose or return the value of any credential, even after a successful connection. Confirm only the service, scope, and connection state.
`;

function isBrowser() { return typeof window !== "undefined"; }
export function getPuter(): PuterAPI | null { return isBrowser() ? window.puter ?? null : null; }

export function loadPuter(): Promise<PuterAPI> {
  if (!isBrowser()) return Promise.reject(new Error("Puter runs in the browser only."));
  if (window.puter) return Promise.resolve(window.puter);
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  if (existing) return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (window.puter) return resolve(window.puter);
      if (Date.now() - start > 12000) return reject(new Error("Puter.js loaded but did not initialize."));
      requestAnimationFrame(tick);
    };
    existing.addEventListener("error", () => reject(new Error("Failed to load Puter.js.")));
    tick();
  });
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC; script.async = true;
    script.onload = () => {
      const start = Date.now();
      const tick = () => {
        if (window.puter) return resolve(window.puter);
        if (Date.now() - start > 8000) return reject(new Error("Puter.js loaded but did not initialize."));
        requestAnimationFrame(tick);
      }; tick();
    };
    script.onerror = () => reject(new Error("Failed to load Puter.js."));
    document.head.appendChild(script);
  });
}
export async function ensurePuter(): Promise<PuterAPI> { return getPuter() ?? loadPuter(); }
export async function getPuterAuthToken(): Promise<string | null> {
  try {
    const puter = await ensurePuter();
    const token = (puter as unknown as { authToken?: unknown }).authToken;
    return typeof token === "string" && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}
export type PuterModel = {
  id: string;
  provider?: string;
  name?: string;
  aliases?: string[];
  context?: number;
  max_tokens?: number;
  cost?: { currency?: string; tokens?: number; input?: number; output?: number };
};

export async function listPuterModels(provider?: string): Promise<PuterModel[]> {
  const puter = await ensurePuter();
  if (typeof puter.ai.listModels !== "function") return [];
  const models = await puter.ai.listModels(provider);
  return Array.isArray(models)
    ? models.filter((model): model is PuterModel => Boolean(model && typeof model === "object" && typeof (model as PuterModel).id === "string"))
    : [];
}


export function extractText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join("");
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec.text === "string") return rec.text;
    if (typeof rec.content === "string") return rec.content;
    if (Array.isArray(rec.content)) return extractText(rec.content);
    if (rec.message) return extractText(rec.message);
    if (Array.isArray(rec.choices)) {
      const first = rec.choices[0] as Record<string, unknown> | undefined;
      if (first?.message) return extractText(first.message);
      if (typeof first?.text === "string") return first.text;
    }
  }
  return "";
}

export type ChatTurn = { role: "system" | "user" | "assistant"; content: string };
export type ChatResult = { ok: true; text: string; model: string; activity?: string[]; verified?: boolean } | { ok: false; error: string; activity?: string[]; verified?: false };

function withCredentialPolicy(messages: ChatTurn[]): ChatTurn[] {
  const index = messages.findIndex((m) => m.role === "system");
  if (index < 0) return [{ role: "system", content: CREDENTIAL_POLICY.trim() }, ...messages];
  return messages.map((m, i) => i === index && !m.content.includes("Credential policy for Bossnu SlieLo — universal credential handling:")
    ? { ...m, content: `${m.content}\n\n${CREDENTIAL_POLICY.trim()}` } : m);
}

function friendlyError(err: unknown): string {
  const toText = (value: unknown): string => {
    if (value instanceof Error) return value.message;
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (value == null) return "Unknown error";
    if (typeof value === "object") {
      const rec = value as Record<string, unknown>;
      for (const key of ["message", "error", "detail", "description", "statusText"]) {
        if (rec[key] !== undefined) {
          const nested = toText(rec[key]);
          if (nested && nested !== "[object Object]") return nested;
        }
      }
      try {
        const json = JSON.stringify(value);
        if (json && json !== "{}") return json;
      } catch { /* intentionally ignored */ }
    }
    return String(value);
  };
  const raw = toText(err);
  const lower = raw.toLowerCase();
  if (lower.includes("popup") || lower.includes("blocked")) return "Popup blocked. Allow popups for this site, then sign in with Puter.";
  if (lower.includes("auth_window_closed") || lower.includes("closed")) return "Sign-in window closed. Try again — Puter is required for free models.";
  if (lower.includes("not signed") || lower.includes("unauthorized") || lower.includes("auth")) return "Sign in with Puter to use free models.";
  return raw.slice(0, 700);
}

let signInInFlight: Promise<PuterUser | null> | null = null;

export async function signInWithPuter(forceReauth = false): Promise<PuterUser | null> {
  if (signInInFlight) return signInInFlight;
  signInInFlight = (async () => {
    const puter = await ensurePuter();
    if (puter.auth.isSignedIn() && !forceReauth) {
      try {
        const user = await puter.auth.getUser();
        if (user.requires_phone_verification) return null;
        return user;
      } catch { return null; }
    }
    await puter.auth.signIn(forceReauth ? { request_auth: true } : undefined);
    if (!puter.auth.isSignedIn()) return null;
    try {
      const user = await puter.auth.getUser();
      if (user.requires_phone_verification) return null;
      return user;
    } catch {
      return null;
    }
  })();
  try {
    return await signInInFlight;
  } finally {
    signInInFlight = null;
  }
}
export async function signOutPuter() { const puter = await ensurePuter(); await puter.auth.signOut(); }
export async function currentPuterUser(): Promise<PuterUser | null> {
  try {
    const puter = await ensurePuter();
    if (!puter.auth.isSignedIn()) return null;
    const user = await puter.auth.getUser();
    if (user.requires_phone_verification) return null;
    return user;
  } catch {
    return null;
  }
}

function isRetryableError(err: unknown): boolean {
  const raw = friendlyError(err).toLowerCase();
  return /timeout|timed out|rate.?limit|429|500|502|503|504|network|fetch|temporar|overload|capacity|unavailable|model_not_found|model not found|invalid model|unknown model|does not exist/.test(raw);
}

function rankModel(model: PuterModel): number {
  const text = `${model.id} ${model.name ?? ""} ${model.provider ?? ""}`.toLowerCase();
  if (/deepseek.*(v4|reason|pro)|grok.*(4|reason)|claude.*(sonnet|opus)|gemini.*(pro|flash)|gpt-/.test(text)) return 80;
  if (/deepseek|qwen|glm|kimi|mistral|llama/.test(text)) return 60;
  return 40;
}

function costScore(model: PuterModel): number {
  return Number(model.cost?.input ?? 0) + Number(model.cost?.output ?? 0);
}

export function buildPuterModelPool(models: PuterModel[], preferred: string): string[] {
  const unique = new Map<string, PuterModel>();
  for (const model of models) if (model.id && !unique.has(model.id)) unique.set(model.id, model);
  const ranked = [...unique.values()]
    .filter((model) => model.id !== preferred)
    .sort((a, b) => (rankModel(b) - rankModel(a)) || (costScore(a) - costScore(b)));
  return [preferred, ...ranked.map((model) => model.id).slice(0, 5)];
}

// Puter-compatible message normalization:
// Some Puter-backed providers accept only user/assistant roles. Preserve
// system instructions by folding them into the next user turn instead of
// sending an unsupported system role to the provider.
function normalizePuterMessages(messages: ChatTurn[]): Array<{ role: "user" | "assistant"; content: string }> {
  const normalized: Array<{ role: "user" | "assistant"; content: string }> = [];
  let pendingSystem: string[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      if (message.content.trim()) pendingSystem.push(message.content.trim());
      continue;
    }

    if (message.role === "user" && pendingSystem.length) {
      const prefix = pendingSystem.join("\\n\\n");
      normalized.push({ role: "user", content: `${prefix}\\n\\n--- User request ---\\n${message.content}` });
      pendingSystem = [];
      continue;
    }

    normalized.push({ role: message.role, content: message.content });
  }

  // A system-only request still needs a supported role.
  if (pendingSystem.length) {
    normalized.push({ role: "user", content: pendingSystem.join("\\n\\n") });
  }

  return normalized;
}

export async function chatWithPuter(opts: { messages: ChatTurn[]; model: string; fallbackModels?: string[]; onDelta?: (full: string) => void }): Promise<ChatResult> {
  let puter: PuterAPI;
  try { puter = await ensurePuter(); } catch (err) { return { ok: false, error: friendlyError(err) }; }
  if (!puter.auth.isSignedIn()) return { ok: false, error: "Puter ยังไม่ได้เข้าสู่ระบบ กรุณากด Sign in with Puter ก่อน แล้วจึงลองส่งอีกครั้ง" };
  try {
    const user = await puter.auth.getUser();
    if (user.requires_phone_verification) return { ok: false, error: "Puter session ต้องยืนยันเบอร์โทร กรุณา sign in ใหม่" };
  } catch { return { ok: false, error: "Puter session ยังไม่พร้อม กรุณากด Sign in with Puter อีกครั้ง" }; }

  const payload = normalizePuterMessages(withCredentialPolicy(opts.messages));
  const catalog = await listPuterModels().catch(() => []);
  const pool = Array.from(new Set([opts.model, ...(opts.fallbackModels ?? []), ...buildPuterModelPool(catalog, opts.model)])).slice(0, 7);

  let lastError = "Unknown error";
  for (const model of pool) {
    try {
      const resp = await puter.ai.chat(payload, { model, stream: true, normalize: true });
      if (resp && typeof resp === "object" && Symbol.asyncIterator in (resp as object)) {
        let full = "";
        for await (const part of resp as AsyncIterable<PuterChatPart | string>) {
          const piece = typeof part === "string" ? part : extractText(part);
          if (!piece) continue;
          full += piece;
          opts.onDelta?.(full);
        }
        if (full.trim()) return { ok: true, text: full, model, verified: false };
      } else {
        const text = extractText(resp);
        if (text.trim()) { opts.onDelta?.(text); return { ok: true, text, model, verified: false }; }
      }
      lastError = `Empty response from ${model}`;
    } catch (err) {
      lastError = friendlyError(err);
      if (!isRetryableError(err)) break;
    }
  }
  return { ok: false, error: lastError };
}
