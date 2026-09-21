import { createFileRoute } from "@tanstack/react-router";
import { Archive, FileText, Loader2, Paperclip, Pin, Plus, Send, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { MarkdownOutput } from "@/components/markdown-output";
import { ModelSource } from "@/components/model-source";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { runFleet } from "@/lib/ai";
import {
  attachmentLimitMessage,
  clampAttachments,
  describeAttachment,
  type AttachmentPreview,
} from "@/lib/attachments";
import { API_KEY_CHANGED_EVENT, getActiveApiKey } from "@/lib/provider-keys";
import { usePuter } from "@/lib/puter-context";
import { useFleet } from "@/lib/store";

export const Route = createFileRoute("/chat")({ component: ChatPage });

function ChatPage() {
  const threads = useFleet((s) => s.threads);
  const activeThreadId = useFleet((s) => s.activeThreadId);
  const newThread = useFleet((s) => s.newThread);
  const setActiveThread = useFleet((s) => s.setActiveThread);
  const pinThread = useFleet((s) => s.pinThread);
  const deleteThread = useFleet((s) => s.deleteThread);
  const appendMessage = useFleet((s) => s.appendMessage);
  const patchMessage = useFleet((s) => s.patchMessage);
  const patchActivity = useFleet((s) => s.patchActivity);
  const modelId = useFleet((s) => s.modelId);
  const gateway = useFleet((s) => s.modelGateway);
  const memory = useFleet((s) => s.memory);
  const learnMemory = useFleet((s) => s.learnMemory);
  const { signedIn } = usePuter();
  const [openRouterConnected, setOpenRouterConnected] = useState(() => Boolean(getActiveApiKey()));

  useEffect(() => {
    const sync = () => setOpenRouterConnected(Boolean(getActiveApiKey()));
    sync();
    window.addEventListener(API_KEY_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(API_KEY_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const canChat = signedIn || openRouterConnected;
  const thread = threads.find((t) => t.id === activeThreadId) ?? threads[0];
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previews, setPreviews] = useState<AttachmentPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () =>
      [...threads].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.updatedAt - a.updatedAt;
      }),
    [threads],
  );

  function addFiles(files: File[]) {
    const skipped = files.map(attachmentLimitMessage).filter(Boolean);
    skipped.forEach((msg) => toast.error(msg));
    const next = clampAttachments([...attachments, ...files]);
    setAttachments(next);
    setPreviews(
      next.map((file) => ({
        file,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      })),
    );
  }

  function removeAttachment(index: number) {
    setPreviews((current) => {
      const item = current[index];
      if (item?.url) URL.revokeObjectURL(item.url);
      return current.filter((_, i) => i !== index);
    });
    setAttachments((current) => current.filter((_, i) => i !== index));
  }

  async function send() {
    if (!thread || (!draft.trim() && attachments.length === 0) || busy) return;
    if (!canChat) {
      toast.error("Sign in with Puter หรือใส่ OpenRouter key (sk-or-...) ก่อนส่ง");
      return;
    }
    const attachmentDetails = attachments.length
      ? await Promise.all(
          attachments.map(async (f) => `- ${f.name} (${f.type || "unknown"}, ${Math.ceil(f.size / 1024)} KB)\n  ${await describeAttachment(f)}`),
        )
      : [];
    const attachmentContext = attachmentDetails.length ? `\n\nAttached files:\n${attachmentDetails.join("\n")}` : "";
    const text = (draft.trim() || "Analyze the attached files") + attachmentContext;
    const attachedMeta = attachments.map((file) => ({ name: file.name, size: file.size, type: file.type }));
    setDraft("");
    setAttachments([]);
    setPreviews([]);
    appendMessage(thread.id, { role: "user", content: text, attachments: attachedMeta });
    setBusy(true);

    const assistantId = appendMessage(thread.id, {
      role: "assistant",
      content: "",
      model: modelId,
      activity: ["วิเคราะห์คำขอ"],
    });
    try {
      const history = thread.messages
        .filter((m) => m.content.trim())
        .slice(-8)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      const extras = memory.length ? `Memory: ${memory.map((m) => m.text).join("; ")}` : "";
      const res = await runFleet(
        {
          mode: "chat",
          prompt: text,
          modelId,
          extras,
          history,
          gateway,
        },
        (full) => patchMessage(thread.id, assistantId, full),
        (activity) => patchActivity(thread.id, assistantId, activity),
      );
      if (!res.ok) {
        if (res.activity) patchActivity(thread.id, assistantId, res.activity);
        toast.error(res.error);
        patchMessage(thread.id, assistantId, `ยังไม่ถือว่าสำเร็จ\n\n${res.error}`);
        learnMemory(`Task: ${text.replace(/Attached files:[\s\S]*/i, "").trim().slice(0, 700)} | Result: failed | Reason: ${res.error.slice(0, 500)}`);
        return;
      }
      if (res.activity) patchActivity(thread.id, assistantId, res.activity);
      patchMessage(thread.id, assistantId, res.text);
      learnMemory(
        `Task: ${text.replace(/Attached files:[\s\S]*/i, "").trim().slice(0, 700)} | Result: ${res.text.replace(/\s+/g, " ").slice(0, 600)} | Trace: ${(res.activity ?? []).slice(-6).join(" → ")}`,
      );
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "Chat failed";
      toast.error(errorText);
      patchMessage(thread.id, assistantId, errorText);
      learnMemory(`Task: ${text.replace(/Attached files:[\s\S]*/i, "").trim().slice(0, 700)} | Result: failed | Reason: ${errorText.slice(0, 500)}`);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  if (!thread) return null;

  return (
    <AppShell>
      <div className="flex min-h-[calc(100dvh-12rem)] w-full">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border md:flex">
          <div className="flex items-center justify-between p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-subtle">Chats</p>
            <Button size="icon-sm" variant="ghost" aria-label="New chat" onClick={() => newThread()}>
              <Plus className="size-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-0.5 px-2 pb-4">
              {sorted.map((t) => (
                <div
                  key={t.id}
                  className={`group flex items-center gap-1 rounded-md px-2 py-2 text-left text-sm ${
                    t.id === thread.id ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/60 hover:text-fg"
                  }`}
                >
                  <button type="button" className="min-h-11 min-w-0 flex-1 truncate text-left" onClick={() => setActiveThread(t.id)}>
                    {t.pinned ? "· " : ""}
                    {t.title}
                  </button>
                  <button type="button" className="hidden size-7 items-center justify-center rounded-sm group-hover:flex hover:bg-bg" onClick={() => pinThread(t.id)} aria-label="Pin">
                    <Pin className="size-3.5" />
                  </button>
                  <button type="button" className="hidden size-7 items-center justify-center rounded-sm text-subtle group-hover:flex hover:text-danger" onClick={() => deleteThread(t.id)} aria-label="Delete">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <ModelSource />
            <div className="ml-2 flex items-center gap-1.5 text-xs text-subtle">
              <span className={`size-1.5 rounded-full ${canChat ? "bg-ok" : "bg-muted"}`} />
              {busy ? "Boss กำลังทำงาน" : canChat ? "พร้อมใช้งาน" : "รอ Puter หรือ OpenRouter key"}
            </div>
            <div className="ml-auto flex items-center gap-1 md:hidden">
              <Button size="icon-sm" variant="ghost" onClick={() => newThread()} aria-label="New chat">
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-2xl space-y-5">
              {thread.messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "ml-8" : "mr-4"}>
                  <p className="mb-1 text-xs uppercase tracking-wider text-subtle">{m.role === "user" ? "คุณ" : "Boss"}</p>
                  {m.attachments && m.attachments.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {m.attachments.map((file) => (
                        <Badge key={`${m.id}-${file.name}`}>{file.name}</Badge>
                      ))}
                    </div>
                  ) : null}
                  {m.role === "assistant" && m.activity && m.activity.length > 0 ? (
                    <div className="mb-2 text-xs text-subtle">{m.activity.slice(-1)[0]}</div>
                  ) : null}
                  <div className={m.role === "user" ? "rounded-lg bg-elevated px-3 py-2 text-sm shadow-[var(--shadow-border)]" : ""}>
                    {m.role === "assistant" ? (
                      m.content ? <MarkdownOutput text={m.content} /> : <span className="text-sm text-muted">กำลังวิเคราะห์…</span>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {busy ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Boss กำลังทำงาน — เลือกเครื่องมือและตรวจผลให้เอง
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-border px-3 py-3">
            <div className="mx-auto max-w-2xl">
              {previews.length > 0 ? (
                <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {previews.map((item, index) => (
                    <div key={`${item.file.name}-${index}`} className="relative overflow-hidden rounded-lg bg-elevated p-2 shadow-[var(--shadow-border)]">
                      {item.url ? (
                        <img src={item.url} alt={item.file.name} className="h-24 w-full rounded object-cover" />
                      ) : (
                        <div className="flex h-24 flex-col items-center justify-center gap-1 text-muted">
                          {item.file.name.toLowerCase().endsWith(".zip") ? <Archive className="size-7" /> : <FileText className="size-7" />}
                          <span className="max-w-full truncate text-xs">{item.file.name}</span>
                        </div>
                      )}
                      <button type="button" onClick={() => removeAttachment(index)} className="absolute right-1 top-1 rounded-full bg-bg/90 p-1" aria-label={`Remove ${item.file.name}`}>
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex items-end gap-2 rounded-lg bg-elevated p-2 shadow-[var(--shadow-border)]">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.zip,.pdf,.txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.go,.rs,.java,.css,.html"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(Array.from(e.target.files));
                    e.currentTarget.value = "";
                  }}
                />
                <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} aria-label="Attach files">
                  <Paperclip className="size-4" />
                </Button>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={canChat ? "คุยกับ Boss… Shift+Enter ขึ้นบรรทัดใหม่" : "Sign in with Puter หรือใส่ OpenRouter key"}
                  className="min-h-12 border-0 bg-transparent shadow-none focus-visible:shadow-none"
                  rows={2}
                />
                <Button size="icon" onClick={() => void send()} disabled={busy || (!draft.trim() && attachments.length === 0)} aria-label="Send">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
              <p className="mt-2 text-center text-[11px] text-subtle">Boss เลือกเครื่องมือและตรวจผลให้เอง · ไม่มีปุ่ม Skill</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
