/**
 * SUPER 1: ONE CHAT - แชทเดียวเหมือน GPT แต่มี 100 อย่างข้างใน
 * รวม 100 ฟีเจอร์เป็นแชทเดียว
 */

import { useEffect, useState, useRef } from "react";
import { Send, Paperclip, Mic, ChevronDown, Sparkles, History, Plus, Trash2, X } from "lucide-react";
import { useFleet } from "@/lib/store";
import { backgroundLab } from "@/lib/background-sandbox";
import { freeAI } from "@/lib/autonomous";
import { runAgent, runAgentSandbox, runAgentStream } from "@/lib/agent.functions";
import { listPuterModels, loadPuter, type PuterModel } from "@/lib/puter";

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
  const [models, setModels] = useState<PuterModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [liveStream, setLiveStream] = useState<{ id: string; steps: string[]; active: boolean }>({ id: "", steps: [], active: false });
  const selectedModel = storedModel || "gpt-5.6-luna";
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
        if (!chatModels.some((m) => m.id === selectedModel) && chatModels.some((m) => m.id === "gpt-5.6-luna")) {
          setStoreModel("gpt-5.6-luna");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModels([
            { id: "gpt-5.6-luna", name: "GPT-5.6 Luna", provider: "openai" },
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

    const history = [
      ...thread.messages.slice(-24).map((m) => `${m.role.toUpperCase()}: ${m.content}`),
      `USER: ${userText}`,
    ].join("\n\n");
    const memory = useFleet.getState().memory.slice(0, 24).map((m) => m.text).join("\n- ");
    const context = [
      "Conversation context: remember and use the recent conversation. Do not make the user repeat information already present.",
      history ? `Recent conversation:\n${history}` : "",
      memory ? `Saved memory:\n- ${memory}` : "",
    ].filter(Boolean).join("\n\n");

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
          maxIterations: 6,
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

      {/* Messages แบบ GPT */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollerRef}
          className="h-full min-h-0 overflow-y-scroll overscroll-y-contain touch-pan-y px-4 py-6 sm:px-6 sm:py-7 space-y-6 [scrollbar-gutter:stable]"
          style={{ overflowAnchor: "none", WebkitOverflowScrolling: "touch" }}
          onScroll={(e) => {
            const el = e.currentTarget;
            const pinned = isNearBottom(el);
            isPinnedRef.current = pinned;
            setIsPinnedToBottom(pinned);
          }}
        >
        {thread?.messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
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
              {m.role === "assistant" && m.activity && m.activity.length > 0 && m.id === liveStream.id && liveStream.active && (
                <div className="mt-4 border-t border-zinc-800/80 pt-3 text-[12px]">
                  <div className="mb-2 flex items-center gap-2 text-zinc-400">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>กำลังทำงาน</span>
                    <span className="ml-auto text-[10px] uppercase tracking-widest text-emerald-400">live</span>
                  </div>
                  <div className="space-y-1.5 text-zinc-500">
                    {m.activity.slice(-6).map((a, i, arr) => {
                      const parts = a.split(": ");
                      const phase = parts[0] ?? "";
                      const detail = parts.slice(1).join(": ") || a;
                      return (
                        <div key={i} className={`flex gap-2 ${i === arr.length - 1 ? "text-zinc-200" : ""}`}>
                          <span className="select-none">{i === arr.length - 1 ? "›" : "✓"}</span>
                          <span><span className="text-zinc-500">{phase}</span>{detail ? ` · ${detail}` : ""}</span>
                        </div>
                      );
                    })}
                  </div>
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
            className="absolute bottom-4 left-1/2 -translate-x-1/2 size-9 rounded-full border border-zinc-700 bg-zinc-900/95 text-zinc-200 shadow-lg grid place-items-center hover:bg-zinc-800 transition"
          >
            <ChevronDown className="size-4" />
          </button>
        )}
      </div>

      {/* Input แบบ GPT */}
      <div className="shrink-0 p-3 sm:p-4 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
        <div className="relative flex items-end gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 p-2">
          <button className="size-8 grid place-items-center rounded-full hover:bg-zinc-800 text-zinc-500">
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
          <button className="size-8 grid place-items-center rounded-full hover:bg-zinc-800 text-zinc-500">
            <Mic className="size-4" />
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
