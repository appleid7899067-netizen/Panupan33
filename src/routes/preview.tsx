import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, RefreshCw, Sparkles, Check, AlertTriangle, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/preview")({ component: PreviewPage });

function PreviewPage() {
  const [url, setUrl] = useState("");
  const [chatId, setChatId] = useState("");
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("chat") || "";
    setChatId(id);
    try {
      if (id) {
        const saved = window.localStorage.getItem(`bossnu-preview:${id}`) || "";
        setUrl(saved);
        setPreviewState(saved ? "loading" : "idle");
      }
    } catch { /* intentionally ignored */ }
  }, []);

  const refresh = () => {
    if (!url) return;
    setPreviewState("loading");
    const iframe = document.getElementById("boss-preview-frame") as HTMLIFrameElement | null;
    if (iframe) iframe.src = url;
  };

  const copyPreviewUrl = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AppShell>
      <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.08),transparent_34%)]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-zinc-950/90 px-4 py-3 backdrop-blur-2xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => window.location.assign(chatId ? `/chat?thread=${encodeURIComponent(chatId)}` : "/chat")} className="grid size-9 shrink-0 place-items-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" aria-label="กลับ Chat">
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100"><Sparkles className="size-3.5 text-violet-300" /> Preview Room</div>
              <div className="flex min-w-0 items-center gap-2">
                <div className="truncate text-[10px] text-zinc-500">{url || "รอ Boss publish งานนี้..."}</div>
                {url && (
                  <span className={"inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] " + (previewState === "ready" ? "bg-emerald-500/10 text-emerald-300" : previewState === "error" ? "bg-red-500/10 text-red-300" : "bg-zinc-800 text-zinc-400")}>
                    {previewState === "ready" ? <Check className="size-2.5" /> : previewState === "error" ? <AlertTriangle className="size-2.5" /> : <RefreshCw className="size-2.5 animate-spin" />}
                    {previewState === "ready" ? "Preview พร้อม" : previewState === "error" ? "โหลดไม่สำเร็จ" : "กำลังโหลด"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {url && <button type="button" onClick={copyPreviewUrl} className="grid size-9 place-items-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" aria-label="คัดลอก URL Preview" title="คัดลอก URL Preview">{copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}</button>}
            <button type="button" onClick={refresh} disabled={!url} className="grid size-9 place-items-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30" aria-label="รีเฟรช Preview"><RefreshCw className="size-3.5" /></button>
            {url && <a href={url} target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" aria-label="เปิด Preview ในแท็บใหม่"><ExternalLink className="size-3.5" /></a>}
          </div>
        </header>
        <main className="min-h-0 flex-1 p-2 sm:p-4">
          <div className="h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white shadow-2xl">
            {url ? (
              <iframe id="boss-preview-frame" title="Boss live preview" src={url} onLoad={() => setPreviewState("ready")} onError={() => setPreviewState("error")} className="h-full w-full border-0" allow="clipboard-read; clipboard-write" />
            ) : (
              <div className="grid h-full place-items-center bg-zinc-950 text-center">
                <div className="max-w-md px-6">
                  <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-violet-500/10 text-violet-300"><Sparkles className="size-5" /></div>
                  <h1 className="text-base font-semibold text-zinc-100">Preview ยังไม่มี URL</h1>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">สั่ง Boss ใน Chat ให้สร้างหรือ publish งานก่อน แล้วกลับมาที่ห้องนี้ Preview จะใช้ URL ของงานนั้น</p>
                  <button type="button" onClick={() => window.location.assign(chatId ? `/chat?thread=${encodeURIComponent(chatId)}` : "/chat")} className="mt-5 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-zinc-200">กลับไปสั่ง Boss</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </AppShell>
  );
}
