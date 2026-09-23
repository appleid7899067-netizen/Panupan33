# Boss ML / Reasoning modules

| # | Module | Technique | ผล |
|---|--------|-----------|-----|
| 1 | **Mini RAG** `mini-rag.ts` | TF‑IDF + Cosine Similarity | ดึงบริบทตรงคำถาม → ลด hallucination |
| 2 | **Prompt + Vote** `prompt-vote.ts` | Self-Consistency + JSON Schema | structured output เสมอ + vote คำตอบที่ดีที่สุด |
| 3 | **MLP + Backprop** `mlp.ts` | Neural net from scratch | เรียน XOR / รูปแบบ non-linear |

## 1. Mini RAG

```ts
import { ragAnswerContext, buildTfidfIndex, retrieve } from "@/lib/boss-engine";

const docs = [
  { id: "a", text: "Boss uses evidence gate before claiming success." },
  { id: "b", text: "Render start command is npm start." },
];
const { hits, context } = ragAnswerContext(docs, "how does boss verify?");
// inject `context` into the model prompt
```

## 2. Prompt + Vote

```ts
import { selfConsistencyPrompts, vote } from "@/lib/boss-engine";

const schema = {
  type: "object",
  properties: { answer: { type: "string" }, confidence: { type: "number" } },
  required: ["answer", "confidence"],
};
const prompts = selfConsistencyPrompts(userQ, 3, schema);
// run model 3 times → raw strings
const result = vote(rawStrings, schema);
// result.winner is majority JSON
```

## 3. MLP + Backprop

```ts
import { trainXorDemo, createMLP, trainEpoch, predict } from "@/lib/boss-engine";

const demo = trainXorDemo(2000);
// demo.accuracy should approach 1.0 on XOR
```
