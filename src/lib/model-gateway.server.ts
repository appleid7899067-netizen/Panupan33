/**
 * Model Gateway — Puter-first model access with full server-side control.
 *
 * Product goal: Puter models are the MAIN path (free via the signed-in user's
 * Puter account). Boss keeps control of EVERYTHING else — messages, tools,
 * the tool loop, retries, budgets and verification all run in the Boss engine
 * on the server. The model is just a component the gateway asks for
 * text/tool-calls; it is a raw completion, never a Puter agent with its own autonomy.
 *
 * Provider order:
 *   1. Puter with the user's session token
 *   2. Puter with the server PUTER_AUTH_TOKEN
 *   3. OpenRouter with the server OPENROUTER_API_KEY
 *
 * The OpenRouter pool is intentionally free and focused on agentic/coding use.
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

/** Current Puter fallback. Keep the server pool small and reliable. */
export const PUTER_FALLBACK_POOL = ["gpt-5.6-luna"] as const;

/**
 * Current free OpenRouter agent/coding pool.
 * Old Nex-N2.5 and Ling 3.0 Flash Sante entries are removed.
 */
export const OPENROUTER_FALLBACK_POOL = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "poolside/laguna-s-2.1:free",
  "dots-studio/dots-3-note-preview:free",
  "nvidia/nemotron-3.5-lightning:free",
  "cohere/north-mini-code:free",
] as const;

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => v.trim())));
}

function readableError(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  if (value == null) return "Unknown model gateway error";
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "reason", "statusText"]) {
      const nested = readableError(rec[key]);
      if (nested && nested !== "Unknown model gateway error") return nested;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return "Unknown model gateway error";
    }
  }
  return String(value);
}

export function stripVendorPrefix(modelId: string): string {
  const idx = modelId.lastIndexOf("/");
  return idx > 0 ? modelId.slice(idx + 1) : modelId;
}

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

  // Only send a model to Puter when it looks like a Puter model id.
  // OpenRouter-style vendor/model ids must not consume Puter quota.
  const requestedLooksOpenRouter = requested.includes("/") || requested.includes(":free");
  const puterRequested = requestedLooksOpenRouter ? "" : requested;
  const puterModels = dedupe([
    puterRequested,
    puterRequested ? stripVendorPrefix(puterRequested) : "",
    ...PUTER_FALLBACK_POOL,
  ]).slice(0, 3);

  if (puterUser) {
    for (const model of puterModels) {
      plan.push({
        provider: "puter",
        token: puterUser,
        tokenScope: "user",
        model,
        label: `puter:user · ${model}`,
      });
    }
  } else if (puterServer) {
    for (const model of puterModels) {
      plan.push({
        provider: "puter",
        token: puterServer,
        tokenScope: "server",
        model,
        label: `puter:server · ${model}`,
      });
    }
  }

  if (openrouterKey) {
    for (const model of dedupe([requested, ...OPENROUTER_FALLBACK_POOL])) {
      plan.push({
        provider: "openrouter",
        token: openrouterKey,
        tokenScope: "server",
        model,
        label: `openrouter:server · ${model}`,
      });
    }
  }

  return plan.slice(0, opts.maxAttempts ?? 8);
}

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
    return [{
      id: rec.id ? String(rec.id) : undefined,
      name,
      arguments: parseArguments(fn.arguments ?? fn.input),
    }];
  });
}

function normalizePuterGatewayMessages(messages: GatewayMessage[]): GatewayMessage[] {
  // Puter-backed models accept only user/assistant roles. Tool results are already
  // represented as user messages by the Boss loop. On later rounds, strip the
  // OpenAI-style assistant tool_calls metadata because Puter rejects that shape
  // on some providers even though the first tool-call response is valid.
  return messages.map((message) => {
    const role = message.role;
    if (role !== "user" && role !== "assistant") {
      return { role: "user", content: String(message.content ?? "") };
    }
    if (role !== "assistant" || !message.tool_calls) {
      return { role, content: String(message.content ?? "") };
    }
    const calls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    const requested = calls.map((call) => {
      if (!call || typeof call !== "object") return "";
      const rec = call as Record<string, unknown>;
      const fn = rec.function && typeof rec.function === "object"
        ? rec.function as Record<string, unknown> : rec;
      return String(fn.name ?? "").trim();
    }).filter(Boolean);
    const content = String(message.content ?? "").trim();
    const note = requested.length ? `[Boss tool requests: ${requested.join(", ")}]` : "";
    return { role: "assistant", content: [content, note].filter(Boolean).join("\n") };
  });
}

export function createPuterCompleter(): ModelCompleter {
  return async ({ model, messages, tools, token }) => {
    const require = createRequire(import.meta.url);
    const { init } = require("@heyputer/puter.js/src/init.cjs") as {
      init: (t: string) => {
        ai: { chat: (m: unknown, o: Record<string, unknown>) => Promise<unknown> };
      };
    };
    const puter = init(token);
    const resp = await puter.ai.chat(normalizePuterGatewayMessages(messages), {
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

export type GatewayRunOptions = {
  messages: GatewayMessage[];
  tools: GatewayToolDef[];
  requestedModel?: string;
  puterToken?: string;
  onAttempt?: (label: string) => void;
  maxAttempts?: number;
  puterCompleter?: ModelCompleter;
  openrouterCompleter?: ModelCompleter;
};

export type GatewaySuccess = { ok: true; result: CompletionResult; attempt: ModelAttempt };
export type GatewayFailure = { ok: false; error: string; attempts: string[] };

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
      error: "ไม่มี model gateway ใช้ได้ — Sign in กับ Puter เพื่อใช้โมเดลฟรี หรือตั้ง OPENROUTER_API_KEY ใน server",
      attempts: [],
    };
  }

  const puter = opts.puterCompleter ?? createPuterCompleter();
  const openrouter = opts.openrouterCompleter ?? createOpenRouterCompleter();
  const attempts: string[] = [];
  let lastError = "";
  const seenErrors = new Set<string>();

  let puterQuotaExhausted = false;

  for (const attempt of plan) {
    // A depleted Puter allowance cannot be repaired by trying the same account
    // with another model. Skip the rest of the Puter pool and continue to the
    // server OpenRouter fallback when it is configured.
    if (puterQuotaExhausted && attempt.provider === "puter") continue;

    opts.onAttempt?.(attempt.label);
    attempts.push(attempt.label);
    const completer = attempt.provider === "puter" ? puter : openrouter;
    try {
      const result = await completer({
        model: attempt.model,
        messages: opts.messages,
        tools: opts.tools,
        token: attempt.token,
      });
      return { ok: true, result, attempt };
    } catch (e) {
      lastError = readableError(e);
      const lower = lastError.toLowerCase();
      if (attempt.provider === "puter" && /no usage left|usage.*left|quota|insufficient.*usage|usage.*exhaust|credit.*exhaust|out of credits/.test(lower)) {
        puterQuotaExhausted = true;
        opts.onAttempt?.("Puter quota หมด → ข้าม Puter ที่เหลือ → ใช้ fallback");
        continue;
      }
      const fingerprint = lastError.trim().slice(0, 500);
      if (fingerprint && seenErrors.has(fingerprint)) {
        opts.onAttempt?.(`หยุด retry ซ้ำ: ${fingerprint.slice(0, 180)}`);
        break;
      }
      if (fingerprint) seenErrors.add(fingerprint);
    }
  }

  return {
    ok: false,
    error: `ทุก model gateway ล้มเหลว (ลอง ${attempts.length} ครั้ง) — สาเหตุจริง: ${lastError.slice(0, 500)}`,
    attempts,
  };
}
