/**
 * ONE SANDBOX
 * A single clean workspace for code, preview, and runtime logs.
 */

import { useEffect, useState } from "react";
import {
  Box,
  Code2,
  Eye,
  FolderTree,
  GitBranch,
  Play,
  RotateCcw,
  Server,
  Terminal,
} from "lucide-react";
import {
  superSandbox,
  type SandboxFile,
  type SandboxFramework,
  type SandboxLanguage,
} from "@/lib/super-sandbox";

const SAMPLE_FILES: SandboxFile[] = [
  {
    path: "App.tsx",
    content: `export default function App() {
  const [count, setCount] = React.useState(0);

  return (
    <main className="min-h-screen grid place-items-center bg-zinc-950 text-white p-8">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold">ONE SANDBOX</h1>
        <p className="text-zinc-400">Build → Run → Preview → Fix</p>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="rounded-full bg-white px-5 py-2 font-medium text-black"
        >
          Click {count}
        </button>
      </section>
    </main>
  );
}`,
    language: "typescript",
    framework: "react",
  },
  {
    path: "style.css",
    content: `body { margin: 0; font-family: system-ui; }`,
    language: "css",
  },
];

type View = "code" | "preview" | "logs";

export function SuperSandbox() {
  const [files, setFiles] = useState<SandboxFile[]>(SAMPLE_FILES);
  const [activeFile, setActiveFile] = useState(0);
  const [view, setView] = useState<View>("code");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | "tablet">("desktop");
  const [currentRun, setCurrentRun] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const stats = superSandbox?.getStats();

  const run = async () => {
    if (!superSandbox) return;
    setBusy(true);
    try {
      const result = await superSandbox.run({
        files,
        language: files[activeFile]?.language as SandboxLanguage,
        framework: files[activeFile]?.framework as SandboxFramework,
        packageManager: "npm",
        devServer: "vite",
        previewMode,
        runMode: "auto-fix",
        // Keep the sandbox independent from provider-specific search/translation tools.
        borrowTools: [],
      });
      setCurrentRun(result);
      setView(result?.status === "success" ? "preview" : "logs");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFiles(SAMPLE_FILES);
    setActiveFile(0);
    setCurrentRun(null);
    setView("code");
  };

  useEffect(() => {
    void run();
    // Initial preview only. Do not create a second sandbox or duplicate tool run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#0a0a0a] text-zinc-100">
      {/* Minimal header */}
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-800 text-zinc-200">
            <Box className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">ONE SANDBOX</div>
            <div className="hidden text-[11px] text-zinc-500 sm:block">
              {stats?.languages ?? 0} languages · {stats?.frameworks ?? 0} frameworks · isolated workspace
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`size-2 rounded-full ${currentRun?.status === "success" ? "bg-emerald-400" : currentRun?.status === "failed" ? "bg-red-400" : "bg-zinc-600"}`}
            title={currentRun?.status || "idle"}
          />
          <span className="hidden text-[11px] text-zinc-500 sm:inline">
            {currentRun?.status === "success" ? "Ready" : currentRun?.status === "failed" ? "Needs repair" : "Idle"}
          </span>
        </div>
      </header>

      {/* Mobile view switcher */}
      <div className="flex shrink-0 gap-1 border-b border-zinc-800/80 p-2 md:hidden">
        {([
          ["code", "Code", Code2],
          ["preview", "Preview", Eye],
          ["logs", "Logs", Terminal],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs transition ${view === key ? "bg-zinc-100 text-black" : "text-zinc-500 hover:bg-zinc-900"}`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Editor */}
        <section className={`flex min-h-0 min-w-0 flex-1 flex-col border-zinc-800/80 md:w-[43%] md:border-r ${view === "code" ? "flex" : "hidden md:flex"}`}>
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-3 py-2">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
              <FolderTree className="size-3" /> Files
            </span>
            <div className="flex max-w-[70%] gap-1 overflow-x-auto">
              {files.map((file, i) => (
                <button
                  key={file.path}
                  onClick={() => setActiveFile(i)}
                  className={`shrink-0 rounded-md px-2 py-1 text-[11px] ${i === activeFile ? "bg-zinc-100 text-black" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}
                >
                  {file.path}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={files[activeFile]?.content || ""}
            onChange={(e) => {
              const next = [...files];
              next[activeFile] = { ...next[activeFile], content: e.target.value };
              setFiles(next);
            }}
            className="min-h-0 flex-1 resize-none overflow-auto bg-[#090909] p-4 font-mono text-[12px] leading-6 text-zinc-200 outline-none"
            spellCheck={false}
          />

          <div className="flex shrink-0 items-center gap-2 border-t border-zinc-800/80 p-2.5">
            <button
              onClick={() => void run()}
              disabled={busy}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-100 text-xs font-medium text-black transition hover:bg-white disabled:opacity-50"
            >
              <Play className="size-3.5" />
              {busy ? "กำลังรัน..." : "Run"}
            </button>
            <button
              onClick={reset}
              className="grid size-9 place-items-center rounded-lg bg-zinc-900 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
              title="Reset"
            >
              <RotateCcw className="size-3.5" />
            </button>
            <button
              className="grid size-9 place-items-center rounded-lg bg-zinc-900 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
              title="Branch"
            >
              <GitBranch className="size-3.5" />
            </button>
          </div>
        </section>

        {/* Preview */}
        <section className={`flex min-h-0 min-w-0 flex-1 flex-col ${view === "preview" ? "flex" : "hidden md:flex"}`}>
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-3 py-2">
            <div className="flex items-center gap-1">
              {(["desktop", "mobile", "tablet"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  className={`rounded-md px-2 py-1 text-[11px] capitalize ${previewMode === mode ? "bg-zinc-100 text-black" : "text-zinc-500 hover:bg-zinc-900"}`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <Server className="size-3" />
              {currentRun?.durationMs ?? 0}ms
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden bg-white">
            {currentRun?.previewHtml ? (
              <iframe
                title="Sandbox Preview"
                srcDoc={currentRun.previewHtml}
                className={`h-full w-full border-0 ${previewMode === "mobile" ? "mx-auto max-w-[390px] border-x border-zinc-200" : previewMode === "tablet" ? "mx-auto max-w-[820px] border-x border-zinc-200" : ""}`}
                sandbox="allow-scripts"
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-zinc-400">
                กด Run เพื่อสร้าง Preview
              </div>
            )}
          </div>
        </section>

        {/* Logs */}
        <section className={`min-h-0 flex-col border-zinc-800/80 bg-[#0b0b0b] md:h-40 md:border-t ${view === "logs" ? "flex" : "hidden md:flex"}`}>
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-3 py-2">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
              <Terminal className="size-3" /> Runtime Logs
            </span>
            <span className="text-[10px] text-zinc-600">{currentRun?.logs?.length ?? 0} events</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[11px] leading-5">
            {currentRun?.logs?.length ? (
              currentRun.logs.map((log: any, i: number) => (
                <div key={i} className={log.type?.includes("error") ? "text-red-400" : log.type === "build" ? "text-amber-300" : "text-zinc-500"}>
                  [{log.type}] {log.message}
                </div>
              ))
            ) : (
              <span className="text-zinc-700">No runtime events.</span>
            )}
            {currentRun?.error ? (
              <div className="mt-2 rounded-lg bg-red-950/30 p-2 text-red-400">{currentRun.error}</div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
