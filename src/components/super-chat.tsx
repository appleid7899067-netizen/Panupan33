/**
 * SUPER 1: ONE CHAT - แชทเดียวเหมือน GPT แต่มี 100 อย่างข้างใน
 * รวม 100 ฟีเจอร์เป็นแชทเดียว
 * BotStatusMd: แสดงสถานะแบบ Markdown + HTML
 */

import { useEffect, useState, useRef } from "react";
import { Send, Paperclip, Mic, ChevronDown, Sparkles, History, Plus, Trash2, X, Copy, Check, Square } from "lucide-react";
import { useFleet } from "@/lib/store";
import { runAgent, runAgentSandbox, runAgentStream } from "@/lib/agent.functions";
import { chatWithPuter, listPuterModels, loadPuter, type PuterModel } from "@/lib/puter";
import { executeWebSearch } from "@/lib/bossnugrok/skills/web-search";
import { compileChatContext } from "@/lib/context-compiler";
import { DEFAULT_PUTER_MODEL, POWER_PUTER_MODEL_IDS } from "@/lib/catalog";

function BossThinking({ text }: { text: string }) {
  return (
    <div className="text-xs text-zinc-500" aria-live="polite">
      <span className="inline-flex items-center gap-1">
        <span>{text}</span>
        <span className="inline-flex gap-0.5" aria-hidden="true">
          <span className="animate-bounce [animation-delay:-0.3s]">·</span>
          <span className="animate-bounce [animation-delay:-0.15s]">·</span>
          <span className="animate-bounce">·</span>
        </span>
      </span>
    </div>
  );
}

