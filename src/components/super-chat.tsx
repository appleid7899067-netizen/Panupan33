/**
 * SUPER 1: ONE CHAT - แชทเดียวเหมือน GPT แต่มี 100 อย่างข้างใน
 * รวม 100 ฟีเจอร์เป็นแชทเดียว
 * BotStatusMd: แสดงสถานะแบบ Markdown + HTML
 */

import { useEffect, useState, useRef } from "react";
import { unzipSync, strFromU8 } from "fflate";
import { Send, Paperclip, Mic, ChevronDown, Sparkles, History, Plus, Trash2, X, Copy, Check, Download, Square, Github, KeyRound, Eye, Heart, ThumbsUp, Palette } from "lucide-react";
import { useFleet } from "@/lib/store";
import { runAgent, runAgentSandbox, runAgentStream } from "@/lib/agent.functions";
import { chatWithPuter, listPuterModels, loadPuter, type PuterModel } from "@/lib/puter";
import { executeWebSearch } from "@/lib/bossnugrok/skills/web-search";
import { compileChatContext } from "@/lib/context-compiler";
import { DEFAULT_PUTER_MODEL } from "@/lib/catalog";
import { BossLiveActivity } from "@/components/boss-live-activity";
import { McpUiBlock, type McpUiPayload } from "@/components/mcp-ui-block";
import { createArenaSession, createArenaChoiceContext, type ArenaSession } from "@/lib/boss-engine/boss-arena";

/**
 * MCP tools can return a structured UI payload; the agent loop forwards it as a step
 * whose detail is `MCP_UI:{json}`. Steps arrive here prefixed with their phase
 * (`observe: MCP_UI:{json}`), so the marker is located inside the string.
 */
const MCP_UI_MARKER = "MCP_UI:";

function extractMcpUi(steps: string[]): McpUiPayload | null {
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const step = steps[i];
    const at = step.indexOf(MCP_UI_MARKER);
    if (at < 0) continue;
    try {
      const parsed = JSON.parse(step.slice(at + MCP_UI_MARKER.length).trim());
      if (parsed && typeof parsed === "object") return parsed as McpUiPayload;
    } catch {
      // not valid JSON — keep looking at older steps
    }
  }
  return null;
}

