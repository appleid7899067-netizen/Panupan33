/**
 * Mini RAG — TF‑IDF + Cosine Similarity
 * ดึงบริบทตรงคำถาม → ลด hallucination
 */

export type RagDoc = {
  id: string;
  text: string;
  meta?: Record<string, unknown>;
};

export type RagHit = {
  id: string;
  text: string;
  score: number;
  meta?: Record<string, unknown>;
};

const THAI_STOP = new Set([
  "ที่", "และ", "ของ", "ใน", "เป็น", "มี", "ให้", "ได้", "จะ", "ไม่", "ว่า", "กับ", "จาก", "นี้", "นั้น",
  "the", "a", "an", "is", "are", "to", "of", "in", "for", "on", "with", "and", "or",
]);

/** Tokenize: Latin words + Thai runs + numbers. */
export function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const parts = lower.match(/[a-z0-9_]+|[\u0e00-\u0e7f]+/g) ?? [];
  return parts.filter((t) => t.length > 1 && !THAI_STOP.has(t));
}

function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const n = tokens.length || 1;
  for (const [k, v] of tf) tf.set(k, v / n);
  return tf;
}

export type TfidfIndex = {
  docs: RagDoc[];
  /** idf per term */
  idf: Map<string, number>;
  /** docId → tf-idf vector */
  vectors: Map<string, Map<string, number>>;
};

export function buildTfidfIndex(docs: RagDoc[]): TfidfIndex {
  const df = new Map<string, number>();
  const tokenized = docs.map((d) => ({ id: d.id, tokens: tokenize(d.text) }));

  for (const { tokens } of tokenized) {
    const uniq = new Set(tokens);
    for (const t of uniq) df.set(t, (df.get(t) ?? 0) + 1);
  }

  const N = Math.max(1, docs.length);
  const idf = new Map<string, number>();
  for (const [term, c] of df) {
    idf.set(term, Math.log((N + 1) / (c + 1)) + 1);
  }

  const vectors = new Map<string, Map<string, number>>();
  for (const { id, tokens } of tokenized) {
    const tf = termFreq(tokens);
    const vec = new Map<string, number>();
    for (const [term, f] of tf) {
      vec.set(term, f * (idf.get(term) ?? 0));
    }
    vectors.set(id, vec);
  }

  return { docs, idf, vectors };
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [, v] of a) na += v * v;
  for (const [, v] of b) nb += v * v;
  if (na === 0 || nb === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [k, v] of small) {
    const u = large.get(k);
    if (u != null) dot += v * u;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function queryVector(query: string, idf: Map<string, number>): Map<string, number> {
  const tf = termFreq(tokenize(query));
  const vec = new Map<string, number>();
  for (const [term, f] of tf) {
    const w = idf.get(term);
    if (w != null) vec.set(term, f * w);
  }
  return vec;
}

/** Retrieve top-k docs by cosine similarity on TF‑IDF. */
export function retrieve(
  index: TfidfIndex,
  query: string,
  topK = 5,
  minScore = 0.02,
): RagHit[] {
  const q = queryVector(query, index.idf);
  const hits: RagHit[] = [];
  for (const doc of index.docs) {
    const vec = index.vectors.get(doc.id);
    if (!vec) continue;
    const score = cosine(q, vec);
    if (score < minScore) continue;
    hits.push({ id: doc.id, text: doc.text, score, meta: doc.meta });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, topK);
}

/** Build a grounded context block for the model (anti-hallucination). */
export function formatRagContext(hits: RagHit[], maxChars = 4000): string {
  if (!hits.length) return "(no retrieved context)";
  const parts: string[] = ["RETRIEVED CONTEXT (use only these facts; if missing say you don't know):"];
  let used = parts[0].length;
  for (const h of hits) {
    const block = `\n[${h.id} score=${h.score.toFixed(3)}] ${h.text}`;
    if (used + block.length > maxChars) break;
    parts.push(block);
    used += block.length;
  }
  return parts.join("");
}

/** One-shot: index docs + retrieve + format. */
export function ragAnswerContext(docs: RagDoc[], query: string, topK = 5): {
  hits: RagHit[];
  context: string;
} {
  const index = buildTfidfIndex(docs);
  const hits = retrieve(index, query, topK);
  return { hits, context: formatRagContext(hits) };
}
