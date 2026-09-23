/**
 * Prompt + Vote — Self-Consistency + JSON Schema
 * ตอบ structured output เสมอ + vote หาคำตอบที่ดีที่สุดจากหลายรอบ
 */

export type JsonSchemaLite = {
  type?: string;
  properties?: Record<string, JsonSchemaLite>;
  required?: string[];
  items?: JsonSchemaLite;
  enum?: unknown[];
};

export type VoteCandidate<T = unknown> = {
  raw: string;
  parsed: T | null;
  valid: boolean;
  errors: string[];
};

export type VoteResult<T = unknown> = {
  winner: T | null;
  winnerRaw: string;
  votes: number;
  total: number;
  candidates: VoteCandidate<T>[];
  agreement: number;
};

/** Extract first JSON object/array from a model string. */
export function extractJson(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  // fenced
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    const inner = fence[1].trim();
    if (inner.startsWith("{") || inner.startsWith("[")) return inner;
  }
  const startObj = trimmed.indexOf("{");
  const startArr = trimmed.indexOf("[");
  let start = -1;
  if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr);
  else start = Math.max(startObj, startArr);
  if (start < 0) return null;
  const slice = trimmed.slice(start);
  // brace match
  const open = slice[0];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < slice.length; i++) {
    const c = slice[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return slice.slice(0, i + 1);
    }
  }
  return null;
}

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

/** Lightweight schema check (not full JSON Schema). */
export function validateAgainstSchema(value: unknown, schema?: JsonSchemaLite): string[] {
  if (!schema) return [];
  const errors: string[] = [];
  if (schema.enum && !schema.enum.some((e) => e === value)) {
    errors.push(`value not in enum`);
  }
  if (schema.type) {
    const t = typeOf(value);
    const expected = schema.type === "integer" ? "number" : schema.type;
    if (schema.type === "integer" && (typeof value !== "number" || !Number.isInteger(value))) {
      errors.push(`expected integer`);
    } else if (schema.type !== "integer" && t !== expected && !(schema.type === "object" && t === "object")) {
      if (!(schema.type === "number" && t === "number")) errors.push(`expected type ${schema.type}, got ${t}`);
    }
  }
  if (schema.type === "object" && value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const req of schema.required ?? []) {
      if (!(req in obj)) errors.push(`missing required: ${req}`);
    }
    if (schema.properties) {
      for (const [k, sub] of Object.entries(schema.properties)) {
        if (k in obj) errors.push(...validateAgainstSchema(obj[k], sub).map((e) => `${k}: ${e}`));
      }
    }
  }
  if (schema.type === "array" && Array.isArray(value) && schema.items) {
    value.forEach((item, i) => {
      errors.push(...validateAgainstSchema(item, schema.items).map((e) => `[${i}]: ${e}`));
    });
  }
  return errors;
}

export function parseCandidate<T = unknown>(raw: string, schema?: JsonSchemaLite): VoteCandidate<T> {
  const jsonStr = extractJson(raw);
  if (!jsonStr) {
    return { raw, parsed: null, valid: false, errors: ["no JSON found"] };
  }
  try {
    const parsed = JSON.parse(jsonStr) as T;
    const errors = validateAgainstSchema(parsed, schema);
    return { raw, parsed, valid: errors.length === 0, errors };
  } catch (e) {
    return { raw, parsed: null, valid: false, errors: [e instanceof Error ? e.message : "parse error"] };
  }
}

function stableKey(value: unknown): string {
  try {
    return JSON.stringify(value, Object.keys(value as object).sort());
  } catch {
    return String(value);
  }
}

/**
 * Majority vote among valid candidates (self-consistency).
 * Ties → first highest-frequency valid candidate.
 */
export function vote<T = unknown>(rawOutputs: string[], schema?: JsonSchemaLite): VoteResult<T> {
  const candidates = rawOutputs.map((r) => parseCandidate<T>(r, schema));
  const counts = new Map<string, { value: T; n: number; raw: string }>();
  for (const c of candidates) {
    if (!c.valid || c.parsed === null) continue;
    const key = stableKey(c.parsed);
    const prev = counts.get(key);
    if (prev) prev.n += 1;
    else counts.set(key, { value: c.parsed, n: 1, raw: c.raw });
  }
  let winner: T | null = null;
  let winnerRaw = "";
  let votes = 0;
  for (const [, v] of counts) {
    if (v.n > votes) {
      votes = v.n;
      winner = v.value;
      winnerRaw = v.raw;
    }
  }
  const validCount = candidates.filter((c) => c.valid).length;
  return {
    winner,
    winnerRaw,
    votes,
    total: rawOutputs.length,
    candidates,
    agreement: validCount ? votes / validCount : 0,
  };
}

/** Prompt suffix forcing JSON Schema shaped output. */
export function structuredOutputInstruction(schema: JsonSchemaLite, hint?: string): string {
  return [
    "Respond with ONLY valid JSON matching this schema (no markdown outside JSON):",
    JSON.stringify(schema, null, 2),
    hint ? `Hint: ${hint}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Build n slightly-varied prompts for self-consistency sampling.
 * Caller runs the model n times, then vote().
 */
export function selfConsistencyPrompts(basePrompt: string, n = 3, schema?: JsonSchemaLite): string[] {
  const schemaPart = schema ? "\n\n" + structuredOutputInstruction(schema) : "\n\nRespond with JSON only.";
  const seeds = [
    "Think carefully, then answer.",
    "Double-check facts, then answer.",
    "Be precise and minimal, then answer.",
    "Prefer grounded evidence, then answer.",
    "Avoid speculation, then answer.",
  ];
  const out: string[] = [];
  for (let i = 0; i < Math.max(1, n); i++) {
    out.push(`${basePrompt}\n\n${seeds[i % seeds.length]}${schemaPart}`);
  }
  return out;
}
