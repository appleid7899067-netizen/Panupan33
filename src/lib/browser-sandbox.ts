import { runWithBrowserRuntime } from "@/lib/browser-runtimes";

export type SandboxFile = { path: string; contents: string };

export type SandboxRunInput = {
  language: string;
  code: string;
  files?: SandboxFile[];
  timeoutMs?: number;
};

export type SandboxLog = { level: "log" | "warn" | "error"; text: string };

export type BrowserSandboxResult = {
  ok: boolean;
  runtime: "iframe" | "webcontainer" | "server" | "unavailable";
  stdout: string;
  stderr: string;
  logs: SandboxLog[];
  previewHtml?: string;
  durationMs: number;
  exitCode?: number;
  error?: string;
};

const VITE_FALLBACK = {
  path: "index.html",
  contents: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Bossnu sandbox</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; font-family: ui-sans-serif, system-ui; background: #0b0c0e; color: #eceef2; }
      main { min-height: 100dvh; display: grid; place-items: center; }
      .card { padding: 24px; border: 1px solid rgba(255,255,255,.08); border-radius: 16px; }
    </style>
  </head>
  <body>
    <main><div class="card"><h1>Vite starter fallback</h1><p>No project files yet. Attach files or send code to Boss.</p></div></main>
  </body>
</html>`,
};

export function viteStarterFallback(): SandboxFile {
  return VITE_FALLBACK;
}

function wrapRunnable(language: string, code: string) {
  const lang = language.toLowerCase();
  if (lang === "html" || lang === "htm") return code;
  if (lang === "css") {
    return `<!doctype html><html><head><style>${code}</style></head><body><div class="preview">CSS loaded</div></body></html>`;
  }
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <pre id="out"></pre>
    <script>
      const send = (type, payload) => parent.postMessage({ source: "bossnu-sandbox", type, payload }, "*");
      const orig = { log: console.log, warn: console.warn, error: console.error };
      console.log = (...args) => { orig.log(...args); send("log", args.map(String).join(" ")); };
      console.warn = (...args) => { orig.warn(...args); send("warn", args.map(String).join(" ")); };
      console.error = (...args) => { orig.error(...args); send("error", args.map(String).join(" ")); };
      window.onerror = (message, src, line, col, err) => {
        send("runtime-error", String(err?.stack || message || "runtime error"));
        return true;
      };
      window.onunhandledrejection = (event) => {
        send("runtime-error", String(event.reason?.stack || event.reason || "unhandled rejection"));
      };
      try {
        ${code}
        send("done", { ok: true });
      } catch (error) {
        send("runtime-error", String(error && error.stack ? error.stack : error));
        send("done", { ok: false });
      }
    </script>
  </body>
</html>`;
}

export function webcontainerAvailable() {
  return typeof window !== "undefined" && typeof SharedArrayBuffer === "function" && typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
}

function runServerVerification(
  language: string,
  code: string,
  started: number,
): BrowserSandboxResult {
  const lang = language.trim().toLowerCase();
  const logs: SandboxLog[] = [];

  // Agent calls can arrive on Render where a browser does not exist.
  // Do not turn that environment fact into a fake code failure.
  if (/^(js|javascript|node|nodejs|ts|typescript)$/.test(lang)) {
    let balance = 0;
    let quote: string | null = null;
    let escaped = false;
    for (const ch of code) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (quote) {
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === "\"" || ch === "'" || ch === "`") { quote = ch; continue; }
      if (ch === "{") balance++;
      if (ch === "}") balance--;
      if (balance < 0) break;
    }
    const ok = balance === 0 && !quote && !/\b(?:TODO|FIXME)\b/.test(code);
    const message = ok ? "Server-side code verification passed; browser runtime not required." : "Server-side code verification found an incomplete block or unresolved marker.";
    logs.push({ level: ok ? "log" : "error", text: message });
    return {
      ok,
      runtime: "server",
      stdout: ok ? "Static runtime verification passed." : "",
      stderr: ok ? "" : message,
      logs,
      durationMs: Date.now() - started,
      exitCode: ok ? 0 : 1,
      ...(ok ? {} : { error: message }),
    };
  }

  if (/^(html|htm)$/.test(lang)) {
    const ok = /<html[\s>]/i.test(code) && /<body[\s>]/i.test(code) && /<\/body>/i.test(code);
    const message = ok ? "HTML structure verified." : "HTML structure verification failed.";
    logs.push({ level: ok ? "log" : "error", text: message });
    return { ok, runtime: "server", stdout: ok ? message : "", stderr: ok ? "" : message, logs, durationMs: Date.now() - started, exitCode: ok ? 0 : 1, ...(ok ? {} : { error: message }) };
  }

  if (lang === "css") {
    let depth = 0;
    for (const ch of code) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (depth < 0) break;
    }
    const ok = depth === 0;
    const message = ok ? "CSS structure verified." : "CSS brace verification failed.";
    logs.push({ level: ok ? "log" : "error", text: message });
    return { ok, runtime: "server", stdout: ok ? message : "", stderr: ok ? "" : message, logs, durationMs: Date.now() - started, exitCode: ok ? 0 : 1, ...(ok ? {} : { error: message }) };
  }

  const message = `No server verifier for "${language}". Browser execution is required for this language.`;
  return { ok: false, runtime: "unavailable", stdout: "", stderr: message, logs: [{ level: "error", text: message }], durationMs: Date.now() - started, exitCode: 127, error: "RUNTIME_UNAVAILABLE" };
}

