/**
 * TEMP: run on your machine to fully restore:
 * curl -sL 'https://raw.githubusercontent.com/appleid7899067-netizen/Panupan33/721a83368270afcfbb016d3f4ee2939e222b4dde/src/components/super-chat.tsx' -o src/components/super-chat.tsx
 * Then replace the setModels fallback list with free models from catalog POWER_PUTER_MODEL_IDS.
 *
 * Core Codex agent + free models already live in:
 * - src/lib/catalog.ts
 * - src/lib/tool-registry.ts
 * - src/lib/agent-loop.ts
 * - src/lib/agent.functions.ts
 */
import { useEffect, useState } from "react";
import { useFleet } from "@/lib/store";
import { chatWithPuter, listPuterModels, type PuterModel } from "@/lib/puter";
import { DEFAULT_PUTER_MODEL, POWER_PUTER_MODEL_IDS } from "@/lib/catalog";

const FREE_FALLBACK: PuterModel[] = [
  { id: "openrouter:qwen/qwen3-coder", name: "Qwen3 Coder (ฟรี)", provider: "qwen" },
  { id: "openrouter:deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3 (ฟรี)", provider: "deepseek" },
  { id: "openrouter:deepseek/deepseek-r1", name: "DeepSeek R1 (ฟรี)", provider: "deepseek" },
  { id: "openrouter:meta-llama/llama-4-maverick", name: "Llama 4 Maverick (ฟรี)", provider: "meta" },
  { id: "openrouter:google/gemma-3-27b-it", name: "Gemma 3 27B (ฟรี)", provider: "google" },
  { id: "openrouter:mistralai/devstral-small", name: "Devstral Small (ฟรี)", provider: "mistral" },
  { id: "upstage/solar-pro-4", name: "Solar Pro 4", provider: "upstage" },
  { id: "x-ai/grok-4-20-reasoning", name: "Grok 4.20 Reasoning", provider: "xai" },
];

export function SuperChat() {
  const [input, setInput] = useState("");
  const storedModel = useFleet((s) => s.modelId);
  const setStoreModel = useFleet((s) => s.setModel);
  const [models, setModels] = useState<PuterModel[]>(FREE_FALLBACK);
  const [reply, setReply] = useState("");
  const selectedModel = storedModel || DEFAULT_PUTER_MODEL;

  useEffect(() => {
    void listPuterModels()
      .then((items) => {
        const chatModels = items
          .filter((m) => !/image|audio|video|embedding|rerank|moderation/i.test(m.id))
          .filter((m) => (POWER_PUTER_MODEL_IDS as readonly string[]).includes(m.id));
        if (chatModels.length) setModels(chatModels);
      })
      .catch(() => setModels(FREE_FALLBACK));
  }, []);

  const send = async () => {
    if (!input.trim()) return;
    const q = input;
    setInput("");
    setReply("กำลังคิด…");
    const result = await chatWithPuter({
      model: selectedModel,
      messages: [
        { role: "system", content: "You are Boss (Codex-style). Follow user intent fully. Do not dump tools. Work step by step." },
        { role: "user", content: q },
      ],
    });
    setReply(result.ok ? result.text : "Error: " + result.error);
  };

  return (
    <div className="flex h-full flex-col max-w-3xl mx-auto p-4 gap-3">
      <div className="text-sm text-zinc-400">Boss · Codex mode · โมเดลฟรีในรายการด้านล่าง</div>
      <select
        className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        value={selectedModel}
        onChange={(e) => setStoreModel(e.target.value)}
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.name || m.id}</option>
        ))}
      </select>
      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200 whitespace-pre-wrap">
        {reply || "พิมพ์ข้อความด้านล่าง — บอททำงานตามเจตนาทีละขั้น (ไม่ดึง toolbox ทั้งชุด)"}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="สั่งงาน Boss…"
        />
        <button type="button" onClick={send} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">ส่ง</button>
      </div>
      <p className="text-[11px] text-zinc-600">
        Agent หลัก (catalog / tool-registry / agent-loop) อัปเดตเป็น Codex-style แล้ว — UI เต็มกู้ด้วย commit 721a833 ถ้าต้องการ layout เดิม
      </p>
    </div>
  );
}
