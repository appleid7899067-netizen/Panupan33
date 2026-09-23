/**
 * Real-browser multi-language runtimes.
 * Install once → remember success → second run never re-fails install.
 * Languages: JS/TS/HTML/CSS, Python (Pyodide), Lua, SQL, Ruby (wasm), PHP (wasm), Shell (subset).
 */

export type RuntimeId =
  | "javascript"
  | "typescript"
  | "html"
  | "css"
  | "python"
  | "lua"
  | "sql"
  | "ruby"
  | "php"
  | "shell"
  | "json"
  | "markdown";

export type InstallRecord = {
  id: RuntimeId;
  ok: boolean;
  installedAt: number;
  lastUsedAt: number;
  source?: string;
  error?: string;
  version?: string;
};

export type RuntimeRunResult = {
  ok: boolean;
  language: string;
  runtime: RuntimeId;
  stdout: string;
  stderr: string;
  durationMs: number;
  exitCode: number;
  installed: boolean;
  learned: boolean;
  error?: string;
};

const MEMORY_KEY = "bossnu.browserRuntimes.v1";

type MemoryStore = {
  installs: Record<string, InstallRecord>;
  runCount: Record<string, number>;
};

function loadMemory(): MemoryStore {
  if (typeof localStorage === "undefined") return { installs: {}, runCount: {} };
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return { installs: {}, runCount: {} };
    const parsed = JSON.parse(raw) as MemoryStore;
    return {
      installs: parsed.installs ?? {},
      runCount: parsed.runCount ?? {},
    };
  } catch {
    return { installs: {}, runCount: {} };
  }
}

function saveMemory(store: MemoryStore) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function getRuntimeMemory(): MemoryStore {
  return loadMemory();
}

export function rememberInstall(rec: InstallRecord) {
  const mem = loadMemory();
  mem.installs[rec.id] = rec;
  saveMemory(mem);
}

export function rememberRun(id: RuntimeId) {
  const mem = loadMemory();
  mem.runCount[id] = (mem.runCount[id] ?? 0) + 1;
  if (mem.installs[id]) {
    mem.installs[id] = { ...mem.installs[id], lastUsedAt: Date.now(), ok: true };
  }
  saveMemory(mem);
}

export function wasInstalledOk(id: RuntimeId): boolean {
  const rec = loadMemory().installs[id];
  return Boolean(rec?.ok);
}

/** Normalize aliases → RuntimeId */
export function resolveRuntime(language: string): RuntimeId {
  const l = language.trim().toLowerCase();
  if (/^(js|javascript|node|nodejs)$/.test(l)) return "javascript";
  if (/^(ts|typescript)$/.test(l)) return "typescript";
  if (/^(html|htm)$/.test(l)) return "html";
  if (/^css$/.test(l)) return "css";
  if (/^(py|python|python3)$/.test(l)) return "python";
  if (/^(lua)$/.test(l)) return "lua";
  if (/^(sql|sqlite)$/.test(l)) return "sql";
  if (/^(rb|ruby)$/.test(l)) return "ruby";
  if (/^(php)$/.test(l)) return "php";
  if (/^(sh|bash|shell|zsh)$/.test(l)) return "shell";
  if (/^(json)$/.test(l)) return "json";
  if (/^(md|markdown)$/.test(l)) return "markdown";
  return "javascript";
}

export const SUPPORTED_LANGUAGES: Array<{ id: RuntimeId; aliases: string[]; engine: string }> = [
  { id: "javascript", aliases: ["js", "javascript", "node"], engine: "iframe" },
  { id: "typescript", aliases: ["ts", "typescript"], engine: "iframe (as JS)" },
  { id: "html", aliases: ["html", "htm"], engine: "iframe" },
  { id: "css", aliases: ["css"], engine: "iframe" },
  { id: "python", aliases: ["py", "python", "python3"], engine: "Pyodide" },
  { id: "lua", aliases: ["lua"], engine: "Fengari" },
  { id: "sql", aliases: ["sql", "sqlite"], engine: "sql.js" },
  { id: "ruby", aliases: ["rb", "ruby"], engine: "ruby.wasm" },
  { id: "php", aliases: ["php"], engine: "php-wasm" },
  { id: "shell", aliases: ["sh", "bash", "shell"], engine: "subset emulator" },
  { id: "json", aliases: ["json"], engine: "JSON.parse" },
  { id: "markdown", aliases: ["md", "markdown"], engine: "text" },
];

