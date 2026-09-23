/**
 * Model Gateway — Puter-first model access with full server-side control.
 *
 * Product goal: Puter models are the MAIN path (free via the signed-in user's
 * Puter account). Boss keeps control of EVERYTHING else — messages, tools,
 * the tool loop, retries, budgets and verification all run in the Boss engine
 * on the server. The model is just a component the gateway asks for
 * text/tool-calls; it is a raw `puter.ai.chat` completion, never a Puter
 * agent with its own autonomy.
 *
 * Provider order:
 *   1. Puter with the user's session token (user's free Puter quota)
 *   2. Puter with the server PUTER_AUTH_TOKEN (owner quota) — when the user
 *      is not signed in
 *   3. OpenRouter with the server OPENROUTER_API_KEY — legacy fallback
 *
 * Model-id strategy: the UI catalog uses OpenRouter-style ids
 * ("openai/gpt-5.6-luna") while Puter's registry uses its own ids
 * ("gpt-5.6-luna"). The gateway tries the requested id, then a vendor-stripped
 * variant, then the verified Puter pool — a rejected id simply falls through.
 *
 * Completers are injectable so unit tests cover the selection logic without
 * touching the network.
 */
import { createRequire } from "node:module";

export type GatewayMessage = Record<string, unknown>;

export type GatewayToolDef = {
  type: "function";
  function: { name: string; description: string; parameters: unknown };
};

export type GatewayToolCall = { id?: string; name: string; arguments: Record<string, unknown> };

export type CompletionResult = {
  text: string;
  toolCalls: GatewayToolCall[];
  model: string;
  provider: "puter" | "openrouter";
};

export type ModelCompleter = (input: {
  model: string;
  messages: GatewayMessage[];
  tools: GatewayToolDef[];
  token: string;
}) => Promise<CompletionResult>;

export type ModelAttempt = {
  provider: "puter" | "openrouter";
  token: string;
  tokenScope: "user" | "server";
  model: string;
  label: string;
};

/** Verified Puter registry models (same pool the GitHub agent uses). */
export const PUTER_FALLBACK_POOL = ["gpt-5.6-luna", "deepseek/deepseek-chat"] as const;

/** Free OpenRouter models — last-resort fallback pool. */
export const OPENROUTER_FALLBACK_POOL = [
  "nex-agi/nex-n2.5-pro:free",
  "nex-agi/nex-n2.5-mini:free",
] as const;

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => v.trim())));
}

/** "openai/gpt-5.6-luna" → "gpt-5.6-luna" (Puter ids have no vendor prefix). */
export function stripVendorPrefix(modelId: string): string {
  const idx = modelId.lastIndexOf("/");
  return idx > 0 ? modelId.slice(idx + 1) : modelId;
}

/**
 * Build the ordered provider/model plan. Puter (main) first, OpenRouter
 * (fallback) after. No credentials at all → empty plan (caller reports it).
 */
export function buildModelPlan(opts: {
  requested?: string;
  puterUserToken?: string;
  puterServerToken?: string;
  openrouterKey?: string;
  maxAttempts?: number;
}): ModelAttempt[] {
  const requested = (opts.requested ?? "").trim();
  const puterUser = opts.puterUserToken?.trim() || undefined;
  const puterServer = opts.puterServerToken?.trim() || undefined;
  const openrouterKey = opts.openrouterKey?.trim() || undefined;

  const plan: ModelAttempt[] = [];

  // MAIN path — Puter. Requested id, vendor-stripped variant, verified pool.
  const puterModels = dedupe([requested, requested ? stripVendorPrefix(requested) : "", ...PUTER_FALLBACK_POOL]).slice(0, 3);
  if (puterUser) {
    for (const model of puterModels) {
      plan.push({ provider: "puter", token: puterUser, tokenScope: "user", model, label: `puter:user · ${model}` });
    }
  } else if (puterServer) {
    for (const model of puterModels) {
      plan.push({ provider: "puter", token: puterServer, tokenScope: "server", model, label: `puter:server · ${model}` });
    }
  }

  // Fallback — OpenRouter (server key), requested id first, then free pool.
  if (openrouterKey) {
    for (const model of dedupe([requested, ...OPENROUTER_FALLBACK_POOL])) {
      plan.push({ provider: "openrouter", token: openrouterKey, tokenScope: "server", model, label: `openrouter:server · ${model}` });
    }
  }

  const max = opts.maxAttempts ?? 6;
  return plan.slice(0, max);
}

/* ------------------------------------------------------------------ */
/* Response parsing (OpenAI-shaped — both providers normalize to it)   */
/* ------------------------------------------------------------------ */

