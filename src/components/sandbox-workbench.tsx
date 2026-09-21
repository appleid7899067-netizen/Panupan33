import { useMemo, useState } from "react";
import { Loader2, Play, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  buildPreviewDocument,
  runInBrowserSandbox,
  viteStarterFallback,
  webcontainerAvailable,
  type SandboxFile,
  type SandboxLog,
} from "@/lib/browser-sandbox";
import { useFleet } from "@/lib/store";

const SAMPLE = `const root = document.createElement("div");
root.textContent = "Hello from Bossnu sandbox";
document.body.appendChild(root);
console.log("sandbox ok");`;

export function SandboxWorkbench({
  initialFiles,
  onErrorToBoss,
}: {
  initialFiles?: SandboxFile[];
  onErrorToBoss?: (payload: string) => void;
}) {
  const [code, setCode] = useState(SAMPLE);
  const [logs, setLogs] = useState<SandboxLog[]>([]);
  const [preview, setPreview] = useState(buildPreviewDocument(initialFiles?.length ? initialFiles : [viteStarterFallback()]));
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const newThread = useFleet((s) => s.newThread);
  const setActive = useFleet((s) => s.setActiveThread);
  const appendMessage = useFleet((s) => s.appendMessage);

  const isolated = useMemo(() => webcontainerAvailable(), []);

  async function run() {
    setBusy(true);
    setLastError(null);
    try {
      const result = await runInBrowserSandbox({ language: "javascript", code });
      setLogs(result.logs);
      if (result.previewHtml) setPreview(result.previewHtml);
      if (!result.ok) {
        setLastError(result.stderr || result.error || "Sandbox error");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLastError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setCode(SAMPLE);
    setLogs([]);
    setLastError(null);
    setPreview(buildPreviewDocument([viteStarterFallback()]));
  }

  function sendToBoss() {
    const payload = [
      "Sandbox runtime report:",
      lastError ? `Error:\n${lastError}` : "No fatal error.",
      logs.length ? `Logs:\n${logs.map((l) => `[${l.level}] ${l.text}`).join("\n")}` : "No logs.",
      `Code:\n${code.slice(0, 8000)}`,
    ].join("\n\n");
    onErrorToBoss?.(payload);
    const id = newThread();
    setActive(id);
    appendMessage(id, { role: "user", content: `ซ่อม sandbox นี้ให้:\n\n${payload}` });
    toast.success("ส่งรายงานเข้า Chat แล้ว");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Code</p>
          <p className="text-xs text-subtle">{isolated ? "WebContainer available" : "Iframe sandbox"}</p>
        </div>
        <Textarea value={code} onChange={(e) => setCode(e.target.value)} className="min-h-56 font-mono text-xs" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void run()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Run
          </Button>
          <Button variant="secondary" onClick={reset}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
          <Button variant="outline" onClick={sendToBoss} disabled={!lastError && logs.every((l) => l.level !== "error")}>
            <Send className="size-4" />
            ส่ง error ให้ Boss
          </Button>
        </div>
      </section>
      <section className="grid gap-3">
        <div className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
          <p className="border-b border-border px-3 py-2 text-xs uppercase tracking-wider text-subtle">Live preview</p>
          <iframe title="Sandbox preview" className="h-64 w-full bg-bg" sandbox="allow-scripts" srcDoc={preview} />
        </div>
        <div className="rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
          <p className="text-xs uppercase tracking-wider text-subtle">Console</p>
          <pre className="mt-2 max-h-40 overflow-auto font-mono text-xs text-muted">
            {logs.length ? logs.map((l) => `[${l.level}] ${l.text}`).join("\n") : "No output yet."}
          </pre>
          {lastError ? <p className="mt-2 text-sm text-danger">{lastError}</p> : null}
        </div>
      </section>
    </div>
  );
}