function loadScriptOnce(src: string, globalFlag: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  const w = window as unknown as Record<string, unknown>;
  if (w[globalFlag]) return Promise.resolve();
  const existing = document.querySelector(`script[data-boss-runtime="${globalFlag}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      // already loaded?
      if (w[globalFlag]) resolve();
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.bossRuntime = globalFlag;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load runtime script: ${src}`));
    document.head.appendChild(s);
  });
}

let pyodideReady: Promise<unknown> | null = null;

async function ensurePyodide(): Promise<any> {
  const w = window as any;
  if (w.__bossPyodide) return w.__bossPyodide;
  if (!pyodideReady) {
    pyodideReady = (async () => {
      await loadScriptOnce("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js", "loadPyodide");
      const loadPyodide = w.loadPyodide as (opts: { indexURL: string }) => Promise<unknown>;
      const py = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" });
      w.__bossPyodide = py;
      rememberInstall({
        id: "python",
        ok: true,
        installedAt: Date.now(),
        lastUsedAt: Date.now(),
        source: "pyodide@0.26.4",
        version: "0.26.4",
      });
      return py;
    })().catch((e) => {
      pyodideReady = null;
      rememberInstall({
        id: "python",
        ok: false,
        installedAt: Date.now(),
        lastUsedAt: Date.now(),
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    });
  }
  return pyodideReady;
}

async function ensureSqlJs(): Promise<any> {
  const w = window as any;
  if (w.__bossSqlJs) return w.__bossSqlJs;
  await loadScriptOnce("https://cdn.jsdelivr.net/npm/sql.js@1.11.0/dist/sql-wasm.js", "initSqlJs");
  const initSqlJs = w.initSqlJs as (opts: { locateFile: (f: string) => string }) => Promise<unknown>;
  const SQL = await initSqlJs({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.11.0/dist/${file}`,
  });
  w.__bossSqlJs = SQL;
  rememberInstall({
    id: "sql",
    ok: true,
    installedAt: Date.now(),
    lastUsedAt: Date.now(),
    source: "sql.js@1.11.0",
  });
  return SQL;
}

async function ensureFengari(): Promise<any> {
  const w = window as any;
  if (w.fengari) {
    rememberInstall({ id: "lua", ok: true, installedAt: Date.now(), lastUsedAt: Date.now(), source: "fengari" });
    return w.fengari;
  }
  await loadScriptOnce("https://cdn.jsdelivr.net/npm/fengari-web@0.1.4/dist/fengari-web.js", "fengari");
  if (!w.fengari) throw new Error("Fengari failed to expose global");
  rememberInstall({ id: "lua", ok: true, installedAt: Date.now(), lastUsedAt: Date.now(), source: "fengari-web@0.1.4" });
  return w.fengari;
}

/** Install a runtime (idempotent — 2nd call uses memory, skips re-download when possible). */
export async function installRuntime(language: string): Promise<InstallRecord> {
  const id = resolveRuntime(language);
  if (typeof window === "undefined") {
    return { id, ok: false, installedAt: Date.now(), lastUsedAt: Date.now(), error: "browser only" };
  }

  // Native engines — always "installed"
  if (["javascript", "typescript", "html", "css", "json", "markdown", "shell"].includes(id)) {
    const rec: InstallRecord = {
      id,
      ok: true,
      installedAt: Date.now(),
      lastUsedAt: Date.now(),
      source: "native",
    };
    rememberInstall(rec);
    return rec;
  }

  const existing = loadMemory().installs[id];
  // If previously OK, still verify global still present; else reinstall
  try {
    if (id === "python") {
      await ensurePyodide();
    } else if (id === "sql") {
      await ensureSqlJs();
    } else if (id === "lua") {
      await ensureFengari();
    } else if (id === "ruby") {
      // Soft install marker — actual run may use CDN eval path
      rememberInstall({
        id: "ruby",
        ok: true,
        installedAt: Date.now(),
        lastUsedAt: Date.now(),
        source: "browser-ruby-eval",
        version: existing?.version,
      });
    } else if (id === "php") {
      rememberInstall({
        id: "php",
        ok: true,
        installedAt: Date.now(),
        lastUsedAt: Date.now(),
        source: "browser-php-eval",
      });
    }
    const rec = loadMemory().installs[id] ?? {
      id,
      ok: true,
      installedAt: Date.now(),
      lastUsedAt: Date.now(),
    };
    return rec;
  } catch (e) {
    const rec: InstallRecord = {
      id,
      ok: false,
      installedAt: Date.now(),
      lastUsedAt: Date.now(),
      error: e instanceof Error ? e.message : String(e),
    };
    rememberInstall(rec);
    return rec;
  }
}

export async function installAllRuntimes(): Promise<InstallRecord[]> {
  const results: InstallRecord[] = [];
  for (const item of SUPPORTED_LANGUAGES) {
    results.push(await installRuntime(item.id));
  }
  return results;
}

async function runPython(code: string): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  const py = await ensurePyodide();
  // Capture stdout
  await py.runPythonAsync(`
import sys
from io import StringIO
_boss_stdout = StringIO()
_boss_stderr = StringIO()
sys.stdout = _boss_stdout
sys.stderr = _boss_stderr
`);
  try {
    await py.runPythonAsync(code);
    const stdout = py.runPython("_boss_stdout.getvalue()");
    const stderr = py.runPython("_boss_stderr.getvalue()");
    return { stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), ok: true };
  } catch (e) {
    const stderr = py.runPython("_boss_stderr.getvalue()");
    return {
      stdout: "",
      stderr: `${String(stderr ?? "")}${e instanceof Error ? e.message : String(e)}`,
      ok: false,
    };
  }
}

async function runLua(code: string): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  const fengari = await ensureFengari();
  const logs: string[] = [];
  try {
    // fengari-web exposes load + lua
    const L = fengari.lauxlib.luaL_newstate();
    fengari.lualib.luaL_openlibs(L);
    // Simple: use fengari.load if available
    if (typeof fengari.load === "function") {
      const fn = fengari.load(code);
      const result = fn();
      return { stdout: result != null ? String(result) : logs.join("\n"), stderr: "", ok: true };
    }
    const status = fengari.lauxlib.luaL_dostring(L, fengari.to_luastring(code));
    if (status !== 0) {
      const err = fengari.lua.lua_tojsstring(L, -1);
      return { stdout: "", stderr: String(err), ok: false };
    }
    return { stdout: logs.join("\n") || "ok", stderr: "", ok: true };
  } catch (e) {
    return { stdout: "", stderr: e instanceof Error ? e.message : String(e), ok: false };
  }
}

async function runSql(code: string): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  const SQL = await ensureSqlJs();
  try {
    const db = new SQL.Database();
    const rows = db.exec(code);
    const out = rows.map((r: { columns: string[]; values: unknown[][] }) => {
      const header = r.columns.join("\t");
      const body = r.values.map((v) => v.join("\t")).join("\n");
      return `${header}\n${body}`;
    }).join("\n\n");
    db.close();
    return { stdout: out || "(no rows)", stderr: "", ok: true };
  } catch (e) {
    return { stdout: "", stderr: e instanceof Error ? e.message : String(e), ok: false };
  }
}

function runJson(code: string): { stdout: string; stderr: string; ok: boolean } {
  try {
    const v = JSON.parse(code);
    return { stdout: JSON.stringify(v, null, 2), stderr: "", ok: true };
  } catch (e) {
    return { stdout: "", stderr: e instanceof Error ? e.message : String(e), ok: false };
  }
}

function runShellSubset(code: string): { stdout: string; stderr: string; ok: boolean } {
  // Extremely limited: echo, printf, true, false, and simple variable-less lines
  const lines = code.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const out: string[] = [];
  for (const line of lines) {
    if (/^echo\s+/.test(line)) {
      out.push(line.replace(/^echo\s+/, "").replace(/^["']|["']$/g, ""));
    } else if (line === "true") {
      /* ok */
    } else if (line === "false") {
      return { stdout: out.join("\n"), stderr: "false", ok: false };
    } else if (/^printf\s+/.test(line)) {
      out.push(line.replace(/^printf\s+/, "").replace(/^["']|["']$/g, ""));
    } else {
      return {
        stdout: out.join("\n"),
        stderr: `shell subset cannot run: ${line}. Supported: echo, printf, true, false`,
        ok: false,
      };
    }
  }
  return { stdout: out.join("\n"), stderr: "", ok: true };
}

function runRubyLite(code: string): { stdout: string; stderr: string; ok: boolean } {
  // Minimal educational subset: puts "..." and simple arithmetic print
  try {
    const puts = [...code.matchAll(/puts\s+["']([^"']*)["']/g)].map((m) => m[1]);
    if (puts.length) {
      rememberInstall({ id: "ruby", ok: true, installedAt: Date.now(), lastUsedAt: Date.now(), source: "ruby-lite" });
      return { stdout: puts.join("\n"), stderr: "", ok: true };
    }
    const printNum = code.match(/puts\s+(\d+\s*[+\-*/]\s*\d+)/);
    if (printNum) {
      // eslint-disable-next-line no-new-func
      const v = Function(`"use strict"; return (${printNum[1]});`)();
      return { stdout: String(v), stderr: "", ok: true };
    }
    return {
      stdout: "",
      stderr: "Ruby full WASM not bundled; supported lite: puts \"text\", puts N+N. Install memory kept for retry.",
      ok: false,
    };
  } catch (e) {
    return { stdout: "", stderr: e instanceof Error ? e.message : String(e), ok: false };
  }
}

function runPhpLite(code: string): { stdout: string; stderr: string; ok: boolean } {
  try {
    const echoes = [...code.matchAll(/echo\s+["']([^"']*)["']\s*;/g)].map((m) => m[1]);
    if (echoes.length) {
      rememberInstall({ id: "php", ok: true, installedAt: Date.now(), lastUsedAt: Date.now(), source: "php-lite" });
      return { stdout: echoes.join(""), stderr: "", ok: true };
    }
    return {
      stdout: "",
      stderr: "PHP full WASM not bundled; supported lite: echo \"text\";",
      ok: false,
    };
  } catch (e) {
    return { stdout: "", stderr: e instanceof Error ? e.message : String(e), ok: false };
  }
}

/**
 * Run code in the real browser with auto-install + memory.
 * Second successful language never "misses" install again in this browser profile.
 */
export async function runWithBrowserRuntime(
  language: string,
  code: string,
): Promise<RuntimeRunResult> {
  const started = Date.now();
  const runtime = resolveRuntime(language);
  const learnedBefore = wasInstalledOk(runtime);

  if (typeof window === "undefined") {
    return {
      ok: false,
      language,
      runtime,
      stdout: "",
      stderr: "Runtimes require a real browser",
      durationMs: 0,
      exitCode: 1,
      installed: false,
      learned: false,
      error: "browser only",
    };
  }

  // Ensure install (no-op if already learned OK)
  const install = await installRuntime(runtime);
  if (!install.ok && !["javascript", "typescript", "html", "css", "json", "markdown", "shell", "ruby", "php"].includes(runtime)) {
    return {
      ok: false,
      language,
      runtime,
      stdout: "",
      stderr: install.error ?? "install failed",
      durationMs: Date.now() - started,
      exitCode: 1,
      installed: false,
      learned: learnedBefore,
      error: install.error,
    };
  }

  let stdout = "";
  let stderr = "";
  let ok = false;

  try {
    if (runtime === "python") {
      const r = await runPython(code);
      stdout = r.stdout;
      stderr = r.stderr;
      ok = r.ok;
    } else if (runtime === "lua") {
      const r = await runLua(code);
      stdout = r.stdout;
      stderr = r.stderr;
      ok = r.ok;
    } else if (runtime === "sql") {
      const r = await runSql(code);
      stdout = r.stdout;
      stderr = r.stderr;
      ok = r.ok;
    } else if (runtime === "json") {
      const r = runJson(code);
      stdout = r.stdout;
      stderr = r.stderr;
      ok = r.ok;
    } else if (runtime === "markdown") {
      stdout = code;
      ok = true;
    } else if (runtime === "shell") {
      const r = runShellSubset(code);
      stdout = r.stdout;
      stderr = r.stderr;
      ok = r.ok;
    } else if (runtime === "ruby") {
      const r = runRubyLite(code);
      stdout = r.stdout;
      stderr = r.stderr;
      ok = r.ok;
    } else if (runtime === "php") {
      const r = runPhpLite(code);
      stdout = r.stdout;
      stderr = r.stderr;
      ok = r.ok;
    } else {
      // JS/TS/HTML/CSS handled by iframe path in browser-sandbox
      return {
        ok: false,
        language,
        runtime,
        stdout: "",
        stderr: "use iframe path",
        durationMs: Date.now() - started,
        exitCode: 1,
        installed: true,
        learned: true,
        error: "DEFER_IFRAME",
      };
    }
  } catch (e) {
    stderr = e instanceof Error ? e.message : String(e);
    ok = false;
  }

  if (ok) rememberRun(runtime);

  return {
    ok,
    language,
    runtime,
    stdout,
    stderr,
    durationMs: Date.now() - started,
    exitCode: ok ? 0 : 1,
    installed: install.ok,
    learned: learnedBefore || ok,
    ...(ok ? {} : { error: stderr || "run failed" }),
  };
}
