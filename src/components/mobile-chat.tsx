/**
 * MobileChat — หน้าแชทสไตล์แอป ChatGPT (mobile-first)
 *
 * - ใช้ได้ทั้งในเว็บหลัก (route /app) และในบิลด์ standalone สำหรับห่อเป็นแอป Android
 * - เก็บประวัติใน localStorage ของเครื่อง, ตอบผ่าน Puter (โมเดลฟรี)
 * - ไม่พึ่ง store กลาง เพื่อให้ mobile entry มีขนาดเล็กและไม่มี side-effect
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Mic,
  PenSquare,
  PanelLeft,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Square,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { BossMarkdown } from "@/components/boss-markdown";
import { usePuter } from "@/lib/puter-context";
import {
  chatWithPuter,
  listPuterModels,
  type ChatTurn,
} from "@/lib/puter";
import {
  DEFAULT_PUTER_MODEL,
  FREE_PUTER_MODEL_IDS,
  POWER_PUTER_MODEL_IDS,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

/* ---------------------------------- types --------------------------------- */

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  model?: string;
};

type Thread = {
  id: string;
  title: string;
  model: string;
  updatedAt: number;
  messages: ChatMessage[];
};

/* --------------------------------- storage -------------------------------- */

const THREADS_KEY = "boss-mobile-threads-v1";
const MODEL_KEY = "boss-mobile-model-v1";
const ACTIVE_KEY = "boss-mobile-active-v1";
const MAX_HISTORY_TURNS = 30;

const MOBILE_SYSTEM_PROMPT =
  "You are Boss Chat, a friendly and helpful AI assistant inside a mobile chat app. " +
  "Reply in Thai when the user writes Thai, otherwise match the user's language. " +
  "Use Markdown for structure (headings, bullets, code fences) when it helps readability. " +
  "Keep answers focused and mobile-friendly: short paragraphs, no fluff.";

function newId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
    }
  } catch {
    /* fall through */
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function readThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Thread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode etc.) — chat still works in memory */
  }
}

function removeStored(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function shortModelName(model: string): string {
  const tail = model.split("/").pop() ?? model;
  return tail.length > 26 ? `${tail.slice(0, 25)}…` : tail;
}

function threadTitleFrom(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (!oneLine) return "แชทใหม่";
  return oneLine.length > 42 ? `${oneLine.slice(0, 41)}…` : oneLine;
}

/** แปล error ดิบจาก Puter/เบราว์เซอร์เป็นภาษาไทยที่เข้าใจง่าย */
function thaiPuterError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();
  if (!msg) return "เกิดข้อผิดพลาดที่ไม่รู้จัก ลองใหม่อีกครั้ง";
  if (lower.includes("popup") || lower.includes("blocked"))
    return "เบราว์เซอร์บล็อกหน้าต่างล็อกอิน — กรุณากด “อนุญาต popup” สำหรับเว็บนี้ แล้วลองใหม่";
  if (lower.includes("closed"))
    return "หน้าต่างล็อกอินถูกปิดก่อนทำรายการเสร็จ — กรุณาลองใหม่อีกครั้ง";
  if (lower.includes("phone"))
    return "บัญชี Puter นี้ต้องยืนยันเบอร์โทรก่อน — กรุณาไปยืนยันที่ puter.com แล้วกลับมาลองใหม่";
  if (
    lower.includes("load") ||
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("failed")
  )
    return `เชื่อมต่อ Puter ไม่สำเร็จ (${msg}) — ตรวจสอบอินเทอร์เน็ตว่าสามารถเปิด js.puter.com ได้ แล้วกดลองใหม่`;
  if (lower.includes("token") || lower.includes("session") || lower.includes("auth"))
    return `เซสชัน Puter หมดอายุหรือไม่สมบูรณ์ (${msg}) — กรุณากดออกจากระบบแล้วเข้าสู่ระบบใหม่`;
  return msg;
}

function dayBucket(ts: number): string {  const now = new Date();
  const day = new Date(ts);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = startOfToday - new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const days = Math.round(diff / 86_400_000);
  if (days <= 0) return "วันนี้";
  if (days === 1) return "เมื่อวาน";
  if (days <= 7) return "7 วันที่ผ่านมา";
  return "เก่ากว่านั้น";
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      return true;
    } catch {
      return false;
    }
  }
}

/* ------------------------------ speech input ------------------------------ */

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return typeof ctor === "function" ? (ctor as new () => SpeechRecognitionInstance) : null;
}

/* --------------------------------- component ------------------------------ */