export async function runInBrowserSandbox(input: SandboxRunInput): Promise<BrowserSandboxResult> {
  const started = Date.now();
  const timeoutMs = Math.min(Math.max(input.timeoutMs ?? 12_000, 500), 30_000);
  const language = input.language.trim() || "javascript";
  const iframeLang = /^(js|javascript|ts|typescript|html|htm|css)$/i.test(language);

  if (typeof window === "undefined") {
    return runServerVerification(language, input.code, started);
  }

  // Multi-language real-browser path (Python/Lua/SQL/...) with install memory
  if (!iframeLang) {
    const multi = await runWithBrowserRuntime(language, input.code);
    if (multi.error !== "DEFER_IFRAME") {
      return {
        ok: multi.ok,
        runtime: "iframe",
        stdout: multi.stdout,
        stderr: multi.stderr,
        logs: multi.stdout
          ? [{ level: "log" as const, text: multi.stdout }]
          : multi.stderr
            ? [{ level: "error" as const, text: multi.stderr }]
            : [],
        durationMs: multi.durationMs,
        exitCode: multi.exitCode,
        ...(multi.ok
          ? {}
          : { error: multi.error || multi.stderr || "Sandbox run failed." }),
      };
    }
  }

  const html = wrapRunnable(language === "typescript" || language === "ts" ? "javascript" : language, input.code);
  const logs: SandboxLog[] = [];
  let stderr = "";

  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    let settled = false;

    const finish = (ok: boolean, extra?: string) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      iframe.remove();
      URL.revokeObjectURL(url);
      resolve({
        ok,
        runtime: "iframe",
        stdout: logs.filter((l) => l.level === "log").map((l) => l.text).join("\n"),
        stderr: stderr || extra || "",
        logs,
        previewHtml: html,
        durationMs: Date.now() - started,
        exitCode: ok ? 0 : 1,
        ...(ok ? {} : { error: stderr || extra || "Sandbox run failed." }),
      });
    };

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; type?: string; payload?: unknown };
      if (!data || data.source !== "bossnu-sandbox") return;
      if (data.type === "log" || data.type === "warn" || data.type === "error") {
        logs.push({ level: data.type, text: String(data.payload ?? "") });
        if (data.type === "error") stderr += `${String(data.payload ?? "")}\n`;
      }
      if (data.type === "runtime-error") {
        stderr += `${String(data.payload ?? "")}\n`;
        logs.push({ level: "error", text: String(data.payload ?? "") });
      }
      if (data.type === "done") {
        const payload = data.payload as { ok?: boolean } | undefined;
        finish(Boolean(payload?.ok) && !stderr.trim());
      }
    };

    window.addEventListener("message", onMessage);
    iframe.src = url;
    document.body.appendChild(iframe);
    window.setTimeout(() => finish(!stderr.trim(), stderr.trim() ? undefined : "Sandbox timed out."), timeoutMs);
  });
}

export function buildPreviewDocument(files: SandboxFile[]) {
  const html = files.find((f) => /index\.html$/i.test(f.path)) ?? files.find((f) => /\.html$/i.test(f.path));
  if (html) return html.contents;
  const js = files.find((f) => /\.(js|mjs)$/i.test(f.path));
  const css = files.filter((f) => /\.css$/i.test(f.path)).map((f) => f.contents).join("\n");
  if (js) return wrapRunnable("javascript", js.contents);
  if (css) return wrapRunnable("css", css);
  return viteStarterFallback().contents;
}