function completionText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(completionText).filter(Boolean).join("");
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec.text === "string") return rec.text;
    if (typeof rec.content === "string") return rec.content;
    if (Array.isArray(rec.content)) return completionText(rec.content);
    if (rec.message) return completionText(rec.message);
    if (Array.isArray(rec.choices)) {
      const first = rec.choices[0] as Record<string, unknown> | undefined;
      if (first?.message) return completionText(first.message);
      if (typeof first?.text === "string") return first.text;
    }
  }
  return "";
}

function parseArguments(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function parseToolCalls(response: unknown): GatewayToolCall[] {
  const message = (response as { message?: { tool_calls?: unknown } })?.message;
  const raw = message?.tool_calls;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const rec = item as Record<string, unknown>;
    const fn = (rec.function ?? rec) as Record<string, unknown>;
    const name = String(fn.name ?? "").trim();
    if (!name) return [];
    return [{ id: rec.id ? String(rec.id) : undefined, name, arguments: parseArguments(fn.arguments ?? fn.input) }];
  });
}

/* ------------------------------------------------------------------ */
/* Production completers                                               */
/* ------------------------------------------------------------------ */

export function createPuterCompleter(): ModelCompleter {
  return async ({ model, messages, tools, token }) => {
    const require = createRequire(import.meta.url);
    const { init } = require("@heyputer/puter.js/src/init.cjs") as {
      init: (t: string) => { ai: { chat: (m: unknown, o: Record<string, unknown>) => Promise<unknown> } };
    };
    const puter = init(token);
    const resp = await puter.ai.chat(messages, {
      model,
      tools: tools.length ? tools : undefined,
      stream: false,
      normalize: true,
    });
    return {
      text: completionText(resp),
      toolCalls: parseToolCalls(resp),
      model,
      provider: "puter",
    };
  };
}

export function createOpenRouterCompleter(): ModelCompleter {
  return async ({ model, messages, tools, token }) => {
    const httpResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://panupanboss.onrender.com",
        "X-Title": "Bossnu SlieLo",
      },
      body: JSON.stringify({
        model,
        messages,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? "auto" : undefined,
      }),
    });
    const raw = await httpResponse.text();
    if (!httpResponse.ok) throw new Error(`OpenRouter HTTP ${httpResponse.status}: ${raw.slice(0, 700)}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`OpenRouter returned invalid JSON: ${raw.slice(0, 700)}`);
    }
    const choice = (parsed as { choices?: Array<{ message?: unknown }> })?.choices?.[0];
    const modelResponse = choice?.message ? { message: choice.message } : parsed;
    return {
      text: completionText(modelResponse) || "",
      toolCalls: parseToolCalls(modelResponse),
      model,
      provider: "openrouter",
    };
  };
}

/* ------------------------------------------------------------------ */
/* Gateway runner                                                      */
/* ------------------------------------------------------------------ */

export type GatewayRunOptions = {
  messages: GatewayMessage[];
  tools: GatewayToolDef[];
  requestedModel?: string;
  /** User's Puter session token (main path). */
  puterToken?: string;
  onAttempt?: (label: string) => void;
  maxAttempts?: number;
  puterCompleter?: ModelCompleter;
  openrouterCompleter?: ModelCompleter;
};

export type GatewaySuccess = { ok: true; result: CompletionResult; attempt: ModelAttempt };
export type GatewayFailure = { ok: false; error: string; attempts: string[] };

/**
 * Ask a model for one completion, walking the Puter-first plan until one
 * provider/model works. The winning attempt (provider+token+model) is
 * returned so the caller can keep talking to the same model through the
 * tool loop.
 */
export async function runModelGateway(opts: GatewayRunOptions): Promise<GatewaySuccess | GatewayFailure> {
  const plan = buildModelPlan({
    requested: opts.requestedModel,
    puterUserToken: opts.puterToken,
    puterServerToken: process.env.PUTER_AUTH_TOKEN,
    openrouterKey: process.env.OPENROUTER_API_KEY,
    maxAttempts: opts.maxAttempts,
  });
  if (!plan.length) {
    return {
      ok: false,
      error:
        "ไม่มี model gateway ใช้ได้ — Sign in กับ Puter เพื่อใช้โมเดลฟรี (แนะนำ) หรือตั้ง OPENROUTER_API_KEY ใน server",
      attempts: [],
    };
  }
  const puter = opts.puterCompleter ?? createPuterCompleter();
  const openrouter = opts.openrouterCompleter ?? createOpenRouterCompleter();

  const attempts: string[] = [];
  let lastError = "";
  for (const attempt of plan) {
    opts.onAttempt?.(attempt.label);
    attempts.push(attempt.label);
    const completer = attempt.provider === "puter" ? puter : openrouter;
    try {
      const result = await completer({ model: attempt.model, messages: opts.messages, tools: opts.tools, token: attempt.token });
      return { ok: true, result, attempt };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, error: `ทุก model gateway ล้มเหลว (ลอง ${attempts.length} ครั้ง) — สกัดหลังสุด: ${lastError.slice(0, 300)}`, attempts };
}