const SUGGESTIONS = [
  "ช่วยเขียนอีเมลขอเลื่อนประชุมเป็นภาษาอังกฤษ",
  "อธิบายดอกเบี้ยทบต้นให้เด็ก 10 ขวบเข้าใจ",
  "วางแผนเที่ยวเชียงใหม่ 3 วัน 2 คืนให้หน่อย",
  "ช่วยเขียนโค้ด Python ดึงข้อมูลจาก API",
];

export function MobileChat({ standalone = false }: { standalone?: boolean }) {
  const { ready, signedIn, user, signIn, signOut, error: puterError, refresh: refreshPuter } = usePuter();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>(DEFAULT_PUTER_MODEL);
  const [remoteModels, setRemoteModels] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [showJump, setShowJump] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const stoppedRef = useRef(false);
  const recogRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechSupported = useMemo(() => getSpeechRecognition() !== null, []);

  /* ------------------------------- hydration ------------------------------ */
  useEffect(() => {
    setThreads(readThreads());
    const savedModel = readStored(MODEL_KEY);
    if (savedModel) setModel(savedModel);
    setActiveId(readStored(ACTIVE_KEY));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStored(THREADS_KEY, JSON.stringify(threads.slice(0, 100)));
  }, [threads, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    writeStored(MODEL_KEY, model);
  }, [model, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (activeId) writeStored(ACTIVE_KEY, activeId);
    else removeStored(ACTIVE_KEY);
  }, [activeId, hydrated]);

  /* ------------------------------ model catalog --------------------------- */
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    listPuterModels()
      .then((models) => {
        if (!cancelled) setRemoteModels(models.map((m) => m.id).filter(Boolean));
      })
      .catch(() => {
        /* offline / catalog unavailable — base list still works */
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const allModels = useMemo(
    () => Array.from(new Set([...POWER_PUTER_MODEL_IDS, ...remoteModels])),
    [remoteModels],
  );
  const freeSet = useMemo(() => new Set<string>([...FREE_PUTER_MODEL_IDS]), []);

  /* --------------------------------- derived ------------------------------ */
  const active = useMemo(
    () => threads.find((t) => t.id === activeId) ?? null,
    [threads, activeId],
  );
  const messages = active?.messages ?? [];

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [threads, search]);

  const groupedThreads = useMemo(() => {
    const groups = new Map<string, Thread[]>();
    for (const t of filteredThreads) {
      const bucket = dayBucket(t.updatedAt);
      const list = groups.get(bucket) ?? [];
      list.push(t);
      groups.set(bucket, list);
    }
    return [...groups.entries()];
  }, [filteredThreads]);

  /* --------------------------------- scrolling ---------------------------- */
  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 240);
  }, []);

  useEffect(() => {
    if (sending) scrollToBottom();
  }, [sending, streaming, messages.length, scrollToBottom]);

  /* --------------------------------- actions ------------------------------ */
  const persistUpsert = useCallback((updater: (prev: Thread[]) => Thread[]) => {
    setThreads((prev) => updater(prev).slice(0, 100));
  }, []);

  const startNewChat = useCallback(() => {
    stoppedRef.current = true;
    setSending(false);
    setStreaming("");
    setError(null);
    setActiveId(null);
    setDrawerOpen(false);
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const openThread = useCallback((id: string) => {
    stoppedRef.current = true;
    setSending(false);
    setStreaming("");
    setError(null);
    setActiveId(id);
    setDrawerOpen(false);
  }, []);

  const deleteThread = useCallback(
    (id: string) => {
      persistUpsert((prev) => prev.filter((t) => t.id !== id));
      setActiveId((cur) => (cur === id ? null : cur));
    },
    [persistUpsert],
  );

  const send = useCallback(
    async (text: string, opts?: { regenerate?: boolean }) => {
      const content = text.trim();
      if (!content || sending) return;
      if (!signedIn) {
        setError("เข้าสู่ระบบ Puter ก่อนเริ่มแชท — ใช้ฟรี ไม่ต้องมี API key");
        return;
      }
      stoppedRef.current = false;
      setError(null);
      setSending(true);
      setStreaming("");

      let threadId = activeId;
      if (!threadId || !threads.some((t) => t.id === threadId)) {
        threadId = newId("thread");
        const created: Thread = {
          id: threadId,
          title: threadTitleFrom(content),
          model,
          updatedAt: Date.now(),
          messages: [],
        };
        persistUpsert((prev) => [created, ...prev]);
        setActiveId(threadId);
      }
      const targetId = threadId;

      if (!opts?.regenerate) {
        const userMsg: ChatMessage = { id: newId("msg"), role: "user", content };
        persistUpsert((prev) =>
          prev.map((t) =>
            t.id === targetId
              ? { ...t, updatedAt: Date.now(), messages: [...t.messages, userMsg] }
              : t,
          ),
        );
        setInput("");
        requestAnimationFrame(() => {
          const el = inputRef.current;
          if (el) el.style.height = "auto";
        });
      }

      // Snapshot history for the request (exclude a stale trailing assistant
      // message when regenerating).
      const snapshot = threads.find((t) => t.id === targetId);
      const base: ChatMessage[] = snapshot ? [...snapshot.messages] : [];
      if (!opts?.regenerate) base.push({ id: "pending", role: "user", content });
      else if (base.length > 0 && base[base.length - 1]?.role === "assistant") base.pop();
      const turns: ChatTurn[] = [
        { role: "system", content: MOBILE_SYSTEM_PROMPT },
        ...base.slice(-MAX_HISTORY_TURNS).map((m) => ({ role: m.role, content: m.content })),
      ];

      const fallbackModels = POWER_PUTER_MODEL_IDS.filter((m) => m !== model).slice(0, 3);
      const result = await chatWithPuter({
        messages: turns,
        model,
        fallbackModels,
        onDelta: (full) => {
          if (!stoppedRef.current) setStreaming(full);
        },
      });

      if (stoppedRef.current) {
        setSending(false);
        setStreaming("");
        return;
      }
      if (result.ok && result.text.trim()) {
        const assistantMsg: ChatMessage = {
          id: newId("msg"),
          role: "assistant",
          content: result.text,
          model: result.model,
        };
        persistUpsert((prev) =>
          prev.map((t) =>
            t.id === targetId
              ? { ...t, updatedAt: Date.now(), model, messages: [...t.messages, assistantMsg] }
              : t,
          ),
        );
        setStreaming("");
      } else {
        setStreaming("");
        setError(
          result.ok
            ? "โมเดลตอบกลับมาเป็นข้อความว่าง ลองกดส่งใหม่อีกครั้ง"
            : result.error,
        );
      }
      setSending(false);
    },
    [activeId, threads, model, sending, signedIn, persistUpsert],
  );

  const stop = useCallback(() => {
    stoppedRef.current = true;
    setSending(false);
    setStreaming("");
  }, []);

  const regenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || sending) return;
    // Drop the trailing assistant message, then resend the last user turn.
    if (activeId) {
      persistUpsert((prev) =>
        prev.map((t) => {
          if (t.id !== activeId) return t;
          const next = [...t.messages];
          if (next.length > 0 && next[next.length - 1]?.role === "assistant") next.pop();
          return { ...t, messages: next };
        }),
      );
    }
    void send(lastUser.content, { regenerate: true });
  }, [messages, sending, activeId, persistUpsert, send]);

  const retryAfterError = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setError(null);
    void send(lastUser.content, { regenerate: true });
  }, [messages, send]);

  const handleCopy = useCallback(async (id: string, text: string) => {
    const ok = await copyText(text);
    if (ok) {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1400);
    }
  }, []);

  const handleSignIn = useCallback(async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signIn();
    } catch (err) {
      setError(thaiPuterError(err));
    } finally {
      setSigningIn(false);
    }
  }, [signIn]);

  const toggleListening = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    if (recogRef.current) {
      recogRef.current.stop();
      return;
    }
    try {
      const recog = new Ctor();
      recog.lang = "th-TH";
      recog.interimResults = false;
      recog.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript ?? "";
        if (transcript.trim()) setInput((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
      };
      recog.onerror = () => {
        recogRef.current = null;
        setListening(false);
      };
      recog.onend = () => {
        recogRef.current = null;
        setListening(false);
      };
      recogRef.current = recog;
      recog.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, []);

  useEffect(
    () => () => {
      try {
        recogRef.current?.stop();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const adjustTextarea = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  /* ---------------------------------- render ------------------------------ */
  const lastAssistantId =
    messages.length > 0 && messages[messages.length - 1]?.role === "assistant"
      ? messages[messages.length - 1]?.id
      : null;

  const sidebarBody = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาแชท"
            className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-8 text-sm text-fg placeholder:text-subtle focus:border-border-strong focus:outline-none"
          />
          {search && (
            <button
              type="button"
              aria-label="ล้างคำค้น"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-subtle hover:text-fg"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="แชทใหม่"
          onClick={startNewChat}
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-fg hover:bg-elevated"
        >
          <PenSquare className="size-4" />
        </button>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={startNewChat}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-fg hover:bg-elevated"
        >
          <Plus className="size-4" /> แชทใหม่
        </button>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto px-3 pb-3">
        {groupedThreads.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-subtle">
            {search ? "ไม่เจอแชทที่ค้นหา" : "ยังไม่มีประวัติ — เริ่มแชทแรกได้เลย"}
          </p>
        )}
        {groupedThreads.map(([bucket, items]) => (
          <div key={bucket} className="mt-3">
            <p className="px-3 pb-1 text-[11px] font-medium text-subtle">{bucket}</p>
            <ul className="space-y-0.5">
              {items.map((t) => (
                <li key={t.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-xl px-3 py-2 text-sm hover:bg-elevated",
                      t.id === activeId ? "bg-elevated text-fg" : "text-muted",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => openThread(t.id)}
                      className="min-w-0 flex-1 truncate text-left"
                    >
                      {t.title}
                    </button>
                    <button
                      type="button"
                      aria-label={`ลบ ${t.title}`}
                      onClick={() => deleteThread(t.id)}
                      className="rounded-md p-1 text-subtle opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        {ready && signedIn ? (
          <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
              {(user?.username ?? user?.email ?? "P").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">
                {user?.username ?? user?.email ?? "Puter user"}
              </p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-xs text-subtle hover:text-fg"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void handleSignIn()}
            disabled={signingIn || !ready}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-fg px-3 py-2.5 text-sm font-semibold text-bg disabled:opacity-60"
          >
            {signingIn ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ Puter (ฟรี)"}
          </button>
        )}
        {!standalone && (
          <a
            href="/chat"
            className="mt-2 block rounded-xl px-2 py-1.5 text-center text-xs text-subtle hover:text-fg"
          >
            เปิดเวอร์ชันเต็ม (เครื่องมือ + Agent) →
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh bg-bg text-fg">
      {/* desktop sidebar */}
      <aside className="hidden w-[300px] shrink-0 border-r border-border bg-bg lg:block">
        {sidebarBody}
      </aside>

      {/* mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden",
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[300px] max-w-[85vw] bg-bg transition-transform duration-200 lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarBody}
      </aside>

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-bg/90 px-2 backdrop-blur">
          <button
            type="button"
            aria-label="เมนู"
            onClick={() => setDrawerOpen(true)}
            className="grid size-10 place-items-center rounded-xl text-muted hover:bg-elevated hover:text-fg lg:hidden"
          >
            <PanelLeft className="size-5" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setModelOpen((v) => !v)}
              className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-fg hover:bg-elevated"
            >
              <span className="max-w-[38vw] truncate sm:max-w-none">{shortModelName(model)}</span>
              <ChevronDown className={cn("size-4 text-subtle transition-transform", modelOpen && "rotate-180")} />
            </button>
            {modelOpen && (
              <>
                <button
                  type="button"
                  aria-label="ปิด"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setModelOpen(false)}
                />
                <div className="absolute left-0 top-full z-50 mt-1 max-h-[50vh] w-72 overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-pop">
                  {allModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setModel(m);
                        setModelOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-elevated",
                        m === model ? "text-fg" : "text-muted",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{m}</span>
                      {freeSet.has(m) && (
                        <span className="shrink-0 rounded-full bg-ok/15 px-2 py-0.5 text-[10px] font-bold text-ok">
                          ฟรี
                        </span>
                      )}
                      {m === model && <Check className="size-4 shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex-1" />

          <button
            type="button"
            aria-label="แชทใหม่"
            onClick={startNewChat}
            className="grid size-10 place-items-center rounded-xl text-muted hover:bg-elevated hover:text-fg"
          >
            <PenSquare className="size-5" />
          </button>
        </header>

        {/* messages */}
        <div ref={scrollRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-3xl px-4 py-6">
            {ready && puterError && !signedIn && !sending && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg">{thaiPuterError(new Error(puterError))}</p>
                  <button
                    type="button"
                    onClick={() => void refreshPuter()}
                    className="mt-2 rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-fg hover:bg-elevated"
                  >
                    ลองเชื่อมต่อใหม่
                  </button>
                </div>
              </div>
            )}
            {messages.length === 0 && !sending ? (
              <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
                <div className="grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Sparkles className="size-7" />
                </div>
                <h1 className="mt-4 text-2xl font-bold">สวัสดี! มีอะไรให้ช่วย?</h1>
                <p className="mt-1 text-sm text-muted">ถามได้ทุกเรื่อง ตอบไว ใช้งานฟรีผ่าน Puter</p>
                <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      disabled={!signedIn}
                      className="rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm text-muted hover:bg-elevated hover:text-fg disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {!ready || !signedIn ? (
                  <button
                    type="button"
                    onClick={() => void handleSignIn()}
                    disabled={signingIn || !ready}
                    className="mt-6 rounded-full bg-fg px-6 py-2.5 text-sm font-semibold text-bg disabled:opacity-60"
                  >
                    {signingIn ? "กำลังเข้าสู่ระบบ…" : !ready ? "กำลังโหลด…" : "เข้าสู่ระบบเพื่อเริ่มแชท"}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-3xl bg-elevated px-4 py-2.5 text-[15px] leading-6">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex gap-3">
                      <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                        <Sparkles className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] leading-7 text-fg">
                          <BossMarkdown content={m.content} />
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="คัดลอกคำตอบ"
                            onClick={() => void handleCopy(m.id, m.content)}
                            className="rounded-lg p-1.5 text-subtle hover:bg-elevated hover:text-fg"
                          >
                            {copiedId === m.id ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
                          </button>
                          {m.id === lastAssistantId && (
                            <button
                              type="button"
                              aria-label="ตอบใหม่อีกครั้ง"
                              onClick={regenerate}
                              disabled={sending}
                              className="rounded-lg p-1.5 text-subtle hover:bg-elevated hover:text-fg disabled:opacity-40"
                            >
                              <RefreshCw className="size-4" />
                            </button>
                          )}
                          {m.model && (
                            <span className="ml-1 text-[11px] text-subtle">{shortModelName(m.model)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ),
                )}

                {sending && (
                  <div className="flex gap-3">
                    <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                      <Sparkles className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {streaming ? (
                        <div className="text-[15px] leading-7">
                          <BossMarkdown content={streaming} />
                          <span className="ml-1 inline-block size-2 animate-pulse rounded-full bg-primary" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 py-2" aria-label="กำลังพิมพ์">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="size-2 animate-bounce rounded-full bg-subtle"
                              style={{ animationDelay: `${i * 150}ms` }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {error && !sending && (
                  <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-fg">{error}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {!signedIn ? (
                          <button
                            type="button"
                            onClick={() => void handleSignIn()}
                            disabled={signingIn}
                            className="rounded-full bg-fg px-4 py-1.5 text-xs font-semibold text-bg disabled:opacity-60"
                          >
                            {signingIn ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ Puter"}
                          </button>
                        ) : (
                          messages.some((m) => m.role === "user") && (
                            <button
                              type="button"
                              onClick={retryAfterError}
                              className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-fg hover:bg-elevated"
                            >
                              ลองอีกครั้ง
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {showJump && (
            <button
              type="button"
              aria-label="เลื่อนลงล่างสุด"
              onClick={() => scrollToBottom(true)}
              className="sticky bottom-4 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-border bg-surface text-muted shadow-pop hover:text-fg"
            >
              <ChevronDown className="size-4 rotate-180" />
            </button>
          )}
        </div>

        {/* composer */}
        <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <div className="mx-auto w-full max-w-3xl">
            {ready && !signedIn && messages.length > 0 && (
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="mb-2 w-full rounded-2xl border border-warn/30 bg-warn/10 px-4 py-2 text-center text-xs text-warn"
              >
                เข้าสู่ระบบ Puter เพื่อส่งข้อความต่อ (ฟรี)
              </button>
            )}
            <div className="rounded-[28px] border border-border bg-surface shadow-pop">
              <div className="flex items-end gap-1 p-2 pl-4">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    adjustTextarea();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                  rows={1}
                  placeholder={signedIn ? "ถามอะไรก็ได้" : "เข้าสู่ระบบก่อนเริ่มแชท"}
                  className="max-h-40 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-fg placeholder:text-subtle focus:outline-none"
                />
                {speechSupported && !sending && (
                  <button
                    type="button"
                    aria-label={listening ? "หยุดฟัง" : "พูดแทนพิมพ์"}
                    onClick={toggleListening}
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full",
                      listening ? "animate-pulse bg-danger/20 text-danger" : "text-muted hover:bg-elevated hover:text-fg",
                    )}
                  >
                    <Mic className="size-5" />
                  </button>
                )}
                {sending ? (
                  <button
                    type="button"
                    aria-label="หยุด"
                    onClick={stop}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-bg"
                  >
                    <Square className="size-4 fill-current" />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="ส่ง"
                    onClick={() => void send(input)}
                    disabled={!input.trim()}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-bg disabled:opacity-20"
                  >
                    <ArrowUp className="size-5" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-subtle">
              AI อาจตอบผิดได้ — ตรวจสอบข้อมูลสำคัญเสมอ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
