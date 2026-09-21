import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SandboxWorkbench } from "@/components/sandbox-workbench";
import { webcontainerAvailable } from "@/lib/browser-sandbox";

export const Route = createFileRoute("/sandbox")({ component: SandboxPage });

function SandboxPage() {
  const isolated = typeof window !== "undefined" && webcontainerAvailable();
  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <h1 className="text-3xl font-medium tracking-tight">Sandbox</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          รันโปรเจกต์ในเบราว์เซอร์: preview, console, error, reset. ถ้า WebContainer ใช้ไม่ได้ในหน้านี้
          จะใช้ iframe sandbox และ Vite starter fallback. Runtime error ส่งกลับเข้า Chat ให้ Boss ซ่อมได้
        </p>
        <p className="mt-3 text-xs text-subtle">
          Runtime now: {isolated ? "WebContainer (SharedArrayBuffer)" : "iframe sandbox (preview-safe)"}
        </p>
        <div className="mt-8">
          <SandboxWorkbench />
        </div>
      </main>
    </AppShell>
  );
}
