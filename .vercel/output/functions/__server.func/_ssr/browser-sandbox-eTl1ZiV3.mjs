import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { _ as cn, i as DEFAULT_PUTER_MODEL, v as uid } from "./router-B7-d8jQy.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/browser-sandbox-eTl1ZiV3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var seedThread = () => ({
	id: "welcome",
	title: "Welcome",
	createdAt: Date.now(),
	updatedAt: Date.now(),
	messages: [{
		id: "w1",
		role: "assistant",
		createdAt: Date.now(),
		content: "Boss พร้อมแล้ว คุยอย่างเดียว — ไม่ต้องกด Skill\n\nไม่มีอะไรที่ทำไม่ได้ · ไม่มีสิ่งใดที่แก้ไม่ได้\n\nSign in with Puter เพื่อใช้โมเดลฟรี หรือใส่ OpenRouter key (sk-or-...) เพื่อเรียกโมเดลจาก OpenRouter โดยตรง\n\nลอง:\n- แก้บั๊กจากไฟล์ที่แนบ\n- ตรวจ repo / CI\n- รันโค้ดใน Sandbox แล้วส่ง error กลับมาซ่อม"
	}]
});
var useFleet = create()(persist((set, get) => ({
	modelId: DEFAULT_PUTER_MODEL,
	modelGateway: "auto",
	threads: [seedThread()],
	activeThreadId: "welcome",
	memory: [],
	setModel: (id) => set({ modelId: id }),
	setModelGateway: (modelGateway) => set({ modelGateway }),
	newThread: () => {
		const id = uid("chat");
		set({
			threads: [{
				id,
				title: "New chat",
				createdAt: Date.now(),
				updatedAt: Date.now(),
				messages: []
			}, ...get().threads],
			activeThreadId: id
		});
		return id;
	},
	setActiveThread: (id) => set({ activeThreadId: id }),
	pinThread: (id) => set({ threads: get().threads.map((t) => t.id === id ? {
		...t,
		pinned: !t.pinned
	} : t) }),
	deleteThread: (id) => {
		const next = get().threads.filter((t) => t.id !== id);
		set({
			threads: next.length ? next : [seedThread()],
			activeThreadId: get().activeThreadId === id ? next[0]?.id ?? "welcome" : get().activeThreadId
		});
	},
	appendMessage: (threadId, msg) => {
		const id = msg.id ?? uid("m");
		set({ threads: get().threads.map((t) => {
			if (t.id !== threadId) return t;
			const message = {
				id,
				createdAt: Date.now(),
				role: msg.role,
				content: msg.content,
				model: msg.model,
				activity: msg.activity,
				attachments: msg.attachments,
				verified: msg.verified
			};
			const title = t.title === "New chat" && msg.role === "user" ? msg.content.slice(0, 42) || t.title : t.title;
			return {
				...t,
				title,
				updatedAt: Date.now(),
				messages: [...t.messages, message]
			};
		}) });
		return id;
	},
	patchMessage: (threadId, messageId, content) => set({ threads: get().threads.map((t) => {
		if (t.id !== threadId) return t;
		return {
			...t,
			updatedAt: Date.now(),
			messages: t.messages.map((m) => m.id === messageId ? {
				...m,
				content
			} : m)
		};
	}) }),
	patchActivity: (threadId, messageId, activity) => set({ threads: get().threads.map((t) => t.id !== threadId ? t : {
		...t,
		updatedAt: Date.now(),
		messages: t.messages.map((m) => m.id === messageId ? {
			...m,
			activity
		} : m)
	}) }),
	patchVerified: (threadId, messageId, verified) => set({ threads: get().threads.map((t) => t.id !== threadId ? t : {
		...t,
		messages: t.messages.map((m) => m.id === messageId ? {
			...m,
			verified
		} : m)
	}) }),
	learnMemory: (text) => {
		const normalized = text.trim();
		if (!normalized) return;
		const current = get().memory;
		if (current.some((item) => item.text === normalized)) return;
		set({ memory: [{
			id: uid("mem"),
			text: normalized,
			createdAt: Date.now()
		}, ...current].slice(0, 48) });
	},
	removeMemory: (id) => set({ memory: get().memory.filter((m) => m.id !== id) })
}), { name: "bossnu-slielo-store" }));
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-28 w-full rounded-md bg-elevated px-3 py-2.5 text-sm text-fg shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 placeholder:text-subtle focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50", className),
		ref,
		...props
	});
});
Textarea.displayName = "Textarea";
var VITE_FALLBACK = {
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
</html>`
};
function viteStarterFallback() {
	return VITE_FALLBACK;
}
function wrapRunnable(language, code) {
	const lang = language.toLowerCase();
	if (lang === "html" || lang === "htm") return code;
	if (lang === "css") return `<!doctype html><html><head><style>${code}</style></head><body><div class="preview">CSS loaded</div></body></html>`;
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
    <\/script>
  </body>
</html>`;
}
function webcontainerAvailable() {
	return typeof window !== "undefined" && typeof SharedArrayBuffer === "function" && typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
}
async function runInBrowserSandbox(input) {
	const started = Date.now();
	const timeoutMs = Math.min(Math.max(input.timeoutMs ?? 12e3, 500), 3e4);
	const language = input.language.trim() || "javascript";
	const runnable = /^(js|javascript|ts|typescript|html|htm|css)$/i.test(language);
	if (typeof window === "undefined") return {
		ok: false,
		runtime: "unavailable",
		stdout: "",
		stderr: "Sandbox runs in the browser only.",
		logs: [],
		durationMs: 0,
		error: "Sandbox runs in the browser only."
	};
	if (!runnable) return {
		ok: false,
		runtime: "unavailable",
		stdout: "",
		stderr: `${language} is not executable in the in-browser sandbox. Use JavaScript, TypeScript-as-JS, HTML, or CSS — or attach a Vite project for preview.`,
		logs: [],
		durationMs: Date.now() - started,
		error: `Unsupported sandbox language: ${language}`
	};
	const html = wrapRunnable(language === "typescript" || language === "ts" ? "javascript" : language, input.code);
	const logs = [];
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
		const finish = (ok, extra) => {
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
				...ok ? {} : { error: stderr || extra || "Sandbox run failed." }
			});
		};
		const onMessage = (event) => {
			const data = event.data;
			if (!data || data.source !== "bossnu-sandbox") return;
			if (data.type === "log" || data.type === "warn" || data.type === "error") {
				logs.push({
					level: data.type,
					text: String(data.payload ?? "")
				});
				if (data.type === "error") stderr += `${String(data.payload ?? "")}\n`;
			}
			if (data.type === "runtime-error") {
				stderr += `${String(data.payload ?? "")}\n`;
				logs.push({
					level: "error",
					text: String(data.payload ?? "")
				});
			}
			if (data.type === "done") {
				const payload = data.payload;
				finish(Boolean(payload?.ok) && !stderr.trim());
			}
		};
		window.addEventListener("message", onMessage);
		iframe.src = url;
		document.body.appendChild(iframe);
		window.setTimeout(() => finish(!stderr.trim(), stderr.trim() ? void 0 : "Sandbox timed out."), timeoutMs);
	});
}
function buildPreviewDocument(files) {
	const html = files.find((f) => /index\.html$/i.test(f.path)) ?? files.find((f) => /\.html$/i.test(f.path));
	if (html) return html.contents;
	const js = files.find((f) => /\.(js|mjs)$/i.test(f.path));
	const css = files.filter((f) => /\.css$/i.test(f.path)).map((f) => f.contents).join("\n");
	if (js) return wrapRunnable("javascript", js.contents);
	if (css) return wrapRunnable("css", css);
	return viteStarterFallback().contents;
}
//#endregion
export { viteStarterFallback as a, useFleet as i, buildPreviewDocument as n, webcontainerAvailable as o, runInBrowserSandbox as r, Textarea as t };