function BossMarkdown({ content, onCopyCode, onDownloadCode }: { content: string; onCopyCode?: (code: string) => void; onDownloadCode?: (code: string, language: string) => void }) {
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
              <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">{isHtml ? "HTML Preview" : language || "CODE"}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => onCopyCode?.(code)} className="rounded-md px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" title="คัดลอกโค้ด">คัดลอก</button>
                  <button type="button" onClick={() => onDownloadCode?.(code, language)} className="rounded-md px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" title="ดาวน์โหลดโค้ด">ดาวน์โหลด</button>
                </div>
              </div>
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

function extractInlineGithubToken(value: string): { token: string; redacted: string } | null {
  // If a user accidentally pastes a GitHub credential into chat, consume it as
  // ephemeral request data instead of persisting the secret in the chat thread.
  const pattern = /\b(?:ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]+\b/g;
  const match = value.match(pattern)?.[0];
  if (!match || match.length < 20) return null;
  return { token: match, redacted: value.replace(match, "[GitHub credential received securely]") };
}

function redactCredentialText(value: string): string {
  return value.replace(/\b(?:ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]+\b/g, "[credential redacted]");
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
  const [githubTokenOpen, setGithubTokenOpen] = useState(false);
  const [githubTokenInput, setGithubTokenInput] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(true);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [models, setModels] = useState<PuterModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [liveStream, setLiveStream] = useState<{ id: string; steps: string[]; active: boolean }>({ id: "", steps: [], active: false });
  const [attachmentContext, setAttachmentContext] = useState("");
  const [arenaOpen, setArenaOpen] = useState(false);
  const [arenaSession, setArenaSession] = useState<ArenaSession | null>(null);
  const [arenaChoice, setArenaChoice] = useState<"A" | "B" | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, string>>({});
  const [chatTheme, setChatTheme] = useState<"default" | "violet" | "pink" | "cyan" | "warm">("default");
  const selectedModel = storedModel || DEFAULT_PUTER_MODEL;
  const themeClass = { default: "", violet: "boss-chat-theme-violet", pink: "boss-chat-theme-pink", cyan: "boss-chat-theme-cyan", warm: "boss-chat-theme-warm" }[chatTheme];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("bossnu_chat_theme");
      if (saved === "default" || saved === "violet" || saved === "pink" || saved === "cyan" || saved === "warm") {
        setChatTheme(saved);
      }
    } catch { /* local preference is optional */ }
  }, []);

  const selectChatTheme = (theme: typeof chatTheme) => {
    setChatTheme(theme);
    try { window.localStorage.setItem("bossnu_chat_theme", theme); } catch { /* local preference is optional */ }
  };
  const agentSettings = useFleet((s) => s.agentSettings);
  const openPreviewRoom = () => {
    if (!thread) return;
    window.location.assign(`/preview?chat=${encodeURIComponent(thread.id)}`);
  };

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("bossnu_github_token");
      if (!raw) return;
      const saved = JSON.parse(raw) as { token?: string; expiresAt?: number };
      if (saved.token && saved.expiresAt && saved.expiresAt > Date.now()) {
        setGithubToken(saved.token);
        window.setTimeout(() => clearGithubToken(), Math.max(0, saved.expiresAt - Date.now()));
      } else {
        window.sessionStorage.removeItem("bossnu_github_token");
      }
    } catch {
      try { window.sessionStorage.removeItem("bossnu_github_token"); } catch { /* intentionally ignored */ }
    }
  }, []);

  const saveGithubToken = () => {
    const value = githubTokenInput.trim();
    if (value.length < 20) return;
    const expiresAt = Date.now() + 5 * 60 * 1000;
    try { window.sessionStorage.setItem("bossnu_github_token", JSON.stringify({ token: value, expiresAt })); } catch { /* intentionally ignored */ }
    setGithubToken(value);
    setGithubTokenInput("");
    setGithubTokenOpen(false);
    window.setTimeout(() => clearGithubToken(), 5 * 60 * 1000);
  };

  const clearGithubToken = () => {
    try {
      window.sessionStorage.removeItem("bossnu_github_token");
      window.sessionStorage.removeItem("github_token");
      window.sessionStorage.removeItem("githubToken");
    } catch { /* intentionally ignored */ }
    setGithubToken("");
    setGithubTokenInput("");
  };
  const selectedModelInfo = models.find((m) => m.id === selectedModel) ?? {
    id: selectedModel,
    name: selectedModel,
    provider: "puter",
  };

  // Fallbacks are only used if Puter catalog loading fails. The live catalog is
  // authoritative and can expose hundreds of current models/providers.
  const modelFallbacks: PuterModel[] = [
    { id: "gpt-5.6-luna", name: "GPT-5.6 Luna", provider: "openai" },
    { id: "openai/gpt-5.5", name: "GPT-5.5", provider: "openai" },
    { id: "anthropic/claude-opus-5", name: "Claude Opus 5", provider: "anthropic" },
    { id: "google/gemini-3.8-flash", name: "Gemini 3.8 Flash", provider: "google" },
    { id: "x-ai/grok-4.6", name: "Grok 4.6", provider: "x-ai" },
    { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro", provider: "deepseek" },
    { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "deepseek" },
    { id: "qwen/qwen3.5-flash", name: "Qwen 3.5 Flash", provider: "qwen" },
    { id: "z-ai/glm-5.3", name: "GLM 5.3", provider: "z-ai" },
    { id: "xiaomi/mimo-v2.6-flash", name: "MiMo V2.6 Flash", provider: "xiaomi" },
    { id: "xiaomi/mimo-v2.6-pro", name: "MiMo V2.6 Pro", provider: "xiaomi" },
  ];

  useEffect(() => {
    let cancelled = false;
    setModelsLoading(true);
    void listPuterModels()
      .then((items) => {
        if (cancelled) return;
        const liveModels = items
          // Chat selector should expose the actual current Puter catalog instead
          // of a stale hand-maintained whitelist. Keep non-chat modalities out.
          .filter((m) => !/image|audio|video|embedding|rerank|moderation|tts|speech/i.test(
            `${m.id} ${m.name ?? ""} ${m.provider ?? ""}`,
          ))
          .filter((m) => Boolean(m.id));
        const byId = new Map<string, PuterModel>();
        for (const model of modelFallbacks) byId.set(model.id, model);
        for (const model of liveModels) byId.set(model.id, model);
        const chatModels = [...byId.values()].sort((a, b) => {
          const rank = (m: PuterModel) => {
            const t = `${m.id} ${m.name ?? ""} ${m.provider ?? ""}`.toLowerCase();
            if (/gpt-6|claude-opus|claude-sonnet|grok-4|gemini-3|deepseek.*v4.*pro|mimo-v2.6-pro|glm-5/.test(t)) return 100;
            if (/gpt|claude|gemini|grok|deepseek|qwen|mimo|glm/.test(t)) return 80;
            return 50;
          };
          return rank(b) - rank(a) || a.id.localeCompare(b.id);
        });
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

  const copyCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code); } catch { /* best effort */ }
  };

  const downloadCode = (code: string, language: string) => {
    try {
      const ext = ({ ts: "ts", tsx: "tsx", js: "js", jsx: "jsx", html: "html", css: "css", json: "json", py: "py" } as Record<string, string>)[language.toLowerCase()] || "txt";
      const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "bossnu-code." + ext;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { /* best effort */ }
  };

  const copyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessage(messageId);
      window.setTimeout(() => setCopiedMessage(null), 1400);
    } catch {
      setCopiedMessage(null);
    }
  };

  const toggleMessageReaction = (messageId: string, reaction: string) => {
    setMessageReactions((current) => ({ ...current, [messageId]: current[messageId] === reaction ? "" : reaction }));
  };

  const downloadMessage = (messageId: string, content: string) => {
    try {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "bossnu-response-" + messageId.slice(0, 8) + ".txt";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Browser download is best-effort and must never interrupt the chat.
    }
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

  const isNearBottom = (el: HTMLElement, threshold = 80) =>
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

  const handleAttachment = async (file?: File) => {
    if (!file || !thread) return;
    const note = `แนบไฟล์: ${file.name} (${Math.ceil(file.size / 1024)} KB)`;
    appendMessage(thread.id, { role: "user", content: note, attachments: [{ name: file.name, size: file.size, type: file.type }] });

    // ZIP is unpacked locally in the browser so Boss can inspect the raw project
    // without uploading the archive itself. Keep only useful text/source files.
    if (/\.zip$/i.test(file.name) || file.type === "application/zip") {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const entries = unzipSync(bytes);
        const textExt = /\.(tsx?|jsx?|mjs|cjs|json|md|mdx|css|scss|html|htm|yaml|yml|toml|xml|txt|env|gitignore|dockerfile|sh|py|go|rs|java|kt|sql|graphql|gql)$/i;
        const chunks: string[] = [];
        let count = 0;
        let totalChars = 0;
        for (const [path, data] of Object.entries(entries)) {
          if (count >= 80 || totalChars >= 90000) break;
          if (!path || path.endsWith("/") || /(^|\/)(node_modules|\.git|dist|build|coverage)(\/|$)/i.test(path)) continue;
          if (!textExt.test(path) && !/(^|\/)(Dockerfile|Makefile|README|LICENSE|\.env(?:\..*)?)$/i.test(path)) continue;
          try {
            const text = strFromU8(data).replaceAll(String.fromCharCode(0), "").slice(0, 12000);
            if (!text.trim()) continue;
            chunks.push(`===== ${path} =====\n${text}`);
            totalChars += text.length;
            count++;
          } catch { /* intentionally ignored */ }
        }
        const extracted = `ZIP RAW EXTRACT: ${file.name}\nไฟล์ข้อความที่อ่านได้: ${count}\n\n${chunks.join("\n\n")}`.slice(0, 100000);
        setAttachmentContext(extracted);
        const status = [`📦 แตก ZIP สำเร็จ: ${file.name}`, `📄 อ่านไฟล์ดิบแล้ว ${count} ไฟล์`];
        patchActivity(thread.id, thread.messages.length ? thread.messages[thread.messages.length - 1]?.id || "" : "", status);
      } catch (error) {
        setAttachmentContext(`ZIP RAW EXTRACT FAILED: ${file.name}\n${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  const handleSend = async (forcedText?: string) => {
    const userText = (forcedText ?? input).trim();
    if (!userText || !thread) return;
    const inlineGithubCredential = extractInlineGithubToken(userText);
    const safeUserText = inlineGithubCredential?.redacted ?? userText;
    const effectiveGithubToken = inlineGithubCredential?.token ?? githubToken;
    setInput("");
    isPinnedRef.current = true;
    setIsPinnedToBottom(true);
    requestAnimationFrame(() => pinToBottom("auto"));
    // Never persist an inline credential in the conversation history.
    appendMessage(thread.id, { role: "user", content: safeUserText });
    const assistantId = appendMessage(thread.id, {
      role: "assistant",
      content: "กำลังเริ่มงาน…",
      model: selectedModel,
      activity: ["🧠 กำลังเริ่มงาน..."],
    });
    const context = compileChatContext({
      messages: thread.messages,
      memory: useFleet.getState().memory.map((m) => m.text),
      query: safeUserText,
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
    const wantsAgent = /(?:ทำให้|แก้|สร้าง|เขียน|deploy|ดีพลอย|github|git|repo|repository|โค้ด|code|run|รัน|ทดสอบ|sandbox|api|database|ฐานข้อมูล|ไฟล์|file|ติดตั้ง|เชื่อมต่อ|ตรวจสอบระบบ|แก้บั๊ก|bug|task|งาน|ค้นหา|search|เว็บ|ค้นเว็บ)/i.test(safeUserText) || continueTask;

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
            const clean = chunk.trim();
            if (!clean) return;
            setLiveStream((current) => {
              const next = [...(current.id === assistantId ? current.steps : searchSteps), clean].filter(Boolean).slice(-12);
              patchActivity(thread.id, assistantId, next);
              return { id: assistantId, steps: next, active: true };
            });
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
      const sandbox = await runAgentSandbox({ data: { language, code } });
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
      const initialAgentStatus = continueTask ? "🔄 กำลังทำงานต่อจากงานล่าสุด..." : "🧠 กำลังเริ่มตรวจงาน...";
      patchActivity(thread.id, assistantId, [initialAgentStatus]);
      setLiveStream({ id: assistantId, steps: [initialAgentStatus], active: true });
      const puter = await loadPuter();
      const authToken = (puter as unknown as { authToken?: string }).authToken;
      let result: import("@/lib/agent-loop").AgentRunResult | null = null;
      const liveSteps: string[] = [];
      for await (const event of await runAgentStream({
        data: {
          prompt: continueTask
            ? `ทำงานต่อจากคำสั่งล่าสุดของผู้ใช้ทันที โดยไม่ต้องตอบรับสั้น ๆ และไม่ต้องถามยืนยันอีกครั้ง คำสั่งล่าสุดคือ: ${lastUser?.content || ""}`
            : userText,
          maxIterations: agentSettings.maxIterations,
          context: attachmentContext ? `${context}\n\n${attachmentContext}` : context,
          ...(authToken ? { authToken } : {}),
          ...(effectiveGithubToken ? { githubToken: effectiveGithubToken } : {}),
          ...(thread?.id ? { threadId: thread.id } : {}),
          model: selectedModel,
          agentSettings,
        },
      })) {
        if (event.type === "step") {
          if (!event.step) continue;
          liveSteps.push(`${event.step.phase}: ${event.step.detail}`);
          const visibleSteps = liveSteps.slice(-10);
          patchActivity(thread.id, assistantId, visibleSteps);
          setLiveStream({ id: assistantId, steps: visibleSteps, active: true });
        } else if (event.type === "done") {
          if (event.result) result = event.result as import("@/lib/agent-loop").AgentRunResult;
        }
      }
      if (!result) throw new Error("Agent stream ended without a final result.");
      if (inlineGithubCredential) {
        // Inline credentials are one-shot: never keep them in chat state or session storage.
        setGithubToken("");
        try {
          window.sessionStorage.removeItem("bossnu_github_token");
          window.sessionStorage.removeItem("github_token");
          window.sessionStorage.removeItem("githubToken");
        } catch { /* intentionally ignored */ }
      }
      const resultText = displayAgentText(result.text);
      const previewUrl = resultText.match(/https:\/\/[a-z0-9-]+\.puter\.site(?:\/[^\s)<>]*)?/i)?.[0];
      if (previewUrl && thread) {
        try { window.localStorage.setItem(`bossnu-preview:${thread.id}`, previewUrl); } catch { /* intentionally ignored */ }
      }
      const response = result.ok
        ? (resultText || "Boss ทำงานเสร็จแล้ว แต่ Agent ไม่ได้ส่งข้อความกลับมา")
        : `ยังทำงานนี้ไม่สำเร็จ: ${resultText || "Agent ไม่มีผลลัพธ์"}`;
      patchVerified(thread.id, assistantId, result.verified === true);
      patchMessage(thread.id, assistantId, response);
      patchActivity(thread.id, assistantId, liveSteps.slice(-10));
      setLiveStream({ id: assistantId, steps: liveSteps.slice(-10), active: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      patchActivity(thread.id, assistantId, []);
      patchVerified(thread.id, assistantId, false);
      patchMessage(thread.id, assistantId, `Boss เรียก Agent ไม่สำเร็จ: ${redactCredentialText(message).slice(0, 700)}`);
      setLiveStream((s) => s.id === assistantId ? { ...s, active: false } : s);
    }
  };

  return (
    <div className="relative flex flex-col h-full min-h-0 w-full max-w-[1400px] mx-auto overflow-hidden bg-zinc-950">
      <div className="relative z-50 shrink-0 flex min-h-14 items-center justify-between gap-2 px-2.5 py-2 border-b border-white/[0.04] bg-zinc-950/95 backdrop-blur-2xl sm:gap-3 sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <button type="button" onClick={() => setHistoryOpen(true)} className="size-9 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 grid place-items-center" aria-label="ประวัติแชท">
            <History className="size-4" />
          </button>
          <button type="button" onClick={startNewChat} className="size-9 shrink-0 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 grid place-items-center" aria-label="เริ่มแชทใหม่">
            <Plus className="size-4" />
          </button>
          <div className="ml-0.5 flex min-w-0 items-center sm:ml-1">
            <div className="size-8 rounded-full bg-white text-black grid place-items-center font-medium text-sm shrink-0">B</div>
            <div className="ml-1.5 min-w-0 sm:ml-2">
              <div className="text-sm font-medium text-zinc-100">Boss</div>
              <div className="hidden text-[11px] text-zinc-500 truncate max-w-[120px] sm:block">{thread?.title || "New chat"}</div>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-1.5">
          <button type="button" onClick={() => setGithubTokenOpen((open) => !open)} className={"flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-left hover:bg-zinc-800 " + (githubToken ? "border-emerald-700/60 bg-emerald-950/30 text-emerald-300" : "border-zinc-700 bg-zinc-900/90 text-zinc-400")} aria-label="GitHub Token">
            <Github className="size-3.5 shrink-0" />
            <span className="hidden sm:inline text-[11px]">{githubToken ? "GitHub พร้อม" : "GitHub"}</span>
            <span className={"size-1.5 rounded-full " + (githubToken ? "bg-emerald-400" : "bg-zinc-600")} />
          </button>
          <button type="button" onClick={() => setModelMenuOpen((open) => !open)} className="flex min-w-0 w-[min(42vw,190px)] sm:w-[min(48%,260px)] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/90 px-2.5 py-2 text-left hover:bg-zinc-800 sm:gap-2 sm:px-3" aria-label="เลือกโมเดล">
            <Sparkles className="size-3.5 text-zinc-300 shrink-0" />
            <span className="truncate text-xs text-zinc-200">{modelsLoading ? "กำลังโหลดโมเดล..." : selectedModelInfo.name}</span>
            <ChevronDown className="size-3.5 text-zinc-500 shrink-0" />
          </button>
        </div>
        {githubTokenOpen && (
          <div className="absolute right-4 top-[58px] z-[65] w-[min(92vw,360px)] rounded-2xl border border-zinc-700 bg-zinc-950 p-3 shadow-2xl">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-zinc-300" />
              <div>
                <div className="text-xs font-semibold text-zinc-100">GitHub Token</div>
                <div className="text-[10px] text-zinc-500">ใช้เฉพาะ browser session นี้ ไม่เก็บลง server</div>
              </div>
            </div>
            {githubToken ? (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-950/30 px-3 py-2">
                <span className="text-[11px] text-emerald-300">✓ GitHub tools ปลดล็อกแล้ว</span>
                <button type="button" onClick={clearGithubToken} className="rounded-lg px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-red-300">ล้าง Token</button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <input type="password" value={githubTokenInput} onChange={(e) => setGithubTokenInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveGithubToken(); }} placeholder="ghp_… / github_pat_…" autoComplete="off" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-zinc-600" />
                <button type="button" onClick={saveGithubToken} disabled={githubTokenInput.trim().length < 20} className="w-full rounded-xl bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-30">เชื่อม GitHub</button>
              </div>
            )}
          </div>
        )}
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

      {arenaOpen && arenaSession && (
        <div className="absolute inset-0 z-[70] bg-black/45" onClick={() => setArenaOpen(false)}>
          <section className="absolute right-0 top-0 w-[min(94vw,520px)] rounded-bl-3xl border-b border-l border-zinc-800 bg-zinc-950/98 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div><div className="text-sm font-semibold text-zinc-100">⚔️ Boss Arena</div><div className="mt-1 text-[11px] text-zinc-500">เลือกทิศทางที่ต้องการ แล้ว Boss จะใช้เป็น preference ในรอบถัดไป ไม่ถือว่าการเลือกแทนการ Verify</div></div>
              <button type="button" onClick={() => setArenaOpen(false)} className="size-8 rounded-lg text-zinc-500 hover:bg-zinc-800" aria-label="ปิด Arena"><X className="size-4 mx-auto" /></button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {arenaSession.options.map((option) => (
                <button key={option.id} type="button" onClick={() => setArenaChoice(option.id)} className={"rounded-2xl border p-3 text-left transition " + (arenaChoice === option.id ? "border-violet-400/50 bg-violet-500/10" : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900")}>
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold text-zinc-100">แบบ {option.id}</span>{arenaChoice === option.id ? <Check className="size-3.5 text-violet-300" /> : null}</div>
                  <div className="mt-2 text-[11px] font-medium text-zinc-300">{option.title}</div>
                  <div className="mt-1 text-[10px] leading-4 text-zinc-500">{option.instruction}</div>
                </button>
              ))}
            </div>
            <button type="button" disabled={!arenaChoice} onClick={() => {
              if (!arenaChoice) return;
              const context = createArenaChoiceContext({ sessionId: arenaSession.id, optionId: arenaChoice, createdAt: Date.now() }, arenaSession);
              setArenaOpen(false);
              setArenaChoice(null);
              setInput("");
              void handleSend(context);
            }} className="mt-3 w-full rounded-xl bg-white px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-30">ใช้แนวทางที่เลือกกับ Boss</button>
          </section>
        </div>
      )}

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

      <main className={themeClass}
        ref={scrollerRef}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y px-4 py-5 pb-8 sm:px-6 sm:py-7 [scrollbar-gutter:stable]"
        style={{ overflowAnchor: "none", WebkitOverflowScrolling: "touch" }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const pinned = isNearBottom(el);
          isPinnedRef.current = pinned;
          setIsPinnedToBottom(pinned);
        }}
      >
        <div className="flex w-full flex-col gap-6 px-0">
          {thread?.messages.map((m) => (
            <div key={m.id} className={`group flex w-full gap-2 boss-message-in ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className={`size-7 rounded-full bg-zinc-800 border border-zinc-700 grid place-items-center shrink-0 mt-0.5 ${m.id === liveStream.id && liveStream.active ? "boss-avatar-working" : ""}`}>
                  <span className="text-[11px]">B</span>
                </div>
              )}
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                m.role === "user"
                  ? "ml-auto max-w-[78%] bg-white px-4 py-3 text-black"
                  : "w-full max-w-none bg-transparent border-0 text-zinc-100 px-0 py-2"
              }`}>
                <BossMarkdown content={m.content} onCopyCode={copyCode} onDownloadCode={downloadCode} />{m.role === "assistant" && m.id === liveStream.id && liveStream.active ? <span className="boss-stream-caret" aria-hidden="true" /> : null}
                {m.role === "assistant" && m.activity && m.activity.length > 0 && (
                  <>
                    <BossLiveActivity
                      steps={m.id === liveStream.id ? liveStream.steps : m.activity}
                      active={m.id === liveStream.id && liveStream.active}
                      verified={m.verified === true}
                    />
                    {(() => {
                      const ui = extractMcpUi(m.id === liveStream.id ? liveStream.steps : m.activity);
                      return ui ? (
                        <div className="mt-2">
                          <McpUiBlock payload={ui} />
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
                {m.role === "assistant" && m.content && !liveStream.active && /กำลัง|ดำเนิน|ยังทำงานนี้ไม่สำเร็จ|ไม่สำเร็จ|ตรวจสอบ|ค้นหา|แก้|ทำงานต่อ/i.test(m.content + " " + (m.activity || []).join(" ")) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void handleSend("ทำงานต่อจากงานล่าสุดทันที")} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-[11px] font-medium text-violet-200 hover:bg-violet-500/20 transition">▶ ทำต่อ</button>
                    <button type="button" onClick={() => void handleSend("ตรวจสอบงานล่าสุดอีกครั้ง แล้วแก้ต่อจนกว่าจะผ่าน")} className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-[11px] font-medium text-sky-200 hover:bg-sky-500/20 transition">✓ ตรวจสอบต่อ</button>
                    <button type="button" onClick={() => void handleSend("ลองวิธีอื่นต่อจากงานล่าสุด โดยไม่ทำซ้ำวิธีเดิม")} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 transition">↻ ลองวิธีอื่น</button>
                  </div>
                )}
                {m.content && !liveStream.active && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 opacity-100">
                    <button type="button" onClick={() => toggleMessageReaction(m.id, "👍")} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] transition ${messageReactions[m.id] === "👍" ? "bg-primary/15 text-primary" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"}`} aria-label="ถูกใจข้อความ"><ThumbsUp className="size-3.5" />{messageReactions[m.id] === "👍" ? "👍" : ""}</button>
                    <button type="button" onClick={() => toggleMessageReaction(m.id, "❤️")} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] transition ${messageReactions[m.id] === "❤️" ? "bg-rose-500/15 text-rose-300" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"}`} aria-label="รักข้อความ"><Heart className="size-3.5" />{messageReactions[m.id] === "❤️" ? "❤️" : ""}</button>
                    <button type="button" onClick={() => copyMessage(m.id, m.content)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200" aria-label="คัดลอกคำตอบ" title="คัดลอกคำตอบ">
                      {copiedMessage === m.id ? <><Check className="size-3.5 text-emerald-400" /><span className="text-emerald-300">คัดลอกแล้ว</span></> : <><Copy className="size-3.5" /><span>คัดลอก</span></>}
                    </button>
                    {m.role === "assistant" && <button type="button" onClick={() => downloadMessage(m.id, m.content)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200" aria-label="ดาวน์โหลดคำตอบ" title="ดาวน์โหลดคำตอบ"><Download className="size-3.5" /><span>ดาวน์โหลด</span></button>}
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

      <div className="relative z-30 shrink-0 border-t border-white/[0.06] bg-zinc-950/90 p-3 backdrop-blur-2xl sm:p-4">
        <div className="mx-auto mb-2 flex max-w-[1400px] justify-end">
          <div className="flex items-center gap-1 rounded-full bg-white/[0.035] px-1 py-1">
            <Palette className="mx-1 size-3.5 text-zinc-500" />
            {([["default","•"],["violet","V"],["pink","P"],["cyan","C"],["warm","W"]] as const).map(([theme, label]) => (
              <button key={theme} type="button" onClick={() => selectChatTheme(theme)} className={`size-6 rounded-full text-[9px] font-semibold transition ${chatTheme === theme ? "bg-white text-black" : "text-zinc-500 hover:bg-zinc-800"}`} aria-label={`ธีม ${theme}`}>{label}</button>
            ))}
          </div>
        </div>
        <div className="relative flex items-end gap-2 rounded-[22px] bg-white/[0.045] border border-white/[0.08] p-2 shadow-[0_12px_50px_rgba(0,0,0,0.2)] focus-within:border-violet-400/20">
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
            onClick={() => void handleSend()}
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