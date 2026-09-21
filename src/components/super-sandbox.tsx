/**
 * SUPER 2: ONE SANDBOX - สนามเดียว 100 อย่าง
 */

import { useState, useEffect } from "react";
import { Play, Code2, Box, Package, Server, Eye, FolderTree, GitBranch, Zap, Wrench, Globe } from "lucide-react";
import { superSandbox, type SandboxFile, type SandboxLanguage, type SandboxFramework } from "@/lib/super-sandbox";

const SAMPLE_FILES: SandboxFile[] = [
  {
    path: "App.tsx",
    content: `export default function App() {
  const [count, setCount] = React.useState(0);
  return (
    <div className="min-h-screen grid place-items-center bg-zinc-950 text-white p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">ONE SANDBOX 🚀</h1>
        <p className="text-zinc-400">100 สนามเป็น 1 เดียว</p>
        <div className="flex items-center justify-center gap-3">
          <button 
            onClick={() => setCount(c => c + 1)}
            className="px-4 py-2 rounded-full bg-white text-black font-medium"
          >
            Click {count}
          </button>
          <span className="text-sm text-zinc-500">ภาษา: TypeScript + React + Tailwind</span>
        </div>
      </div>
    </div>
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

export function SuperSandbox() {
  const [files, setFiles] = useState<SandboxFile[]>(SAMPLE_FILES);
  const [activeFile, setActiveFile] = useState(0);
  const [previewMode, setPreviewMode] = useState<"iframe" | "mobile" | "desktop">("iframe");
  const [runs, setRuns] = useState<any[]>([]);
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
        borrowTools: ["google-search", "yandex-translate"],
      });
      setCurrentRun(result);
      setRuns(superSandbox.getRuns());
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // Auto run ครั้งแรก
    run();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] bg-[#0a0a0a] text-zinc-100">
      {/* Header - โชว์ 100 อย่างใน 1 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="size-7 rounded bg-white text-black grid place-items-center">
            <Box className="size-4" />
          </div>
          <div>
            <div className="text-sm font-medium">ONE SANDBOX • 100 สนามเป็น 1</div>
            <div className="text-[11px] text-zinc-500">
              {stats?.languages} ภาษา • {stats?.frameworks} เฟรมเวิร์ก • {stats?.packageManagers} package manager • {stats?.devServers} dev server
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center gap-1">
            <Code2 className="size-3" /> {stats?.languages} langs
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center gap-1">
            <Package className="size-3" /> {stats?.packageManagers} pkg
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center gap-1">
            <Server className="size-3" /> {stats?.devServers} servers
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center gap-1">
            <Eye className="size-3" /> {stats?.previewModes} previews
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: File Tree + Editor */}
        <div className="w-[40%] border-r border-zinc-800 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/30">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <FolderTree className="size-3" /> Files • {files.length}
            </span>
            <div className="flex gap-1">
              {files.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setActiveFile(i)}
                  className={`text-[11px] px-2 py-0.5 rounded ${i === activeFile ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                >
                  {f.path}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 p-0 overflow-auto">
            <textarea
              value={files[activeFile]?.content || ""}
              onChange={(e) => {
                const newFiles = [...files];
                newFiles[activeFile] = { ...newFiles[activeFile], content: e.target.value };
                setFiles(newFiles);
              }}
              className="w-full h-full bg-[#0a0a0a] text-zinc-100 font-mono text-xs p-4 outline-none resize-none"
              spellCheck={false}
            />
          </div>
          <div className="p-2 border-t border-zinc-800 flex gap-2">
            <button
              onClick={run}
              disabled={busy}
              className="flex-1 h-8 rounded-full bg-white text-black text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Play className="size-3.5" /> {busy ? "กำลังรัน..." : "รัน (100 อย่างใน 1)"}
            </button>
            <button className="size-8 rounded-full bg-zinc-800 border border-zinc-700 grid place-items-center text-zinc-400">
              <GitBranch className="size-4" />
            </button>
            <button className="size-8 rounded-full bg-zinc-800 border border-zinc-700 grid place-items-center text-zinc-400">
              <Wrench className="size-4" />
            </button>
          </div>
        </div>

        {/* Right: Preview + Logs */}
        <div className="flex-1 flex flex-col">
          {/* Preview controls */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/30">
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPreviewMode("iframe")} className={`text-[11px] px-2.5 py-1 rounded-full border ${previewMode === "iframe" ? "bg-white text-black border-white" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>Desktop</button>
              <button onClick={() => setPreviewMode("mobile")} className={`text-[11px] px-2.5 py-1 rounded-full border ${previewMode === "mobile" ? "bg-white text-black border-white" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>Mobile</button>
              <button onClick={() => setPreviewMode("desktop")} className={`text-[11px] px-2.5 py-1 rounded-full border ${previewMode === "desktop" ? "bg-white text-black border-white" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>Tablet</button>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1"><Globe className="size-3" /> {currentRun?.borrowedTools?.length || 0} tools ยืมมา</span>
              <span>•</span>
              <span>{currentRun?.durationMs || 0}ms</span>
              <span className={`size-1.5 rounded-full ${currentRun?.status === "success" ? "bg-green-500" : currentRun?.status === "failed" ? "bg-red-500" : "bg-zinc-500"}`} />
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 bg-white overflow-hidden relative">
            {currentRun?.previewHtml ? (
              <iframe
                title="Super Sandbox Preview"
                srcDoc={currentRun.previewHtml}
                className={`w-full h-full border-0 ${previewMode === "mobile" ? "max-w-[390px] mx-auto border-x border-zinc-200" : ""}`}
                sandbox="allow-scripts"
              />
            ) : (
              <div className="h-full grid place-items-center text-zinc-400 text-sm">
                กด รัน เพื่อดู preview 100 อย่างใน 1
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="h-[140px] border-t border-zinc-800 bg-zinc-900/50 overflow-auto">
            <div className="px-3 py-1.5 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Zap className="size-3" /> Logs • {currentRun?.logs?.length || 0} • {currentRun?.status}
              </span>
              <span className="text-[10px] text-zinc-600">100 อย่างใน 1 สนาม</span>
            </div>
            <div className="p-2 font-mono text-[11px] space-y-1">
              {currentRun?.logs?.map((log: any, i: number) => (
                <div key={i} className={`${log.type.includes("error") ? "text-red-400" : log.type === "build" ? "text-amber-300" : "text-zinc-400"}`}>
                  [{log.type}] {log.message}
                </div>
              )) || <div className="text-zinc-600">ยังไม่มี log - กดรันเลย</div>}
              {currentRun?.error && (
                <div className="text-red-400 bg-red-950/30 rounded p-1.5 mt-1">{currentRun.error}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className="px-4 py-1.5 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-center gap-3 text-[10px] text-zinc-600">
        <span>100 สนามเป็น 1:</span>
        <span>{stats?.languages} ภาษา</span>
        <span>•</span>
        <span>{stats?.frameworks} เฟรมเวิร์ก</span>
        <span>•</span>
        <span>{stats?.packageManagers} package manager</span>
        <span>•</span>
        <span>{stats?.devServers} dev server</span>
        <span>•</span>
        <span>{stats?.previewModes} preview</span>
        <span>•</span>
        <span>ยืมเครื่องมือโลกได้</span>
      </div>
    </div>
  );
}
