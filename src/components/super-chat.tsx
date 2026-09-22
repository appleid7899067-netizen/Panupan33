/**
 * SUPER 1: ONE CHAT - แชทเดียวเหมือน GPT แต่มี 100 อย่างข้างใน
 * รวม 100 ฟีเจอร์เป็นแชทเดียว
 */

import { useEffect, useState, useRef } from "react";
import { Send, Paperclip, Mic, ChevronDown, Sparkles, History, Plus, Trash2, X, CheckCircle2, Circle, Activity, Copy, Check, Square } from "lucide-react";
import { useFleet } from "@/lib/store";
import { backgroundLab } from "@/lib/background-sandbox";
import { freeAI } from "@/lib/autonomous";
import { runAgent, runAgentSandbox, runAgentStream } from "@/lib/agent.functions";
import { chatWithPuter, listPuterModels, loadPuter, type PuterModel } from "@/lib/puter";
import { executeWebSearch } from "@/lib/bossnugrok/skills/web-search";
import { compileChatContext } from "@/lib/context-compiler";
import { DEFAULT_PUTER_MODEL } from "@/lib/catalog";

function displayAgentText(value: unknown): string {
  if (typeof value === "string") return value;
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

  useEffect(() => {
    let cancelled = false;
    setModelsLoading(true);
    void listPuterModels()
      .then((items) => {
        if (cancelled) return;
        const chatModels = items.filter((m) => !/image|audio|video|embedding|rerank|moderation/i.test(m.id));
        setModels(chatModels);
        if (chatModels.length && !chatModels.some((m) => m.id === selectedModel)) {
          const preferred = chatModels.find((m) => m.id === DEFAULT_PUTER_MODEL) ?? chatModels[0];
          setStoreModel(preferred.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModels([
            { id: DEFAULT_PUTER_MODEL, name: "GPT-5 Nano", provider: "openai" },
            { id: "gpt-5-nano", name: "GPT-5 Nano", provider: "openai" },
            { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic" },
            { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", provider: "google" },
          ]);
        }
      })
      .finally(() => { if (!cancelled) setModelsLoading(false); });
    return () => { cancelled = true; };
  }, [setStoreModel]);
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

    // เพิ่มข้อความ user
    appendMessage(thread.id, { role: "user", content: userText });

    // สร้างข้อความ assistant เปล่าๆ ไว้ก่อน
    const assistantId = appendMessage(thread.id, {
      role: "assistant",
      content: "กำลังทำงาน…",
      model: selectedModel,
      activity: ["วิเคราะห์"],
    });

    const context = compileChatContext({
      messages: thread.messages,
      memory: useFleet.getState().memory.map((m) => m.text),
      query: userText,
      maxMessages: 8,
      maxMemory: 6,
      maxChars: 12000,
    });

    // Fast lane: ordinary conversation never starts the Agent/tool loop.
    const wantsAgent = /(?:ทำให้|แก้|สร้าง|เขียน|deploy|ดีพลอย|github|git|repo|repository|โค้ด|code|run|รัน|ทดสอบ|sandbox|api|database|ฐานข้อมูล|ไฟล์|file|ติดตั้ง|เชื่อมต่อ|ตรวจสอบระบบ|แก้บั๊ก|bug|task|งาน|ค้นหา|search|เว็บ|ค้นเว็บ)/i.test(userText);
    const quickReply = /^(คับ|ครับ|ค่ะ|ใช่|โอเค|ok|ตกลง|ได้|ต่อเลย|ทำเลย|ขอบคุณ|ขอบใจ|รับทราบ|อืม|hello|hi|hey)[!.\\s]*$/i.test(userText.trim());

    if (!wantsAgent || quickReply) {
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

    // ประมวลผลแบบ ONE CHAT 100 อย่าง
    // ถ้าข้อความมี code block หรือสั่ง "รันโค้ด" ให้ Boss เรียก Sandbox โดยตรง
    const sandboxMatch = userText.match(/```([\\w-]+)?\n([\s\S]*?)```/);
    const wantsSandbox = Boolean(sandboxMatch) || /(?:รันโค้ด|รัน code|run code|ทดสอบโค้ด|test code|sandbox)/i.test(userText);
    if (wantsSandbox) {
      const language = sandboxMatch?.[1] || "javascript";
      const code = sandboxMatch?.[2] || userText
        .replace(/^.*?(?:รันโค้ด|รัน code|run code|ทดสอบโค้ด|test code|sandbox)[:\s]*/i, "")
        .trim();
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

    // Explicit web-search requests use Yandex as the default engine.
    const wantsWebSearch = /(?:^|\s)(ค้นหา|หาให้หน่อย|search|ค้นเว็บ|เว็บเกี่ยวกับ|หาข้อมูล)(?:\s|$)/i.test(userText);
    if (wantsWebSearch) {
      // Never leave the user staring at an empty assistant bubble while search is running.
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

    // ปกติ: ส่งข้อความเข้า Boss Agent จริง ไม่ใช้ template ตอบสำเร็จรูป
    try {
      patchActivity(thread.id, assistantId, ["วิเคราะห์", "เลือกเครื่องมือ", "ลงมือทำ"]);
      const puter = await loadPuter();
      const authToken = (puter as unknown as { authToken?: string }).authToken;
      let result: Awaited<ReturnType<typeof runAgent>> | null = null;
      const liveSteps: string[] = [];
      for await (const event of await runAgentStream({
        data: {
          prompt: userText,
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
          setLiveStream({ id: assistantId, steps: visibleSteps, active: true });
        } else if (event.type === "done") {
          result = event.result;
        }
      }
      if (!result) throw new Error("Agent stream ended without a final result.");
      const resultText = displayAgentText(result.text);
      const response = result.ok
        ? (resultText || "Boss ทำงานเสร็จแล้ว แต่ Agent ไม่ได้ส่งข้อความกลับมา")
        : `ยังทำงานนี้ไม่สำเร็จ: ${resultText || "Agent ไม่มีผลลัพธ์"}`;
      patchVerified(thread.id, assistantId, result.verified === true);
      patchMessage(thread.id, assistantId, response);
      patchActivity(thread.id, assistantId, liveSteps.slice(-10));
      setLiveStream({ id: assistantId, steps: liveSteps.slice(-10), active: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const response = `Boss เรียก Agent ไม่สำเร็จ: ${message.slice(0, 700)}`;
      patchActivity(thread.id, assistantId, []);
      patchVerified(thread.id, assistantId, false);
      patchMessage(thread.id, assistantId, response);
      setLiveStream((s) => s.id === assistantId ? { ...s, active: false } : s);
    }
  };

  return (
    <div className="relative flex flex-col h-full min-h-0 w-full max-w-5xl mx-auto overflow-hidden">
      <style>{`
        @keyframes boss-swoosh {
          0% { transform: translateX(-2px); opacity: .35; }
          45% { transform: translateX(30px); opacity: 1; }
          100% { transform: translateX(46px); opacity: .15; }
        }
      `}</style>

      {/* Boss + chat controls */}
      <div className="relative z-50 shrink-0 flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={() => setHistoryOpen(true)} className="size-9 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 grid place-items-center" aria-label="ประวัติแชท">
            <History className="size-4" />
          </button>
          <button type="button" onClick={startNewChat} className="size-9 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 grid place-items-center" aria-label="เริ่มแชทใหม่">
            <Plus className="size-4" />
          </button>
          <div className="ml-1 flex items-center min-w-0">
            <div className="size-8 rounded-full bg-white text-black grid place-items-center font-medium text-sm shrink-0">B</div>
            <div className="ml-2 min-w-0">
              <div className="text-sm font-medium text-zinc-100">Boss</div>
              <div className="text-[11px] text-zinc-500 truncate max-w-[120px]">{thread?.title || "New chat"}</div>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setModelMenuOpen((open) => !open)} className="flex items-center gap-2 max-w-[58%] rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-left hover:bg-zinc-800" aria-label="เลือกโมเดล">
          <Sparkles className="size-3.5 text-zinc-300 shrink-0" />
          <span className="truncate text-xs text-zinc-200">{modelsLoading ? "กำลังโหลดโมเดล..." : selectedModelInfo.name}</span>
          <ChevronDown className="size-3.5 text-zinc-500 shrink-0" />
        </button>
        {modelMenuOpen && (
          <div className="absolute right-4 top-[58px] z-[60] w-72 max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-1.5 shadow-2xl">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500">เลือกโมเดลสำหรับ Boss</div>
            {models.map((model) => (
              <button key={model.id} type="button" onClick={() => { setStoreModel(model.id); setModelMenuOpen(false); }} className={"flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-zinc-800 " + (model.id === selectedModel ? "bg-zinc-800" : "")}>
                <span className="min-w-0">
                  <span className="block truncate text-xs text-zinc-100">{model.name}</span>
                  <span className="block text-[10px] text-zinc-500">{model.provider ?? "Puter"}{model.context ? ` · ${Math.round(model.context / 1000)}k context` : ""}</span>
                </span>
                {model.id === selectedModel && <span className="ml-2 text-[10px] text-emerald-400">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {historyOpen && (
        <div className="absolute inset-0 z-40 bg-black/55" onClick={() => setHistoryOpen(false)}>
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,360px)] border-r border-zinc-800 bg-zinc-950 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div><div className="text-sm font-semibold text-zinc-100">ประวัติแชท</div><div className="text-[11px] text-zinc-500">{threads.length} ห้องแชท</div></div>
              <button type="button" onClick={() => setHistoryOpen(false)} className="size-9 rounded-xl hover:bg-zinc-800 grid place-items-center text-zinc-400" aria-label="ปิดประวัติ"><X className="size-4" /></button>
            </div>
            <div className="p-3">
              <button type="button" onClick={startNewChat} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-black hover:bg-zinc-200"><Plus className="size-4" /> เริ่มแชทใหม่</button>
              <div className="max-h-[calc(100dvh-150px)] overflow-y-auto space-y-1 pr-1">
                {threads.map((item) => (
                  <div key={item.id} className={"group flex items-center gap-1 rounded-xl border px-2 py-1.5 " + (item.id === activeThreadId ? "border-zinc-600 bg-zinc-800" : "border-transparent hover:bg-zinc-900")}>
                    <button type="button" onClick={() => openThread(item.id)} className="min-w-0 flex-1 px-2 py-2 text-left">
                      <div className="truncate text-sm text-zinc-100">{item.title || "New chat"}</div>
                      <div className="mt-0.5 text-[10px] text-zinc-500">{item.messages.length} ข้อความ · {new Date(item.updatedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</div>
                    </button>
                    <button type="button" onClick={() => removeThread(item.id)} className="size-8 shrink-0 rounded-lg text-zinc-600 hover:bg-red-950/60 hover:text-red-300 grid place-items-center" aria-label={"ลบแชท " + (item.title || "New chat")}><Trash2 className="size-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Messages: the only scrolling region. Header and composer remain outside it. */}
      <main
        ref={scrollerRef}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y px-4 py-6 pb-8 sm:px-6 sm:py-7 [scrollbar-gutter:stable]"
        style={{ overflowAnchor: "none", WebkitOverflowScrolling: "touch" }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const pinned = isNearBottom(el);
          isPinnedRef.current = pinned;
          setIsPinnedToBottom(pinned);
        }}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {thread?.messages.map((m) => (
            <div key={m.id} className={`group flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="size-7 rounded-full bg-zinc-800 border border-zinc-700 grid place-items-center shrink-0 mt-0.5">
                  <span className="text-[11px]">B</span>
                </div>
              )}
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                m.role === "user"
                  ? "bg-white text-black"
                  : "bg-zinc-900/80 border border-zinc-800 text-zinc-100"
              }`}>
                <div className="whitespace-pre-wrap">{m.content}</div>
                {m.role === "assistant" && m.activity && m.activity.length > 0 && (
                  <div className="mt-4 border-t border-zinc-800/80 pt-3 text-[12px]">
                    <button
                      type="button"
                      onClick={() => setTraceOpen((v) => !v)}
                      className="mb-3 flex w-full items-center gap-2 text-left text-zinc-300"
                    >
                      <span className="relative grid size-5 place-items-center rounded-md bg-emerald-500/10 text-emerald-400">
                        <Activity className="size-3.5" />
                        <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      </span>
                      <span className="font-medium">Boss Live</span>
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400">{m.id === liveStream.id && liveStream.active ? "streaming" : m.verified ? "verified" : "trace"}</span>
                      <ChevronDown className={`ml-auto size-3.5 text-zinc-500 transition-transform ${traceOpen ? "" : "-rotate-90"}`} />
                    </button>

                    {traceOpen && (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                          <div className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Task plan</div>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {["วิเคราะห์", "เลือกเครื่องมือ", "ลงมือทำ", "ตรวจสอบ"].map((phase, index) => {
                              const current = liveStream.steps.some((s) => s.toLowerCase().includes(phase.toLowerCase()));
                              const passed = index < Math.max(0, liveStream.steps.length - 1);
                              return (
                                <div key={phase} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${current ? "bg-emerald-500/10 text-zinc-100" : "text-zinc-500"}`}>
                                  {current || passed ? <CheckCircle2 className="size-3.5 text-emerald-400" /> : <Circle className="size-3.5" />}
                                  <span>{phase}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Execution trace</span>
                            <span className="text-[10px] text-zinc-600">{liveStream.steps.length} events</span>
                          </div>
                          <div className="space-y-1.5">
                            {(m.activity ?? []).slice(-8).map((a, i, arr) => {
                              const parts = a.split(": ");
                              const phase = parts[0] ?? "";
                              const detail = parts.slice(1).join(": ") || a;
                              return (
                                <div key={i} className={`flex gap-2 rounded-md px-1.5 py-1 ${i === arr.length - 1 ? "bg-zinc-900 text-zinc-100" : "text-zinc-500"}`}>
                                  <span className="mt-0.5 select-none">{i === arr.length - 1 ? "›" : "✓"}</span>
                                  <span className="min-w-0 break-words"><span className="text-zinc-500">{phase}</span>{detail ? ` · ${detail}` : ""}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-[10px] text-zinc-600">
                          <div className="flex items-center gap-2"><span className={`size-1.5 rounded-full ${m.id === liveStream.id && liveStream.active ? "bg-emerald-400 animate-pulse" : m.verified ? "bg-emerald-400" : "bg-zinc-600"}`} /><span>{m.id === liveStream.id && liveStream.active ? "ติดตามแบบเรียลไทม์ · ไม่เลื่อนหน้าจอผู้ใช้เอง" : m.verified ? "ตรวจสอบแล้วจาก Agent" : "เก็บ execution trace ไว้ตรวจย้อนหลัง"}</span></div>
                          {m.verified && <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="size-3" /> verified</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {m.role === "assistant" && m.content && (
                  <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button type="button" onClick={() => copyMessage(m.id, m.content)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="คัดลอกคำตอบ">{copiedMessage === m.id ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}</button>
                  </div>
                )}
              </div>
              {m.role === "user" && (
                <div className="size-7 rounded-full bg-zinc-700 grid place-items-center shrink-0 mt-0.5">
                  <span className="text-[11px]">U</span>
                </div>
              )}
            </div>
          ))}
        </div>
        {!isPinnedToBottom && (
          <button
            type="button"
            onClick={() => pinToBottom("smooth")}
            aria-label="เลื่อนไปข้อความล่าสุด"
            className="sticky bottom-4 z-20 mx-auto mt-4 size-9 -translate-x-1/2 rounded-full border border-zinc-700 bg-zinc-900/95 text-zinc-200 shadow-lg grid place-items-center hover:bg-zinc-800 transition"
          >
            <ChevronDown className="size-4" />
          </button>
        )}
      </main>

      {/* Composer: fixed by flex layout, never part of the message scroll. */}
      <div className="relative z-30 shrink-0 border-t border-zinc-800 bg-zinc-950/95 p-3 backdrop-blur-xl sm:p-4"><div className="relative flex items-end gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 p-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { handleAttachment(e.target.files?.[0]); e.currentTarget.value = ""; }} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="size-8 grid place-items-center rounded-full hover:bg-zinc-800 text-zinc-500" aria-label="แนบไฟล์">
            <Paperclip className="size-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="พิมพ์ข้อความถึง Boss..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 resize-none outline-none max-h-32 min-h-[24px] py-1.5"
            rows={1}
          />
          <button type="button" onClick={toggleVoice} className={`size-8 grid place-items-center rounded-full hover:bg-zinc-800 ${isListening ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500"}`} aria-label="พูดกับ Boss">
            {isListening ? <Square className="size-3" /> : <Mic className="size-4" />}
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="size-8 grid place-items-center rounded-full bg-white text-black disabled:opacity-30 disabled:bg-zinc-700"
          >
            <Send className="size-4" />
          </button>
        </div>
        
      </div>
    </div>
  );
}