function BossMarkdown({ content }: { content: string }) {
  const fence = String.fromCharCode(96, 96, 96);
  const parts = content.split(fence);
  return (
    <div className="space-y-3 break-words">
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const lines = part.split("\n");
          const language = lines[0]?.trim() || "";
          const code = lines.slice(1).join("\n");
          const isHtml = /^(html|htm|xhtml)$/i.test(language);
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/90">
              {language && <div className="border-b border-zinc-800 px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500">{isHtml ? "HTML Preview" : language}</div>}
              {isHtml && (
                <div className="bg-white">
                  <iframe
                    title="HTML Preview"
                    srcDoc={code}
                    sandbox="allow-scripts"
                    className="block h-[min(520px,65vh)] w-full border-0"
                    style={{ colorScheme: "light" }}
                  />
                </div>
              )}
              <pre className="overflow-x-auto border-t border-zinc-800 p-3 text-[12px] leading-5 text-zinc-200"><code>{code}</code></pre>
            </div>
          );
        }
        return (
          <div key={i} className="space-y-1.5">
            {part.split("\n").map((line, j) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={j} className="h-1" />;
              if (/^#{1,6}\s/.test(trimmed)) return <div key={j} className="font-semibold text-zinc-100">{formatInline(trimmed.replace(/^#{1,6}\s+/, ""))}</div>;
              if (/^[-*]\s+/.test(trimmed)) return <div key={j} className="pl-3">{formatInline("• " + trimmed.replace(/^[-*]\s+/, ""))}</div>;
              if (/^\d+\.\s+/.test(trimmed)) return <div key={j}>{formatInline(trimmed)}</div>;
              if (/^>\s?/.test(trimmed)) return <div key={j} className="border-l-2 border-zinc-700 pl-3 text-zinc-400">{formatInline(trimmed.replace(/^>\s?/, ""))}</div>;
              return <div key={j}>{formatInline(line)}</div>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function formatInline(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|<br\s*\/?\s*>)/gi);
  return tokens.map((token, i) => {
    if (/^\*\*[^*]+\*\*$/.test(token)) return <strong key={i}>{token.slice(2, -2)}</strong>;
    if (/^<br\s*\/?\s*>$/i.test(token)) return <br key={i} />;
    return <span key={i}>{token}</span>;
  });
}

function displayAgentText(value: unknown): string {
  if (typeof value === "string") {
    return value
      .replaceAll("<tool_call>", "")
      .replaceAll("</tool_call>", "")
      .replaceAll("<arg_key>", "")
      .replaceAll("</arg_key>", "")
      .replaceAll("<arg_value>", "")
      .replaceAll("</arg_value>", "")
      .trim();
  }
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(displayAgentText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["text", "content", "message", "error", "detail"]) {
      if (record[key] !== undefined) {
        const nested = displayAgentText(record[key]);
        if (nested) return nested;
      }
    }
    try { return JSON.stringify(value, null, 2); } catch { return "[ผลลัพธ์ไม่สามารถแสดงได้]"; }
  }
  return String(value);
}

export function SuperChat() {
  const [input, setInput] = useState("");
  const storedModel = useFleet((s) => s.modelId);
  const setStoreModel = useFleet((s) => s.setModel);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(true);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [models, setModels] = useState<PuterModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [liveStream, setLiveStream] = useState<{ id: string; steps: string[]; active: boolean }>({ id: "", steps: [], active: false });
  const selectedModel = storedModel || DEFAULT_PUTER_MODEL;
  const selectedModelInfo = models.find((m) => m.id === selectedModel) ?? {
    id: selectedModel,
    name: selectedModel,
    provider: "puter",
  };

  const modelFallbacks: PuterModel[] = [
    { id: "nex-agi/nex-n2.5-pro:free", name: "Nex N2.5 Pro (ฟรี)", provider: "nex-agi" },
    { id: "dots-studio/dots-3-note-preview:free", name: "Dots 3 Note Preview (ฟรี)", provider: "dots-studio" },
    { id: "inclusionai/ling-3.0-flash-sante:free", name: "Ling 3.0 Flash Sante (ฟรี)", provider: "inclusionai" },
    { id: "nex-agi/nex-n2.5-mini:free", name: "Nex N2.5 Mini (ฟรี)", provider: "nex-agi" },
    { id: "upstage/solar-pro-4", name: "Solar Pro 4", provider: "upstage" },
    { id: "qwen/qwen3.7-flash", name: "Qwen 3.7 Flash", provider: "qwen" },
    { id: "deepseek/deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", provider: "deepseek" },
    { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "deepseek" },
    { id: "google/gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", provider: "google" },
    { id: "openai/gpt-5.6-luna", name: "GPT-5.6 Luna", provider: "openai" },
    { id: "openai/gpt-5.6-luna-pro", name: "GPT-5.6 Luna Pro", provider: "openai" },
    { id: "x-ai/grok-4-20-reasoning", name: "Grok 4.20 Reasoning", provider: "x-ai" },
  ];

  useEffect(() => {
    let cancelled = false;
    setModelsLoading(true);
    void listPuterModels()
      .then((items) => {
        if (cancelled) return;
        const liveModels = items
          .filter((m) => !/image|audio|video|embedding|rerank|moderation/i.test(m.id))
          .filter((m) => POWER_PUTER_MODEL_IDS.includes(m.id as (typeof POWER_PUTER_MODEL_IDS)[number]));
        const byId = new Map<string, PuterModel>();
        for (const model of modelFallbacks) byId.set(model.id, model);
        for (const model of liveModels) byId.set(model.id, model);
        const chatModels = [...byId.values()];
        setModels(chatModels);
        if (chatModels.length && !chatModels.some((m) => m.id === selectedModel)) {
          const preferred = chatModels.find((m) => m.id === DEFAULT_PUTER_MODEL) ?? chatModels[0];
          setStoreModel(preferred.id);
        }
      })
      .catch(() => {
        if (!cancelled) setModels(modelFallbacks);
      })
      .finally(() => { if (!cancelled) setModelsLoading(false); });
    return () => { cancelled = true; };
  }, [setStoreModel, selectedModel]);

  const threads = useFleet((s) => s.threads);
  const activeThreadId = useFleet((s) => s.activeThreadId);
  const appendMessage = useFleet((s) => s.appendMessage);
  const patchMessage = useFleet((s) => s.patchMessage);
  const patchActivity = useFleet((s) => s.patchActivity);
  const patchVerified = useFleet((s) => s.patchVerified);
  const newThread = useFleet((s) => s.newThread);
  const setActiveThread = useFleet((s) => s.setActiveThread);
  const deleteThread = useFleet((s) => s.deleteThread);
  const thread = threads.find(t => t.id === activeThreadId) ?? threads[0];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const isPinnedRef = useRef(true);

  const copyMessage = async (messageId: string, content: string) => {
    try { await navigator.clipboard.writeText(content); setCopiedMessage(messageId); window.setTimeout(() => setCopiedMessage(null), 1400); } catch { setCopiedMessage(null); }
  };

  const toggleVoice = () => {
    const Recognition = (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void } }).webkitSpeechRecognition;
    if (!Recognition) return;
    if (isListening) { setIsListening(false); return; }
    const recognition = new Recognition();
    recognition.lang = "th-TH";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => { const text = Array.from(event.results).map((r) => r[0]?.transcript ?? "").join(" "); setInput((v) => `${v}${v ? " " : ""}${text}`); };
    recognition.onend = () => setIsListening(false);
    setIsListening(true);
    recognition.start();
  };

  const isNearBottom = (el: HTMLDivElement, threshold = 80) =>
    el.scrollHeight - (el.scrollTop + el.clientHeight) <= threshold;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const pinned = isNearBottom(el);
      isPinnedRef.current = pinned;
      setIsPinnedToBottom(pinned);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !isPinnedRef.current) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [thread?.messages]);

  const pinToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = scrollerRef.current;
    if (!el) return;
    isPinnedRef.current = true;
    setIsPinnedToBottom(true);
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  const startNewChat = () => {
    newThread();
    setHistoryOpen(false);
    setModelMenuOpen(false);
    isPinnedRef.current = true;
    setIsPinnedToBottom(true);
    requestAnimationFrame(() => { if (scrollerRef.current) scrollerRef.current.scrollTop = 0; });
  };

  const openThread = (id: string) => {
    setActiveThread(id);
    setHistoryOpen(false);
    setModelMenuOpen(false);
    isPinnedRef.current = true;
    setIsPinnedToBottom(true);
    requestAnimationFrame(() => { if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight; });
  };

  const removeThread = (id: string) => {
    deleteThread(id);
    requestAnimationFrame(() => { if (scrollerRef.current) scrollerRef.current.scrollTop = 0; });
  };

  const handleAttachment = (file?: File) => {
    if (!file || !thread) return;
    const note = `แนบไฟล์: ${file.name} (${Math.ceil(file.size / 1024)} KB)`;
    appendMessage(thread.id, { role: "user", content: note, attachments: [{ name: file.name, size: file.size, type: file.type }] });
  };

  const handleSend = async () => {
    if (!input.trim() || !thread) return;
    const userText = input;
    setInput("");
    isPinnedRef.current = true;
    setIsPinnedToBottom(true);
    requestAnimationFrame(() => pinToBottom("auto"));
    appendMessage(thread.id, { role: "user", content: userText });
    const assistantId = appendMessage(thread.id, {
      role: "assistant",
      content: "กำลังเริ่มงาน…",
      model: selectedModel,
      activity: ["🧠 กำลังเริ่มงาน..."],
    });
    const context = compileChatContext({
      messages: thread.messages,
      memory: useFleet.getState().memory.map((m) => m.text),
      query: userText,
      maxMessages: 8,
      maxMemory: 6,
      maxChars: 12000,
    });
    const lastAssistant = [...thread.messages].reverse().find((message) => message.role === "assistant");
    const lastUser = [...thread.messages].reverse().find((message) => message.role === "user");
    const quickReply = /^(คับ|ครับ|ค่ะ|ใช่|โอเค|ok|ตกลง|ได้|ต่อเลย|ทำเลย|ขอบคุณ|ขอบใจ|รับทราบ|อืม|hello|hi|hey)[!.\s]*$/i.test(userText.trim());
    const lastAssistantState = [lastAssistant?.content || "", ...(lastAssistant?.activity || [])].join(" ");
    const hasActiveTask = Boolean(
      lastAssistant &&
      /กำลัง|ดำเนิน|ตรวจ|สแกน|ค้นหา|ค้นเว็บ|แก้|สร้าง|ทำงาน|รัน|ทดสอบ|deploy|ดีพลอย|เช็ค|เช็ก/i.test(lastAssistantState) &&
      lastUser &&
      lastUser.content.trim().length > 2,
    );
    const continueTask = quickReply && hasActiveTask;
    const wantsAgent = /(?:ทำให้|แก้|สร้าง|เขียน|deploy|ดีพลอย|github|git|repo|repository|โค้ด|code|run|รัน|ทดสอบ|sandbox|api|database|ฐานข้อมูล|ไฟล์|file|ติดตั้ง|เชื่อมต่อ|ตรวจสอบระบบ|แก้บั๊ก|bug|task|งาน|ค้นหา|search|เว็บ|ค้นเว็บ)/i.test(userText) || continueTask;

    if (!wantsAgent) {
      try {
        patchActivity(thread.id, assistantId, ["ตอบทันที"]);
        const result = await chatWithPuter({
          model: selectedModel,
          messages: [
            { role: "system", content: "You are Boss. Reply naturally and briefly. Do not invoke tools, plan work, or re-process unrelated history unless the user explicitly asks for a task." },
            ...(context ? [{ role: "system" as const, content: context }] : []),
            { role: "user", content: userText },
          ],
        });
        if (!result.ok) throw new Error(result.error);
        patchMessage(thread.id, assistantId, result.text);
        patchVerified(thread.id, assistantId, false);
        patchActivity(thread.id, assistantId, ["ตอบทันที · ไม่เปิด Agent"]);
        setLiveStream({ id: assistantId, steps: ["ตอบทันที · ไม่เปิด Agent"], active: false });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        patchMessage(thread.id, assistantId, "Boss ตอบไม่ได้ตอนนี้: " + message.slice(0, 500));
        patchVerified(thread.id, assistantId, false);
        patchActivity(thread.id, assistantId, []);
        return;
      }
    }

    const wantsWebSearch = /(?:^|\s)(ค้นหา|หาให้หน่อย|search|ค้นเว็บ|เว็บเกี่ยวกับ|หาข้อมูล)(?:\s|$)/i.test(userText);
    if (wantsWebSearch) {
      const searchSteps = ["🔎 กำลังค้นหา...", "🌐 Yandex"];
      patchActivity(thread.id, assistantId, searchSteps);
      setLiveStream({ id: assistantId, steps: searchSteps, active: true });
      try {
        const searchResult = await executeWebSearch(
          { query: userText, depth: "normal", engine: "yandex" },
          (chunk) => {
            const next = [...(liveStream.id === assistantId ? liveStream.steps : []), chunk.trim()].filter(Boolean).slice(-10);
            setLiveStream({ id: assistantId, steps: next, active: true });
            patchActivity(thread.id, assistantId, next);
          },
        );
        const response = searchResult.ok && searchResult.data
          ? searchResult.data.summary + "\n\n" + searchResult.data.results.map((r, i) => (i + 1) + ". " + r.title + "\n" + r.url).join("\n\n")
          : "ค้นเว็บไม่สำเร็จ: " + (searchResult.error || "ไม่ทราบสาเหตุ");
        patchMessage(thread.id, assistantId, response);
        patchVerified(thread.id, assistantId, searchResult.ok === true);
        patchActivity(thread.id, assistantId, [
          "search: yandex",
          "results: " + (searchResult.data?.results.length ?? 0),
          "duration: " + searchResult.duration + "ms",
        ]);
        setLiveStream((s) => s.id === assistantId ? { ...s, active: false } : s);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        patchMessage(thread.id, assistantId, "Yandex search failed: " + message);
        patchVerified(thread.id, assistantId, false);
        setLiveStream((s) => s.id === assistantId ? { ...s, active: false } : s);
        return;
      }
    }

    const sandboxMatch = userText.match(/```([\w-]+)?\n([\s\\S]*?)```/);
    const wantsSandbox = Boolean(sandboxMatch) || /(?:รันโค้ด|รัน code|run code|ทดสอบโค้ด|test code|sandbox)/i.test(userText);
    if (wantsSandbox) {
      const language = sandboxMatch?.[1] || "javascript";
      const code = sandboxMatch?.[2] || userText.replace(/^.*?(?:รันโค้ด|รัน code|run code|ทดสอบโค้ด|test code|sandbox)[:\s]*/i, "").trim();
      const sandbox = await runAgentSandbox({ language, code });
      const status = sandbox.ok ? "ผ่าน" : "ไม่ผ่าน";
      const output = [
        `🧪 Sandbox: ${status}`,
        sandbox.stdout ? `stdout:\n${sandbox.stdout}` : "",
        sandbox.stderr ? `stderr:\n${sandbox.stderr}` : "",
        `runtime: ${sandbox.runtime ?? "unknown"} | ${sandbox.durationMs ?? 0}ms`,
      ].filter(Boolean).join("\n\n");
      patchActivity(thread.id, assistantId, []);
      patchMessage(thread.id, assistantId, output);
      patchVerified(thread.id, assistantId, sandbox.ok);
      setLiveStream((s) => s.id === assistantId ? { ...s, active: false } : s);
      return;
    }

    try {
      patchActivity(thread.id, assistantId, [continueTask ? "🔄 กำลังทำงานต่อจากงานล่าสุด..." : "🧠 กำลังเริ่มตรวจงาน..."]);
      setLiveStream({ id: assistantId, steps: [continueTask ? "🔄 กำลังทำงานต่อจากงานล่าสุด..." : "🧠 กำลังเริ่มตรวจงาน..."], active: true });
      const puter = await loadPuter();
      const authToken = (puter as unknown as { authToken?: string }).authToken;
      let result: Awaited<ReturnType<typeof runAgent>> | null = null;
      const liveSteps: string[] = [];
      for await (const event of await runAgentStream({
        data: {
          prompt: continueTask
            ? `ทำงานต่อจากคำสั่งล่าสุดของผู้ใช้ทันที โดยไม่ต้องตอบรับสั้น ๆ และไม่ต้องถามยืนยันอีกครั้ง คำสั่งล่าสุดคือ: ${lastUser?.content || ""}`
            : userText,
          maxIterations: 3,
          context,
          ...(authToken ? { authToken } : {}),
          model: selectedModel,
        },
      })) {
        if (event.type === "step") {
          liveSteps.push(`${event.step.phase}: ${event.step.detail}`);
          const visibleSteps = liveSteps.slice(-10);
          patchActivity(thread.id, assistantId, visibleSteps);