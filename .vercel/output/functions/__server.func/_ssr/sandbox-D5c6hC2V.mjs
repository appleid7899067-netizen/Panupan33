import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { c as RotateCcw, d as Play, s as Send, v as LoaderCircle } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { g as Button } from "./router-B7-d8jQy.mjs";
import { t as AppShell } from "./app-shell-D56XWBrA.mjs";
import { a as viteStarterFallback, i as useFleet, n as buildPreviewDocument, o as webcontainerAvailable, r as runInBrowserSandbox, t as Textarea } from "./browser-sandbox-eTl1ZiV3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/sandbox-D5c6hC2V.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SAMPLE = `const root = document.createElement("div");
root.textContent = "Hello from Bossnu sandbox";
document.body.appendChild(root);
console.log("sandbox ok");`;
function SandboxWorkbench({ initialFiles, onErrorToBoss }) {
	const [code, setCode] = (0, import_react.useState)(SAMPLE);
	const [logs, setLogs] = (0, import_react.useState)([]);
	const [preview, setPreview] = (0, import_react.useState)(buildPreviewDocument(initialFiles?.length ? initialFiles : [viteStarterFallback()]));
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [lastError, setLastError] = (0, import_react.useState)(null);
	const newThread = useFleet((s) => s.newThread);
	const setActive = useFleet((s) => s.setActiveThread);
	const appendMessage = useFleet((s) => s.appendMessage);
	const isolated = (0, import_react.useMemo)(() => webcontainerAvailable(), []);
	async function run() {
		setBusy(true);
		setLastError(null);
		try {
			const result = await runInBrowserSandbox({
				language: "javascript",
				code
			});
			setLogs(result.logs);
			if (result.previewHtml) setPreview(result.previewHtml);
			if (!result.ok) setLastError(result.stderr || result.error || "Sandbox error");
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
			`Code:\n${code.slice(0, 8e3)}`
		].join("\n\n");
		onErrorToBoss?.(payload);
		const id = newThread();
		setActive(id);
		appendMessage(id, {
			role: "user",
			content: `ซ่อม sandbox นี้ให้:\n\n${payload}`
		});
		toast.success("ส่งรายงานเข้า Chat แล้ว");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-2 flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium",
						children: "Code"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-subtle",
						children: isolated ? "WebContainer available" : "Iframe sandbox"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					value: code,
					onChange: (e) => setCode(e.target.value),
					className: "min-h-56 font-mono text-xs"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: () => void run(),
							disabled: busy,
							children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" }), "Run"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							onClick: reset,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" }), "Reset"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: sendToBoss,
							disabled: !lastError && logs.every((l) => l.level !== "error"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-4" }), "ส่ง error ให้ Boss"]
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "grid gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "border-b border-border px-3 py-2 text-xs uppercase tracking-wider text-subtle",
					children: "Live preview"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
					title: "Sandbox preview",
					className: "h-64 w-full bg-bg",
					sandbox: "allow-scripts",
					srcDoc: preview
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs uppercase tracking-wider text-subtle",
						children: "Console"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "mt-2 max-h-40 overflow-auto font-mono text-xs text-muted",
						children: logs.length ? logs.map((l) => `[${l.level}] ${l.text}`).join("\n") : "No output yet."
					}),
					lastError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-danger",
						children: lastError
					}) : null
				]
			})]
		})]
	});
}
function SandboxPage() {
	const isolated = typeof window !== "undefined" && webcontainerAvailable();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-6xl px-5 py-10 sm:px-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-medium tracking-tight",
				children: "Sandbox"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-2xl text-sm leading-6 text-muted",
				children: "รันโปรเจกต์ในเบราว์เซอร์: preview, console, error, reset. ถ้า WebContainer ใช้ไม่ได้ในหน้านี้ จะใช้ iframe sandbox และ Vite starter fallback. Runtime error ส่งกลับเข้า Chat ให้ Boss ซ่อมได้"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-xs text-subtle",
				children: ["Runtime now: ", isolated ? "WebContainer (SharedArrayBuffer)" : "iframe sandbox (preview-safe)"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SandboxWorkbench, {})
			})
		]
	}) });
}
//#endregion
export { SandboxPage as component };
