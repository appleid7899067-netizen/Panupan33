export type ProviderId = "openrouter" | "unknown";

export type ProviderDetection = {
  provider: ProviderId;
  label: string;
  detail: string;
};

export type OpenRouterModel = {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
};

export const API_KEY_CHANGED_EVENT = "bosses:api-key-changed";
export const OPENROUTER_MODELS_EVENT = "bosses:openrouter-models";

let memoryKey: string | null = null;
let cachedOpenRouterModels: OpenRouterModel[] = [];

function sessionGet() {
  try {
    return sessionStorage.getItem("bosses.ai.apiKey");
  } catch {
    return null;
  }
}
function sessionSet(value: string | null) {
  try {
    if (value) sessionStorage.setItem("bosses.ai.apiKey", value);
    else sessionStorage.removeItem("bosses.ai.apiKey");
  } catch {
    /* ignore */
  }
}

function notifyKeyChanged() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(API_KEY_CHANGED_EVENT));
    window.dispatchEvent(new CustomEvent(OPENROUTER_MODELS_EVENT, { detail: cachedOpenRouterModels }));
  } catch {
    /* ignore */
  }
}

export function getActiveApiKey() {
  return memoryKey ?? sessionGet();
}

export function getCachedOpenRouterModels() {
  return cachedOpenRouterModels;
}

export function clearActiveApiKey() {
  memoryKey = null;
  cachedOpenRouterModels = [];
  sessionSet(null);
  notifyKeyChanged();
}

export function hasOpenRouterKey() {
  return Boolean(getActiveApiKey());
}

export function detectKeyShape(key: string): ProviderDetection {
  const value = key.trim();
  if (/^sk-or-/i.test(value)) {
    return {
      provider: "openrouter",
      label: "OpenRouter",
      detail: "OpenRouter key. Boss will list models from OpenRouter and call OpenRouter only.",
    };
  }
  if (/^sk-ant-/i.test(value)) {
    return { provider: "unknown", label: "Anthropic", detail: "This slot accepts OpenRouter keys (sk-or-...) only." };
  }
  if (/^gsk_/i.test(value)) {
    return { provider: "unknown", label: "Groq", detail: "This slot accepts OpenRouter keys (sk-or-...) only." };
  }
  if (/^xai-/i.test(value)) {
    return { provider: "unknown", label: "xAI", detail: "This slot accepts OpenRouter keys (sk-or-...) only." };
  }
  if (/^AIza/i.test(value)) {
    return { provider: "unknown", label: "Google", detail: "This slot accepts OpenRouter keys (sk-or-...) only." };
  }
  return {
    provider: "unknown",
    label: "Unknown",
    detail: "Need an OpenRouter API key starting with sk-or-.",
  };
}

function isChatModel(model: OpenRouterModel) {
  return !/image|audio|video|embedding|rerank|transcription|moderation/i.test(model.id);
}

export async function verifyOpenRouterKey(
  key: string,
): Promise<{ ok: true; models: OpenRouterModel[] } | { ok: false; error: string }> {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${key.trim()}` },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      ok: false,
      error: `OpenRouter rejected the key (${response.status})${body ? `: ${body.slice(0, 180)}` : ""}`,
    };
  }
  const data = (await response.json()) as { data?: OpenRouterModel[] };
  const models = (Array.isArray(data.data) ? data.data : []).filter(isChatModel);
  if (!models.length) {
    return { ok: false, error: "OpenRouter key worked, but this account has no chat models to call." };
  }
  return { ok: true, models };
}

export async function connectApiKey(key: string): Promise<{ detection: ProviderDetection; models: OpenRouterModel[] }> {
  const value = key.trim();
  if (!value) throw new Error("API key is empty.");
  const detection = detectKeyShape(value);
  if (detection.provider !== "openrouter") {
    throw new Error(`${detection.label}: ${detection.detail}`);
  }
  const verified = await verifyOpenRouterKey(value);
  if (!verified.ok) throw new Error(verified.error);

  memoryKey = value;
  cachedOpenRouterModels = verified.models;
  sessionSet(value);
  notifyKeyChanged();
  return { detection, models: verified.models };
}

export function chooseOpenRouterModel(models: OpenRouterModel[], prompt: string): OpenRouterModel | null {
  if (!models.length) return null;
  const p = prompt.toLowerCase();
  const coding = /code|coding|debug|bug|error|repo|github|typescript|javascript|python|rust|go|java|sql|deploy|fix|แก้|โค้ด|บั๊ก/.test(
    p,
  );
  const preferred = coding
    ? ["anthropic/", "openai/", "google/", "deepseek/", "qwen/", "x-ai/", "mistralai/"]
    : ["openai/", "google/", "anthropic/", "deepseek/", "qwen/"];
  for (const prefix of preferred) {
    const found = models.find((m) => m.id.startsWith(prefix) && isChatModel(m));
    if (found) return found;
  }
  return models.find(isChatModel) ?? models[0] ?? null;
}

export async function callOpenRouter(opts: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model: string;
  onDelta?: (full: string) => void;
}) {
  const key = getActiveApiKey();
  if (!key) return { ok: false as const, error: "No OpenRouter API key is connected." };
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof location !== "undefined" ? location.origin : "https://developer.puter.com",
      "X-Title": "Bossnu SlieLo",
    },
    body: JSON.stringify({ model: opts.model, messages: opts.messages, stream: true }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return { ok: false as const, error: `OpenRouter error ${response.status}: ${body.slice(0, 500)}` };
  }
  if (!response.body) return { ok: false as const, error: "OpenRouter returned no response stream." };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const data = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
        const piece = data.choices?.[0]?.delta?.content ?? "";
        if (piece) {
          full += piece;
          opts.onDelta?.(full);
        }
      } catch {
        /* ignore partial JSON */
      }
    }
  }
  if (!full.trim()) return { ok: false as const, error: "OpenRouter returned an empty response." };
  return { ok: true as const, text: full, model: opts.model, gateway: "openrouter" as const };
}
