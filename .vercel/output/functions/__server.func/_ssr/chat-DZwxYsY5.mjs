import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as record, i as object, o as string, r as number, t as array } from "../_libs/zod.mjs";
import { C as Check, E as Archive, S as ChevronDown, f as Pin, l as Plus, p as Paperclip, r as Trash2, s as Send, t as X, v as LoaderCircle, x as Copy, y as FileText } from "../_libs/lucide-react.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { a as SelectItemIndicator, c as SelectTrigger$1, i as SelectItem$1, l as SelectValue$1, n as SelectContent$1, o as SelectItemText, r as SelectIcon, s as SelectPortal, t as Select$1, u as SelectViewport } from "../_libs/@radix-ui/react-select+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as cn, d as chatWithPuter, f as ensurePuter, g as Button, h as requestPluginPermission, i as DEFAULT_PUTER_MODEL, l as SYSTEM_PROMPTS, p as extractText, u as usePuter } from "./router-B7-d8jQy.mjs";
import { t as AppShell } from "./app-shell-D56XWBrA.mjs";
import { c as hasOpenRouterKey, l as verifyOpenRouterKey, n as callOpenRouter, o as getActiveApiKey, r as chooseOpenRouterModel, s as getCachedOpenRouterModels, t as API_KEY_CHANGED_EVENT } from "./provider-keys-B_SoxQZP.mjs";
import { t as listLivePuterModels } from "./puter-models-Dp1fHGPS.mjs";
import { i as useFleet, r as runInBrowserSandbox, t as Textarea } from "./browser-sandbox-eTl1ZiV3.mjs";
import { t as executeGithubWithPat } from "./github-pat-B8vengCJ.mjs";
import { i as Viewport, n as Scrollbar, r as Thumb, t as Root } from "../_libs/radix-ui__react-scroll-area.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chat-DZwxYsY5.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function parseMarkdown(src) {
	const lines = src.replace(/\r\n/g, "\n").split("\n");
	const out = [];
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (line.startsWith("```")) {
			const lang = line.slice(3).trim();
			const buf = [];
			i += 1;
			while (i < lines.length && !lines[i].startsWith("```")) {
				buf.push(lines[i]);
				i += 1;
			}
			out.push({
				type: "code",
				lang,
				content: buf.join("\n")
			});
			i += 1;
			continue;
		}
		if (/^###\s/.test(line)) {
			out.push({
				type: "h",
				level: 3,
				content: line.replace(/^###\s+/, "")
			});
			i += 1;
			continue;
		}
		if (/^##\s/.test(line)) {
			out.push({
				type: "h",
				level: 2,
				content: line.replace(/^##\s+/, "")
			});
			i += 1;
			continue;
		}
		if (/^#\s/.test(line)) {
			out.push({
				type: "h",
				level: 1,
				content: line.replace(/^#\s+/, "")
			});
			i += 1;
			continue;
		}
		if (/^[-*]\s/.test(line)) {
			out.push({
				type: "li",
				content: line.replace(/^[-*]\s+/, "")
			});
			i += 1;
			continue;
		}
		if (/^\d+\.\s/.test(line)) {
			out.push({
				type: "li",
				ordered: true,
				content: line.replace(/^\d+\.\s+/, "")
			});
			i += 1;
			continue;
		}
		if (line.startsWith("> ")) {
			out.push({
				type: "quote",
				content: line.slice(2)
			});
			i += 1;
			continue;
		}
		if (line.trim() === "") {
			i += 1;
			continue;
		}
		out.push({
			type: "p",
			content: line
		});
		i += 1;
	}
	return out;
}
function Inline({ text }) {
	const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: parts.map((p, i) => {
		if (p.startsWith("`") && p.endsWith("`")) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
			className: "rounded-xs bg-elevated px-1 py-0.5 font-mono text-[0.85em] text-primary",
			children: p.slice(1, -1)
		}, i);
		if (p.startsWith("**") && p.endsWith("**")) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
			className: "font-medium text-fg",
			children: p.slice(2, -2)
		}, i);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p }, i);
	}) });
}
function CodeBlock({ lang, content }) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	const isMermaid = lang.toLowerCase() === "mermaid";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "group relative my-3 overflow-hidden rounded-lg bg-bg shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between border-b border-border px-3 py-1.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono text-[11px] uppercase tracking-wider text-subtle",
				children: lang || "code"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "icon-sm",
				"aria-label": "Copy code",
				onClick: async () => {
					await navigator.clipboard.writeText(content);
					setCopied(true);
					setTimeout(() => setCopied(false), 1200);
				},
				children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5 text-ok" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-3.5" })
			})]
		}), isMermaid ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MermaidBlock, { source: content }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "overflow-x-auto p-3 font-mono text-[13px] leading-relaxed text-fg",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: content })
		})]
	});
}
function MermaidBlock({ source }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2 p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "rounded-md bg-elevated p-4 font-mono text-[12px] leading-relaxed text-primary whitespace-pre-wrap",
			children: source
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] text-subtle",
			children: "Mermaid source — paste into any renderer, or keep it in the repo."
		})]
	});
}
function MarkdownOutput({ text, className }) {
	const blocks = (0, import_react.useMemo)(() => parseMarkdown(text), [text]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("text-sm leading-relaxed text-fg", className),
		children: blocks.map((b, i) => {
			if (b.type === "code") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlock, {
				lang: b.lang,
				content: b.content
			}, i);
			if (b.type === "h") {
				const cls = b.level === 1 ? "mt-5 mb-2 text-lg font-medium tracking-tight" : b.level === 2 ? "mt-4 mb-1.5 text-base font-medium tracking-tight" : "mt-3 mb-1 text-sm font-medium";
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cls,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inline, { text: b.content })
				}, i);
			}
			if (b.type === "li") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2 py-0.5 text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mt-2 size-1 shrink-0 rounded-full bg-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inline, { text: b.content }) })]
			}, i);
			if (b.type === "quote") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", {
				className: "my-2 border-l-2 border-primary/50 pl-3 text-muted",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inline, { text: b.content })
			}, i);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "my-1.5 text-muted",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inline, { text: b.content })
			}, i);
		})
	});
}
var badgeVariants = cva("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide", {
	variants: { variant: {
		default: "bg-elevated text-muted shadow-[var(--shadow-border)]",
		primary: "bg-primary/15 text-primary",
		ok: "bg-ok/15 text-ok",
		warn: "bg-warn/15 text-warn",
		danger: "bg-danger/15 text-danger",
		outline: "text-muted shadow-[var(--shadow-border)]"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
var Select = Select$1;
var SelectValue = SelectValue$1;
function SelectTrigger({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectTrigger$1, {
		className: cn("flex h-10 w-full items-center justify-between gap-2 rounded-md bg-elevated px-3 text-sm text-fg shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 data-[placeholder]:text-subtle [&>span]:line-clamp-1", className),
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectIcon, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-4 text-muted" })
		})]
	});
}
function SelectContent({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectPortal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent$1, {
		className: cn("z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-pop),var(--shadow-border)]", className),
		position: "popper",
		sideOffset: 6,
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectViewport, {
			className: "p-1.5",
			children
		})
	}) });
}
function SelectItem({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem$1, {
		className: cn("relative flex cursor-pointer items-center rounded-md py-2 pr-8 pl-2.5 text-sm outline-none data-[highlighted]:bg-elevated", className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemText, { children }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemIndicator, {
			className: "absolute right-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5 text-primary" })
		})]
	});
}
function ModelSource() {
	const { signedIn } = usePuter();
	const modelId = useFleet((s) => s.modelId);
	const gateway = useFleet((s) => s.modelGateway);
	const setModel = useFleet((s) => s.setModel);
	const setGateway = useFleet((s) => s.setModelGateway);
	const [puterModels, setPuterModels] = (0, import_react.useState)([]);
	const [openRouterModels, setOpenRouterModels] = (0, import_react.useState)(() => getCachedOpenRouterModels());
	const [puterError, setPuterError] = (0, import_react.useState)(null);
	const [openRouterOn, setOpenRouterOn] = (0, import_react.useState)(() => hasOpenRouterKey());
	(0, import_react.useEffect)(() => {
		const sync = () => {
			setOpenRouterOn(hasOpenRouterKey());
			setOpenRouterModels(getCachedOpenRouterModels());
		};
		window.addEventListener(API_KEY_CHANGED_EVENT, sync);
		return () => window.removeEventListener(API_KEY_CHANGED_EVENT, sync);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!signedIn) {
			setPuterModels([]);
			return;
		}
		let cancelled = false;
		listLivePuterModels().then((models) => {
			if (!cancelled) {
				setPuterModels(models);
				setPuterError(null);
			}
		}).catch((err) => {
			if (!cancelled) setPuterError(err instanceof Error ? err.message : "Could not list Puter models");
		});
		return () => {
			cancelled = true;
		};
	}, [signedIn]);
	const livePuter = puterModels.length > 0;
	const liveOpenRouter = openRouterOn && openRouterModels.length > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-w-0 flex-wrap items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
			value: gateway,
			onValueChange: (value) => setGateway(value),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
				className: "h-8 w-[9.5rem] text-xs",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
					value: "auto",
					children: "Auto"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
					value: "puter",
					disabled: !signedIn,
					children: ["Puter", signedIn ? "" : " (sign in)"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
					value: "openrouter",
					disabled: !openRouterOn,
					children: ["OpenRouter", openRouterOn ? "" : " (key)"]
				})
			] })]
		}), gateway === "openrouter" || gateway === "auto" && liveOpenRouter && !signedIn ? liveOpenRouter ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
			value: modelId,
			onValueChange: setModel,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
				className: "h-8 w-[min(100%,16rem)] text-xs",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "OpenRouter model" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: openRouterModels.slice(0, 80).map((model) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
				value: model.id,
				children: model.name || model.id
			}, model.id)) })]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			variant: "outline",
			children: "OpenRouter: ใส่ key ก่อน ยังไม่มีรายการโมเดล"
		}) : livePuter ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
			value: modelId,
			onValueChange: setModel,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
				className: "h-8 w-[min(100%,16rem)] text-xs",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Puter model" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: puterModels.slice(0, 80).map((model) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
				value: model.id,
				children: model.name || model.id
			}, model.id)) })]
		}) : signedIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			variant: "outline",
			children: puterError ? "Puter catalog unavailable" : `Puter default ${DEFAULT_PUTER_MODEL}`
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			variant: "outline",
			children: "ยังไม่มีโมเดลที่ยืนยันแล้ว"
		})]
	});
}
function ScrollArea({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Root, {
		className: cn("relative overflow-hidden", className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Viewport, {
			className: "h-full w-full rounded-[inherit]",
			children
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scrollbar, {
			orientation: "vertical",
			className: "flex w-2 touch-none select-none p-0.5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thumb, { className: "relative flex-1 rounded-full bg-border-strong" })
		})]
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var repoSchema = object({
	owner: string().min(1).max(100),
	repo: string().min(1).max(100)
});
var getGitHubStatus = createServerFn({ method: "GET" }).validator(repoSchema).handler(createSsrRpc("2c82b9bf12394412ff43f37546a559194ec55c113aa0ab390fe03645dcfef916"));
var readGitHubFile = createServerFn({ method: "GET" }).validator(repoSchema.extend({
	path: string().min(1).max(500),
	ref: string().max(200).optional()
})).handler(createSsrRpc("247823b5c7db37348543fbf884dc594d45d34921bf88f2d5f40927cbb11985a5"));
var writeGitHubFile = createServerFn({ method: "POST" }).validator(repoSchema.extend({
	path: string().min(1).max(500),
	content: string().max(2e6),
	message: string().min(1).max(200),
	sha: string().optional(),
	branch: string().max(200).optional()
})).handler(createSsrRpc("aaf0b547bde4945bc41f866d5556406ac1c0bef1bb4875936b075634f67bb984"));
var createGitHubBranch = createServerFn({ method: "POST" }).validator(repoSchema.extend({
	branch: string().min(1).max(200),
	from: string().max(200).optional()
})).handler(createSsrRpc("e45a4efa4b619b20bd1a96cd185ff10145cdc089a93139c2ce3238cb7a1a988f"));
var createGitHubPullRequest = createServerFn({ method: "POST" }).validator(repoSchema.extend({
	head: string().min(1).max(200),
	base: string().max(200).optional(),
	title: string().min(1).max(300),
	body: string().max(2e4).optional()
})).handler(createSsrRpc("5da0fca2997fcc2cf0a23e6e8402bfe329bb7f44492be167c09e537859adef4d"));
var createGitHubIssue = createServerFn({ method: "POST" }).validator(repoSchema.extend({
	title: string().min(1).max(300),
	body: string().max(2e4).optional()
})).handler(createSsrRpc("f186c39f90ba5685463b76680d863761b464984e9aebca773032a6907ba0c06b"));
var getGitHubActions = createServerFn({ method: "GET" }).validator(repoSchema.extend({ branch: string().max(200).optional() })).handler(createSsrRpc("1a18b9dd761398b2448b096f6651bc2920657c85774a82e7e7f36c660fb259cc"));
var dispatchGitHubWorkflow = createServerFn({ method: "POST" }).validator(repoSchema.extend({
	workflow: string().min(1).max(300),
	branch: string().max(200).optional(),
	inputs: record(string(), string()).optional()
})).handler(createSsrRpc("26a97161908fcd21bb9a57aefcf8fa5157b4e65a6136f24d5c718b07ba60bafa"));
var requestSchema = object({
	language: string().min(1).max(40),
	code: string().max(5e5),
	timeoutMs: number().int().min(100).max(12e4).optional()
});
async function runInSandbox(input) {
	const request = requestSchema.parse(input);
	const browser = await runInBrowserSandbox(request);
	return {
		ok: browser.ok,
		stdout: browser.stdout,
		stderr: browser.stderr,
		durationMs: browser.durationMs,
		runtime: browser.runtime,
		logs: browser.logs,
		previewHtml: browser.previewHtml,
		...typeof browser.exitCode === "number" ? { exitCode: browser.exitCode } : {},
		...browser.error ? { error: browser.error } : {}
	};
}
var executeAuthenticatedGitHubTool = createServerFn({ method: "POST" }).validator((value) => value).handler(createSsrRpc("29bf38188957d859b135e60d29408ba984e9f2d46a9a79c57284f62936f34bfe"));
var TOOLS_URL = "https://www.codingfleet.com/api/tools";
var PLUGINS_URL = "https://bosses690.vercel.app/plugins";
var GITHUB_API = "https://api.github.com";
var PUBLIC_MCP_SERVERS = ["https://api.keenable.ai/mcp"];
var TOOL_LIMIT = 20;
var MAX_TOOL_ROUNDS = 12;
var DEFAULT_MODELS = [
	"gpt-5-nano",
	"gpt-5.6-luna",
	"claude-sonnet-4-6"
];
var CODINGFLEET_BASE = "https://www.codingfleet.com/api";
var AUTH_GITHUB = [
	"github_write_file",
	"github_create_branch",
	"github_create_pull_request",
	"github_create_issue",
	"github_actions",
	"github_dispatch_workflow",
	"github_wait_for_workflow"
];
var cachedTools = null;
var cachedAt = 0;
var CACHE_TTL_MS = 3e5;
function normalizeTools(value) {
	const raw = Array.isArray(value) ? value : value && typeof value === "object" ? value.tools ?? value.data ?? [] : [];
	return Array.isArray(raw) ? raw.filter((tool) => !!tool && typeof tool === "object").slice(0, TOOL_LIMIT) : [];
}
function parseArguments(value) {
	if (value && typeof value === "object" && !Array.isArray(value)) return value;
	if (typeof value !== "string" || !value.trim()) return {};
	try {
		const parsed = JSON.parse(value);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}
function toolName(tool) {
	return String(tool.name ?? tool.slug ?? tool.id ?? "").trim();
}
function toolParameters(tool) {
	const value = tool.input_schema ?? tool.inputSchema ?? tool.parameters;
	return value && typeof value === "object" && !Array.isArray(value) ? value : {
		type: "object",
		properties: {}
	};
}
function normalizePluginEntries(value) {
	const raw = Array.isArray(value) ? value : value && typeof value === "object" ? value.plugins ?? value.data ?? [] : [];
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((entry) => {
		if (!entry || typeof entry !== "object") return [];
		const plugin = entry;
		const name = String(plugin.name ?? plugin.slug ?? plugin.id ?? "").trim();
		const endpoint = plugin.endpoint ?? plugin.api ?? plugin.invokeUrl ?? plugin.url;
		if (!name || typeof endpoint !== "string" || !endpoint.trim()) return [];
		return [{
			name: `plugin_${name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48)}`,
			description: String(plugin.description ?? `Plugin: ${name}`),
			inputSchema: plugin.input_schema ?? plugin.inputSchema ?? plugin.parameters ?? {
				type: "object",
				properties: {}
			},
			endpoint,
			method: plugin.method,
			pluginSource: PLUGINS_URL,
			pluginName: name
		}];
	});
}
async function loadPluginTools() {
	const response = await fetch(PLUGINS_URL, {
		method: "GET",
		headers: { Accept: "application/json" }
	});
	if (!response.ok) throw new Error(`Plugin catalog unavailable: HTTP ${response.status}`);
	return normalizePluginEntries(await response.json());
}
function nativeSandboxTools() {
	return [{
		name: "sandbox_run",
		description: "Run JavaScript/HTML/CSS in the in-browser sandbox and return stdout, stderr, logs, and runtime errors. Use this to reproduce errors and verify fixes.",
		inputSchema: {
			type: "object",
			properties: {
				language: {
					type: "string",
					minLength: 1,
					maxLength: 40
				},
				code: {
					type: "string",
					maxLength: 5e5
				},
				timeoutMs: {
					type: "integer",
					minimum: 100,
					maximum: 12e4
				}
			},
			required: ["language", "code"],
			additionalProperties: false
		}
	}];
}
function nativeWebTools() {
	return [{
		name: "web_check",
		description: "Check a deployed website URL over HTTPS. Return final URL, HTTP status, response time, and a short body preview.",
		inputSchema: {
			type: "object",
			properties: {
				url: {
					type: "string",
					minLength: 8,
					maxLength: 2048
				},
				timeoutMs: {
					type: "integer",
					minimum: 1e3,
					maximum: 3e4
				}
			},
			required: ["url"],
			additionalProperties: false
		}
	}];
}
async function executeWebCheck(args) {
	const rawUrl = String(args.url ?? "").trim();
	if (!/^https:\/\//i.test(rawUrl)) throw new Error("web_check only accepts HTTPS URLs.");
	let target;
	try {
		target = new URL(rawUrl);
	} catch {
		throw new Error("web_check received an invalid URL.");
	}
	if (target.username || target.password) throw new Error("web_check does not allow URL credentials.");
	const hostname = target.hostname.toLowerCase().replace(/\.$/, "");
	const blockedHostnames = /* @__PURE__ */ new Set([
		"localhost",
		"localhost.localdomain",
		"ip6-localhost",
		"metadata.google.internal"
	]);
	const isPrivateIpv4 = (host) => {
		const parts = host.split(".").map(Number);
		if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
		const [a, b] = parts;
		return a === 10 || a === 127 || a === 0 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168;
	};
	const isPrivateIpv6 = (host) => host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb");
	if (blockedHostnames.has(hostname) || hostname.endsWith(".local") || isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) throw new Error("web_check blocked a private, local, or metadata host.");
	const timeoutMs = Math.min(3e4, Math.max(1e3, Number(args.timeoutMs ?? 15e3)));
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const started = Date.now();
	try {
		const response = await fetch(target.toString(), {
			method: "GET",
			redirect: "follow",
			signal: controller.signal,
			headers: {
				Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.1",
				"User-Agent": "Bossnu-WebCheck/1.0"
			}
		});
		const text = await response.text();
		return {
			ok: response.ok,
			status: response.status,
			statusText: response.statusText,
			finalUrl: response.url,
			responseTimeMs: Date.now() - started,
			contentType: response.headers.get("content-type"),
			contentLength: response.headers.get("content-length"),
			bodyPreview: text.slice(0, 1200)
		};
	} catch (error) {
		return {
			ok: false,
			status: 0,
			responseTimeMs: Date.now() - started,
			error: error instanceof Error ? error.message : String(error)
		};
	} finally {
		clearTimeout(timer);
	}
}
function nativeAuthenticatedGitHubTools() {
	return [
		{
			name: "github_write_file",
			description: "Write/update a repository file. Creates a real Git commit.",
			inputSchema: {
				type: "object",
				properties: {
					owner: { type: "string" },
					repo: { type: "string" },
					path: { type: "string" },
					content: { type: "string" },
					message: { type: "string" },
					sha: { type: "string" },
					branch: { type: "string" }
				},
				required: [
					"owner",
					"repo",
					"path",
					"content",
					"message"
				],
				additionalProperties: false
			},
			githubSource: true
		},
		{
			name: "github_create_branch",
			description: "Create a Git branch.",
			inputSchema: {
				type: "object",
				properties: {
					owner: { type: "string" },
					repo: { type: "string" },
					branch: { type: "string" },
					from: { type: "string" }
				},
				required: [
					"owner",
					"repo",
					"branch"
				],
				additionalProperties: false
			},
			githubSource: true
		},
		{
			name: "github_create_pull_request",
			description: "Open a GitHub Pull Request.",
			inputSchema: {
				type: "object",
				properties: {
					owner: { type: "string" },
					repo: { type: "string" },
					head: { type: "string" },
					base: { type: "string" },
					title: { type: "string" },
					body: { type: "string" }
				},
				required: [
					"owner",
					"repo",
					"head",
					"title"
				],
				additionalProperties: false
			},
			githubSource: true
		},
		{
			name: "github_create_issue",
			description: "Create a GitHub issue.",
			inputSchema: {
				type: "object",
				properties: {
					owner: { type: "string" },
					repo: { type: "string" },
					title: { type: "string" },
					body: { type: "string" }
				},
				required: [
					"owner",
					"repo",
					"title"
				],
				additionalProperties: false
			},
			githubSource: true
		},
		{
			name: "github_actions",
			description: "Inspect recent GitHub Actions runs, including status, conclusion and commit SHA.",
			inputSchema: {
				type: "object",
				properties: {
					owner: { type: "string" },
					repo: { type: "string" },
					branch: { type: "string" }
				},
				required: ["owner", "repo"],
				additionalProperties: false
			},
			githubSource: true
		},
		{
			name: "github_dispatch_workflow",
			description: "Dispatch a GitHub Actions workflow.",
			inputSchema: {
				type: "object",
				properties: {
					owner: { type: "string" },
					repo: { type: "string" },
					workflow: { type: "string" },
					branch: { type: "string" }
				},
				required: [
					"owner",
					"repo",
					"workflow"
				],
				additionalProperties: false
			},
			githubSource: true
		},
		{
			name: "github_wait_for_workflow",
			description: "Wait for a GitHub Actions run and return verified completion.",
			inputSchema: {
				type: "object",
				properties: {
					owner: { type: "string" },
					repo: { type: "string" },
					runId: { type: "integer" },
					timeoutMs: { type: "integer" },
					pollMs: { type: "integer" }
				},
				required: [
					"owner",
					"repo",
					"runId"
				],
				additionalProperties: false
			},
			githubSource: true
		}
	];
}
function nativeGitSearchTools() {
	const search = (name, description) => ({
		name,
		description,
		inputSchema: {
			type: "object",
			properties: {
				q: {
					type: "string",
					minLength: 1,
					maxLength: 256
				},
				per_page: {
					type: "integer",
					minimum: 1,
					maximum: 20
				}
			},
			required: ["q"],
			additionalProperties: false
		},
		githubSource: true
	});
	return [
		search("github_search_repositories", "Search GitHub repositories."),
		search("github_search_code", "Search source code on GitHub."),
		search("github_search_commits", "Search commits."),
		search("github_search_issues", "Search issues."),
		search("github_search_prs", "Search Pull Requests. Use is:pr in the query.")
	];
}
function nativeGitHubTools() {
	return [
		{
			name: "github_get_repo",
			description: "Read public GitHub repository metadata.",
			inputSchema: {
				type: "object",
				properties: {
					owner: { type: "string" },
					repo: { type: "string" }
				},
				required: ["owner", "repo"],
				additionalProperties: false
			},
			githubSource: true
		},
		{
			name: "github_get_file",
			description: "Read a file from a public GitHub repository.",
			inputSchema: {
				type: "object",
				properties: {
					owner: { type: "string" },
					repo: { type: "string" },
					path: { type: "string" },
					ref: { type: "string" }
				},
				required: [
					"owner",
					"repo",
					"path"
				],
				additionalProperties: false
			},
			githubSource: true
		},
		{
			name: "github_list_commits",
			description: "Read recent commits from a public GitHub repository.",
			inputSchema: {
				type: "object",
				properties: {
					owner: { type: "string" },
					repo: { type: "string" },
					per_page: {
						type: "integer",
						minimum: 1,
						maximum: 20
					}
				},
				required: ["owner", "repo"],
				additionalProperties: false
			},
			githubSource: true
		}
	];
}
async function executeSandboxTool(args) {
	const language = String(args.language ?? "").trim();
	const code = String(args.code ?? "");
	if (!language || !code) throw new Error("sandbox_run requires language and code.");
	const timeoutMs = args.timeoutMs === void 0 ? void 0 : Number(args.timeoutMs);
	return runInSandbox({
		language,
		code,
		...timeoutMs === void 0 ? {} : { timeoutMs }
	});
}
async function executeGitHubTool(tool, args) {
	const owner = String(args.owner ?? "").trim();
	const repo = String(args.repo ?? "").trim();
	const name = toolName(tool);
	if (name.startsWith("github_search_")) {
		const kind = name.replace("github_search_", "");
		const endpoint = kind === "repositories" ? "/search/repositories" : kind === "code" ? "/search/code" : kind === "commits" ? "/search/commits" : "/search/issues";
		const query = String(args.q ?? "").trim();
		if (!query) throw new Error("GitHub search query is required.");
		const q = kind === "prs" && !/\bis:pr\b/i.test(query) ? `${query} is:pr` : query;
		const path = `${endpoint}?q=${encodeURIComponent(q)}&per_page=${Math.min(20, Math.max(1, Number(args.per_page ?? 10)))}`;
		const response = await fetch(`${GITHUB_API}${path}`, { headers: {
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28"
		} });
		const text = await response.text();
		if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}: ${text.slice(0, 240)}`);
		try {
			return JSON.parse(text);
		} catch {
			return text;
		}
	}
	if (!owner || !repo) throw new Error("GitHub requires owner and repo.");
	let path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
	if (name === "github_get_file") {
		const filePath = String(args.path ?? "").replace(/^\/+/, "");
		if (!filePath) throw new Error("GitHub file path is required.");
		path += `/contents/${filePath.split("/").map(encodeURIComponent).join("/")}`;
		if (args.ref) path += `?ref=${encodeURIComponent(String(args.ref))}`;
	} else if (name === "github_list_commits") path += `/commits?per_page=${Math.min(20, Math.max(1, Number(args.per_page ?? 10)))}`;
	const response = await fetch(`${GITHUB_API}${path}`, { headers: {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28"
	} });
	const text = await response.text();
	if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}: ${text.slice(0, 240)}`);
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}
async function loadPublicMcpTools() {
	const loaded = [];
	for (const server of PUBLIC_MCP_SERVERS) try {
		const init = await fetch(server, {
			method: "POST",
			headers: {
				Accept: "application/json, text/event-stream",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: {
					protocolVersion: "2025-06-18",
					capabilities: {},
					clientInfo: {
						name: "Bossnu-CodingFleet",
						version: "1.0.0"
					}
				}
			})
		});
		if (!init.ok) continue;
		const sessionId = init.headers.get("mcp-session-id");
		const list = await fetch(server, {
			method: "POST",
			headers: {
				Accept: "application/json, text/event-stream",
				"Content-Type": "application/json",
				...sessionId ? { "Mcp-Session-Id": sessionId } : {}
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 2,
				method: "tools/list",
				params: {}
			})
		});
		if (!list.ok) continue;
		const tools = (await readJsonRpcResponse(list)).result?.tools;
		if (!Array.isArray(tools)) continue;
		for (const raw of tools) {
			if (!raw || typeof raw !== "object") continue;
			const t = raw;
			const name = String(t.name ?? "").trim();
			if (!name) continue;
			loaded.push({
				name: `mcp_${name}`,
				description: String(t.description ?? `Public MCP tool: ${name}`),
				inputSchema: t.inputSchema ?? {
					type: "object",
					properties: {}
				},
				mcpServer: server,
				mcpToolName: name
			});
		}
	} catch {}
	return loaded;
}
async function readJsonRpcResponse(response) {
	const trimmed = (await response.text()).trim();
	if (!trimmed) return {};
	if (trimmed.startsWith("data:")) {
		const line = trimmed.split("\n").find((x) => x.startsWith("data:"));
		if (line) return JSON.parse(line.slice(5).trim());
	}
	return JSON.parse(trimmed);
}
async function callPublicMcpTool(tool, args) {
	const server = String(tool.mcpServer ?? "");
	const name = String(tool.mcpToolName ?? "");
	const init = await fetch(server, {
		method: "POST",
		headers: {
			Accept: "application/json, text/event-stream",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: "initialize",
			params: {
				protocolVersion: "2025-06-18",
				capabilities: {},
				clientInfo: {
					name: "Bossnu-CodingFleet",
					version: "1.0.0"
				}
			}
		})
	});
	if (!init.ok) throw new Error(`MCP initialize failed: HTTP ${init.status}`);
	const sid = init.headers.get("mcp-session-id");
	const response = await fetch(server, {
		method: "POST",
		headers: {
			Accept: "application/json, text/event-stream",
			"Content-Type": "application/json",
			...sid ? { "Mcp-Session-Id": sid } : {}
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 2,
			method: "tools/call",
			params: {
				name,
				arguments: args
			}
		})
	});
	if (!response.ok) throw new Error(`MCP tool ${name} failed: HTTP ${response.status}`);
	const payload = await readJsonRpcResponse(response);
	if (payload.error) throw new Error(JSON.stringify(payload.error));
	return payload.result ?? payload;
}
async function loadCodingFleetTools(forceRefresh = false) {
	if (!forceRefresh && cachedTools && Date.now() - cachedAt < CACHE_TTL_MS) return cachedTools;
	const sources = await Promise.allSettled([
		fetch(TOOLS_URL, { headers: { Accept: "application/json" } }).then(async (r) => {
			if (!r.ok) throw new Error(`CodingFleet tools returned HTTP ${r.status}.`);
			return normalizeTools(await r.json());
		}),
		loadPluginTools(),
		loadPublicMcpTools()
	]);
	const codingFleet = sources[0].status === "fulfilled" ? sources[0].value : [];
	const pluginTools = sources[1].status === "fulfilled" ? sources[1].value : [];
	const mcpTools = sources[2].status === "fulfilled" ? sources[2].value : [];
	const nativeTools = [
		...nativeSandboxTools(),
		...nativeWebTools(),
		...nativeAuthenticatedGitHubTools(),
		...nativeGitSearchTools(),
		...nativeGitHubTools()
	];
	const remoteTools = [
		...codingFleet,
		...pluginTools,
		...mcpTools
	];
	const tools = [...nativeTools, ...remoteTools].slice(0, TOOL_LIMIT);
	if (tools.length > 0) {
		cachedTools = tools;
		cachedAt = Date.now();
		return tools;
	}
	if (cachedTools) return cachedTools;
	throw new Error("No callable tools are available.");
}
function toPuterTools(tools) {
	return tools.slice(0, TOOL_LIMIT).map((tool) => {
		const name = toolName(tool);
		if (!name) return null;
		return {
			type: "function",
			function: {
				name,
				description: String(tool.description ?? `Tool: ${name}`),
				parameters: toolParameters(tool)
			}
		};
	}).filter((tool) => tool !== null);
}
function toolSummary(tools) {
	return tools.slice(0, TOOL_LIMIT).map((tool) => JSON.stringify({
		name: toolName(tool),
		description: tool.description,
		input_schema: toolParameters(tool)
	})).join("\n");
}
function extractToolCalls(value) {
	const response = value;
	const raw = (response?.message)?.tool_calls ?? response?.tool_calls ?? response?.toolCalls;
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((item) => {
		if (!item || typeof item !== "object") return [];
		const call = item;
		const fn = call.function;
		const name = String(fn?.name ?? call.name ?? "").trim();
		return name ? [{
			id: typeof call.id === "string" ? call.id : void 0,
			name,
			arguments: parseArguments(fn?.arguments ?? call.arguments ?? call.input)
		}] : [];
	});
}
function assistantToolMessage(response) {
	const message = response?.message;
	return message && typeof message === "object" ? message : null;
}
function resolveEndpoint(tool) {
	const candidate = tool.endpoint ?? tool.url;
	if (typeof candidate !== "string" || !candidate.trim()) return null;
	try {
		return new URL(candidate, `${CODINGFLEET_BASE}/`).toString();
	} catch {
		return null;
	}
}
async function executePluginTool(tool, args) {
	const endpoint = resolveEndpoint(tool);
	if (!endpoint) throw new Error(`Plugin ${toolName(tool)} has no callable endpoint.`);
	const method = String(tool.method ?? "POST").toUpperCase();
	const permission = await requestPluginPermission({
		pluginName: String(tool.pluginName ?? toolName(tool)),
		toolName: toolName(tool),
		endpoint,
		method,
		args
	});
	if (!permission.allowed) throw new Error(`Plugin blocked: ${permission.reason}`);
	const response = await fetch(endpoint, {
		method,
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		...method === "GET" || method === "HEAD" ? {} : { body: JSON.stringify({ arguments: args }) }
	});
	const text = await response.text();
	if (!response.ok) throw new Error(`Plugin ${String(tool.pluginName ?? toolName(tool))} returned HTTP ${response.status}: ${text.slice(0, 240)}`);
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}
async function executeAuthenticatedGithub(name, args) {
	try {
		return await executeAuthenticatedGitHubTool({ data: {
			toolName: name,
			args
		} });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (/Missing GITHUB_APP|environment variable|GitHub App/i.test(message)) return executeGithubWithPat(name, args);
		throw error;
	}
}
async function executeTool(tool, args) {
	const name = toolName(tool);
	if (name === "sandbox_run") return executeSandboxTool(args);
	if (name === "web_check") return executeWebCheck(args);
	if (tool.githubSource && AUTH_GITHUB.includes(name)) return executeAuthenticatedGithub(name, args);
	if (tool.githubSource) return executeGitHubTool(tool, args);
	if (tool.mcpServer) return callPublicMcpTool(tool, args);
	if (tool.pluginSource) return executePluginTool(tool, args);
	const endpoint = resolveEndpoint(tool);
	if (!endpoint) throw new Error(`Tool ${name} has no callable HTTPS endpoint.`);
	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			tool: tool.slug ?? name,
			arguments: args
		})
	});
	const text = await response.text();
	if (!response.ok) throw new Error(`Tool ${name} returned HTTP ${response.status}: ${text.slice(0, 240)}`);
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}
async function chatModel(messages, tools, model) {
	const puter = await ensurePuter();
	if (!puter.auth.isSignedIn()) await puter.auth.signIn();
	const response = await puter.ai.chat(messages, {
		model,
		tools: toPuterTools(tools),
		normalize: true,
		stream: false
	});
	return {
		text: extractText(response),
		response,
		toolCalls: extractToolCalls(response)
	};
}
function extractPublicHttpsUrl(value) {
	return (typeof value === "string" ? value : JSON.stringify(value ?? "")).match(/https:\/\/[^\s"'<>)\\]}>,]+/i)?.[0] ?? null;
}
async function callWithFallback(prompt, tools, models = DEFAULT_MODELS, onActivity) {
	let lastError = "No model succeeded.";
	for (const model of models) try {
		const availableTools = tools.slice(0, TOOL_LIMIT);
		const system = [
			"You are Bossnu SlieLo Agent. Use available tools when they materially improve the answer. Never claim an external action succeeded unless the tool returned success.",
			"Available tools:",
			toolSummary(availableTools)
		].join("\n");
		const toolResults = [];
		const messages = [{
			role: "system",
			content: system
		}, {
			role: "user",
			content: prompt
		}];
		for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
			const result = await chatModel(messages, availableTools, model);
			if (!result.toolCalls.length) return {
				ok: true,
				text: result.text,
				model,
				toolCalls: [],
				toolResults
			};
			const assistantMessage = assistantToolMessage(result.response);
			if (assistantMessage) messages.push(assistantMessage);
			for (const call of result.toolCalls) {
				const tool = availableTools.find((candidate) => toolName(candidate) === call.name);
				if (!tool) {
					const errorMessage = `Unknown tool: ${call.name}`;
					toolResults.push({
						name: call.name,
						ok: false,
						error: errorMessage
					});
					onActivity?.([`ใช้เครื่องมือ: ${call.name}`, `Tool error: ${errorMessage}`]);
					messages.push({
						role: "tool",
						tool_call_id: call.id,
						content: JSON.stringify({
							ok: false,
							error: errorMessage
						})
					});
					continue;
				}
				try {
					const output = await executeTool(tool, call.arguments);
					toolResults.push({
						name: call.name,
						ok: true,
						result: output
					});
					onActivity?.([`ใช้เครื่องมือ: ${call.name}`, `Observe: ${toolResults.filter((item) => item.ok).length}/${toolResults.length} ผ่าน`]);
					messages.push({
						role: "tool",
						tool_call_id: call.id,
						content: JSON.stringify({
							ok: true,
							result: output
						})
					});
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					toolResults.push({
						name: call.name,
						ok: false,
						error: errorMessage
					});
					onActivity?.([`ใช้เครื่องมือ: ${call.name}`, `Tool error: ${errorMessage.slice(0, 180)}`]);
					messages.push({
						role: "tool",
						tool_call_id: call.id,
						content: JSON.stringify({
							ok: false,
							error: errorMessage
						})
					});
				}
			}
			const shouldForceHealthCheck = /deploy|deployment|ดีพลอย|health|502|503|website|เว็บล่ม/i.test(prompt);
			const healthTool = availableTools.find((candidate) => toolName(candidate) === "web_check");
			const roundToolResults = toolResults.slice(-result.toolCalls.length);
			const roundHasHealthCheck = roundToolResults.some((item) => item.name === "web_check");
			if (shouldForceHealthCheck && healthTool && !roundHasHealthCheck) {
				const target = roundToolResults.filter((item) => item.ok).map((item) => extractPublicHttpsUrl(item.result)).find(Boolean) ?? extractPublicHttpsUrl(prompt);
				if (target) try {
					const output = await executeTool(healthTool, { url: target });
					toolResults.push({
						name: "web_check",
						ok: true,
						result: output
					});
					onActivity?.([`ตรวจสุขภาพเว็บ: ${target}`, `Observe: web_check ${String(output?.status ?? "")}`]);
					messages.push({
						role: "tool",
						tool_call_id: `forced-web-check-${round}`,
						content: JSON.stringify({
							ok: true,
							result: output
						})
					});
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					toolResults.push({
						name: "web_check",
						ok: false,
						error: errorMessage
					});
					onActivity?.([`ตรวจสุขภาพเว็บ: ${target}`, `web_check: ${errorMessage.slice(0, 180)}`]);
					messages.push({
						role: "tool",
						tool_call_id: `forced-web-check-${round}`,
						content: JSON.stringify({
							ok: false,
							error: errorMessage
						})
					});
				}
			}
		}
		return {
			ok: false,
			error: `Agent reached the ${MAX_TOOL_ROUNDS}-round tool limit without producing a final answer.`
		};
	} catch (error) {
		lastError = error instanceof Error ? error.message : String(error);
	}
	return {
		ok: false,
		error: lastError
	};
}
var serverSchema = object({
	name: string().min(1).max(100),
	url: string().url().refine((value) => value.startsWith("https://"), "MCP server must use HTTPS"),
	headers: record(string(), string()).optional()
});
function serversFromEnv() {
	const raw = process.env.BOSSNU_MCP_SERVERS;
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return array(serverSchema).parse(parsed);
	} catch {
		return [];
	}
}
function getMCPServers() {
	return serversFromEnv();
}
async function rpc(server, method, params = {}) {
	const response = await fetch(server.url, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...server.headers
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: crypto.randomUUID(),
			method,
			params
		})
	});
	const text = await response.text();
	if (!response.ok) throw new Error(`MCP ${server.name} returned HTTP ${response.status}: ${text.slice(0, 240)}`);
	const result = JSON.parse(text);
	if (result.error) throw new Error(`MCP ${server.name}: ${result.error.message ?? "request failed"}`);
	return result.result;
}
async function listMCPTools(server) {
	const tools = (await rpc(server, "tools/list"))?.tools;
	return Array.isArray(tools) ? tools.filter((tool) => !!tool && typeof tool === "object" && typeof tool.name === "string") : [];
}
async function discoverMCPTools() {
	const servers = getMCPServers();
	return await Promise.all(servers.map(async (server) => {
		try {
			return {
				server,
				tools: await listMCPTools(server)
			};
		} catch (error) {
			return {
				server,
				tools: [],
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}));
}
function summarizeToolNames(tools) {
	return tools.slice(0, 8).map((tool) => String(tool.name ?? tool.slug ?? tool.id ?? "")).filter(Boolean).join(", ");
}
function looksLikeMutation(prompt) {
	return /แก้|เขียน|สร้าง|ลบ|update|write|fix|repair|deploy|ดีพลอย|modify|change|commit/i.test(prompt);
}
function looksLikeVerification(prompt) {
	return /test|verify|ตรวจ|เช็ก|build|ci|ผ่าน|ทำงานไหม|ใช้งานได้/i.test(prompt);
}
function isVerificationToolCall(name) {
	return /(^|_)(test|verify|verification|build|ci|check|status|health|deploy|sandbox|web|http)(_|$)/i.test(name);
}
function diagnoseToolFailure(item) {
	const text = String(item.error ?? item.result ?? "").slice(0, 1200).toLowerCase();
	if (/502|bad gateway/.test(text)) return `Root cause hint: upstream/deployment gateway failure (HTTP 502) from ${item.name}.`;
	if (/503|service unavailable/.test(text)) return `Root cause hint: service unavailable or unhealthy deployment from ${item.name}.`;
	if (/timeout|timed out|etimedout|econnreset|socket hang up/.test(text)) return `Root cause hint: network/service timeout from ${item.name}.`;
	if (/401|unauthorized|authentication|token|api key/.test(text)) return `Root cause hint: authentication/credential failure from ${item.name}.`;
	if (/403|forbidden|permission|access denied/.test(text)) return `Root cause hint: permission/access failure from ${item.name}.`;
	if (/404|not found|module not found/.test(text)) return `Root cause hint: missing route/resource/module from ${item.name}.`;
	if (/eaddrinuse|address already in use|port/.test(text)) return `Root cause hint: port/process conflict from ${item.name}.`;
	if (/typescript|ts\\d+|type error/.test(text)) return `Root cause hint: TypeScript/type-check failure from ${item.name}.`;
	if (/eslint|lint/.test(text)) return `Root cause hint: lint/style-check failure from ${item.name}.`;
	if (/npm err|pnpm|yarn|package|dependency|cannot find module/.test(text)) return `Root cause hint: dependency/package resolution failure from ${item.name}.`;
	if (/referenceerror|typeerror|cannot read propert|undefined is not/.test(text)) return `Root cause hint: runtime JavaScript error from ${item.name}.`;
	if (/syntaxerror|parse error|unexpected token/.test(text)) return `Root cause hint: syntax/parse failure from ${item.name}.`;
	return `Root cause hint: inspect the concrete error from ${item.name}; do not guess.`;
}
function verificationPassed(results) {
	const checks = results.filter((item) => isVerificationToolCall(item.name));
	if (!checks.length) return {
		passed: false,
		evidence: "ยังไม่มีผลลัพธ์จาก verification tool"
	};
	for (const check of checks) {
		if (!check.ok) continue;
		const value = check.result;
		if (check.name === "web_check" && value && typeof value === "object") {
			const record = value;
			const status = Number(record.status ?? 0);
			if (record.ok === true && status >= 200 && status < 300) return {
				passed: true,
				evidence: `web_check ผ่าน HTTP ${status}`
			};
		}
		if (check.name === "sandbox_run" && value && typeof value === "object") {
			const record = value;
			if (record.ok === true && (record.exitCode === void 0 || record.exitCode === 0)) return {
				passed: true,
				evidence: "sandbox_run ผ่านและไม่มี exit error"
			};
		}
		if (/workflow|actions|ci|build|deploy|check|status/i.test(check.name) && value && typeof value === "object") {
			const record = value;
			if (record.verified === true || record.status === "completed" && record.conclusion === "success" || record.success === true) return {
				passed: true,
				evidence: `${check.name} รายงานผลสำเร็จจาก tool จริง`
			};
		}
		if (value && typeof value === "object") {
			const record = value;
			if (record.verified === true || record.success === true) return {
				passed: true,
				evidence: `${check.name} รายงานผล verified/success จาก tool จริง`
			};
		}
	}
	return {
		passed: false,
		evidence: "verification tool ทำงานแล้ว แต่ผลจริงยังไม่ผ่านเกณฑ์"
	};
}
/** Plan → Select → Act → Observe → Refine → Verify. */
async function runAgentLoop(prompt, tools, maxIterations = 6) {
	const steps = [{
		phase: "plan",
		detail: "วิเคราะห์เป้าหมายและแตกงานเป็นขั้นตอน"
	}, {
		phase: "select",
		detail: `เลือกเครื่องมือจาก Tool Registry: ${summarizeToolNames(tools) || "ไม่มีชื่อเครื่องมือ"}`
	}];
	let currentPrompt = `${prompt}

Agent protocol: Plan → Select → Act → Observe → Refine → Verify.
MCP tools discovered: ${(await discoverMCPTools()).reduce((sum, item) => sum + item.tools.length, 0)}.
Task mutation expected: ${looksLikeMutation(prompt)}.
Verification requested or required: ${looksLikeVerification(prompt)}. For deployed URLs, prefer web_check and treat HTTP 2xx as healthy; 5xx or timeout means verification failed and should trigger diagnosis/repair.
Use the selected tools. If a tool fails, diagnose from its actual output and repair instead of guessing.
For deployment or website health tasks, if a public HTTPS URL is available, MUST call web_check after the deploy/build step. If a target URL was detected, use this exact health target: ${prompt.match(/https:\/\/[^\s)\]}>,]+/i)?.[0] || "the public HTTPS URL returned by the deployment tool"}. Treat HTTP 2xx as healthy; HTTP 4xx/5xx, timeout, redirect failure, or tool error as a failed verification that must enter the repair loop.
Never claim an external action succeeded without evidence.`;
	let last = "";
	let hadToolActivity = false;
	let hadVerificationActivity = false;
	let verificationPassedEvidence = "";
	let failedToolStreak = 0;
	const repairedToolNames = /* @__PURE__ */ new Set();
	const toolFailureCounts = /* @__PURE__ */ new Map();
	const mutationExpected = looksLikeMutation(prompt);
	for (let iteration = 0; iteration < Math.max(1, Math.min(maxIterations, 8)); iteration += 1) {
		steps.push({
			phase: "act",
			detail: `รอบที่ ${iteration + 1}: ลงมือทำผ่านเครื่องมือ`
		});
		const result = await callWithFallback(currentPrompt, tools);
		if (!result.ok) {
			steps.push({
				phase: "observe",
				detail: `เครื่องมือ/โมเดลแจ้งข้อผิดพลาด: ${result.error.slice(0, 300)}`
			});
			return {
				ok: false,
				text: result.error,
				steps,
				verified: false
			};
		}
		last = result.text;
		hadToolActivity ||= result.toolCalls.length > 0;
		hadVerificationActivity ||= result.toolResults.some((item) => isVerificationToolCall(item.name));
		const verification = verificationPassed(result.toolResults);
		if (verification.passed) verificationPassedEvidence = verification.evidence;
		for (const toolResult of result.toolResults) {
			const detail = toolResult.ok ? `✓ ${toolResult.name}` : `✗ ${toolResult.name}: ${String(toolResult.error ?? "tool failed").slice(0, 180)}`;
			steps.push({
				phase: "observe",
				detail
			});
		}
		steps.push({
			phase: "observe",
			detail: `รอบที่ ${iteration + 1}: ได้ผลลัพธ์และ ${result.toolCalls.length} tool call`
		});
		if (!result.toolCalls.length) {
			if ((mutationExpected || hadVerificationActivity || looksLikeVerification(prompt)) && !verificationPassedEvidence) {
				steps.push({
					phase: "verify",
					detail: "ยังไม่มีหลักฐานจาก verification tool หลังมีการเปลี่ยนแปลง จึงบังคับให้ Agent ตรวจซ้ำ"
				});
				if (iteration === Math.min(maxIterations, 8) - 1) return {
					ok: false,
					text: last,
					steps,
					verified: false
				};
				steps.push({
					phase: "refine",
					detail: "ขอให้ Agent เรียกเครื่องมือตรวจสอบจริงก่อนประกาศสำเร็จ"
				});
				currentPrompt = `${prompt}

Verification gate: external mutation is expected. You MUST use an actual verification/status/test/build/CI/deploy tool and report its concrete result before finishing. Do not answer with a success claim without that evidence.`;
				continue;
			}
			steps.push({
				phase: "verify",
				detail: mutationExpected || hadVerificationActivity || looksLikeVerification(prompt) ? `Verification gate: ${verificationPassedEvidence || "ยังไม่มีหลักฐาน"}` : "ไม่มี external mutation ที่ต้องตรวจเพิ่ม"
			});
			const verificationRequired = mutationExpected || hadVerificationActivity || looksLikeVerification(prompt);
			return {
				ok: !verificationRequired || Boolean(verificationPassedEvidence),
				text: last,
				steps,
				verified: !verificationRequired || Boolean(verificationPassedEvidence)
			};
		}
		if (iteration === Math.min(maxIterations, 8) - 1) {
			steps.push({
				phase: "verify",
				detail: "หมดรอบซ่อมที่กำหนด จึงยังไม่ประกาศว่าสำเร็จ"
			});
			return {
				ok: false,
				text: last,
				steps,
				verified: false
			};
		}
		const failedResults = result.toolResults.filter((item) => !item.ok);
		const verificationResults = result.toolResults.filter((item) => isVerificationToolCall(item.name));
		const verificationFailed = verificationResults.length > 0 && !verification.passed;
		if (verificationResults.length) steps.push({
			phase: "observe",
			detail: `Verification observations: ${verificationResults.map((item) => `${item.name}=${item.ok ? "passed" : "failed"}`).join(", ")}`
		});
		if (verificationResults.some((item) => !item.ok)) steps.push({
			phase: "refine",
			detail: `Verification ไม่ผ่าน: ${verificationResults.filter((item) => !item.ok).map((item) => `${item.name}: ${String(item.error ?? "ไม่ผ่าน").slice(0, 180)}`).join(" | ")}`
		});
		const failedTools = failedResults.map((item) => `${item.name} (failures: ${toolFailureCounts.get(item.name) ?? 1}): ${String(item.error ?? "unknown error").slice(0, 800)}`);
		const diagnosisHints = failedResults.map(diagnoseToolFailure);
		const observedResults = result.toolResults.map((item) => {
			const payload = item.ok ? JSON.stringify(item.result ?? "").slice(0, 1600) : `ERROR: ${String(item.error ?? "tool failed").slice(0, 800)}`;
			return `${item.name}: ${payload}`;
		});
		const verificationIssue = verificationFailed ? `Verification evidence failed: ${verification.evidence}` : "";
		if (failedResults.length) {
			failedToolStreak += 1;
			for (const item of failedResults) {
				repairedToolNames.add(item.name);
				toolFailureCounts.set(item.name, (toolFailureCounts.get(item.name) ?? 0) + 1);
			}
		} else failedToolStreak = 0;
		if (failedTools.length) steps.push({
			phase: "refine",
			detail: `พบ Tool ล้มเหลว ${failedTools.length} รายการ: บังคับวิเคราะห์สาเหตุและซ่อมต่อ (streak ${failedToolStreak})`
		});
		else steps.push({
			phase: "refine",
			detail: "นำผลจริงกลับไปให้ Agent วิเคราะห์และแก้ต่อ"
		});
		const repeatedFailures = Array.from(toolFailureCounts.entries()).filter(([, count]) => count >= 2).map(([name, count]) => `${name} failed ${count} times`);
		const escalationInstruction = repeatedFailures.length ? `Repeated-tool escalation: ${repeatedFailures.join("; ")}. Do not blindly repeat the same failing tool. Prefer a different available tool, inspect the failure evidence more deeply, or change the repair strategy before retrying.` : "No repeated tool failures yet.";
		currentPrompt = `${prompt}

Repair context: ${repairedToolNames.size ? `เครื่องมือที่เคยพลาดและต้องติดตาม: ${Array.from(repairedToolNames).join(", ")}. เครื่องมือที่พลาดซ้ำ: ${repeatedFailures.length ? repeatedFailures.join(", ") : "ไม่มี"}` : "ยังไม่มี"}.

Previous agent output:
${last.slice(-12e3)}

Actual tool observations from this round:
${observedResults.length ? observedResults.join("\n") : "ไม่มี"}

Actual failed tools from this round:
${failedTools.length ? failedTools.join("\n") : "ไม่มี"}
     ${failedTools.length ? failedTools.join("\n") : "ไม่มี"}

Deterministic diagnosis hints:
${diagnosisHints.length ? diagnosisHints.join("\n") : "ไม่มี"}
${verificationIssue}
${escalationInstruction}

Continue from the actual observations above. For every failed tool, diagnose the concrete error, make the smallest safe repair when appropriate, then rerun the relevant tool. If verification fails, diagnose and repair the root cause. Do not stop merely because a file was changed. Do not claim success until verification evidence exists.`;
	}
	return {
		ok: false,
		text: last,
		steps,
		verified: false
	};
}
function sourceOf(tool) {
	if (tool.githubSource) return "github";
	if (tool.pluginSource) return "plugin";
	if (tool.mcpServer) return "mcp";
	if (String(tool.name ?? "").startsWith("mcp_")) return "mcp";
	if (String(tool.name ?? "").startsWith("plugin_")) return "plugin";
	if (tool.endpoint || tool.url) return "codingfleet";
	return "other";
}
function capabilityOf(tool) {
	const text = `${tool.name ?? ""} ${tool.description ?? ""}`.toLowerCase();
	if (/deploy|hosting|railway|vercel|netlify/.test(text)) return "deploy";
	if (/github|git|repo|commit|pull request|branch/.test(text)) return "code-repository";
	if (/test|verify|check|lint|build|ci|workflow|sandbox_run|sandbox|web_check|health|http|502|500|503|timeout/.test(text)) return "verify";
	if (/debug|error|log|diagnos/.test(text)) return "debug";
	if (/file|read|write|edit|code/.test(text)) return "code";
	if (/database|sql|query/.test(text)) return "data";
	return "general";
}
function score(tool, prompt) {
	const text = prompt.toLowerCase();
	let value = 0;
	const capability = tool.capability;
	if (capability === "code-repository" && /github|repo|repository|โค้ด|code|ไฟล์|แก้|bug|error|502|deploy|ดีพลอย/.test(text)) value += 8;
	if (capability === "debug" && /bug|error|502|500|503|ล่ม|แก้|debug|diagnos/.test(text)) value += 7;
	if (capability === "verify" && /test|verify|ตรวจ|เช็ก|build|ci|ผ่าน|sandbox|รัน|run|เว็บ|http|health|502|500|503|timeout|url/.test(text)) value += 6;
	if (capability === "deploy" && /deploy|ดีพลอย|vercel|netlify|railway/.test(text)) value += 7;
	if (capability === "code" && /code|โค้ด|แก้ไฟล์|ไฟล์/.test(text)) value += 5;
	if (tool.name === "sandbox_run" && /code|โค้ด|รัน|run|error|bug|debug|แก้|test|verify/.test(text)) value += 10;
	if (tool.name === "web_check" && /เว็บ|website|url|http|502|500|503|timeout|deploy|ดีพลอย|ตรวจ|เช็ก/.test(text)) value += 12;
	if (tool.source === "github" && /github|repo|repository/.test(text)) value += 5;
	return value;
}
async function buildToolRegistry(forceRefresh = false) {
	return (await loadCodingFleetTools(forceRefresh)).map((tool) => ({
		...tool,
		source: sourceOf(tool),
		capability: capabilityOf(tool)
	}));
}
async function selectToolsForTask(prompt, maxTools = 20) {
	const registry = await buildToolRegistry();
	const limit = Math.max(1, Math.min(maxTools, 20));
	const ranked = registry.map((tool, index) => ({
		tool,
		score: score(tool, prompt),
		index
	})).sort((a, b) => b.score - a.score || a.index - b.index);
	const text = prompt.toLowerCase();
	const needsCodeExecution = /code|โค้ด|รัน|run|test|verify|bug|error|debug|แก้/.test(text);
	const needsWebVerification = /เว็บ|website|url|http|502|500|503|timeout|deploy|ดีพลอย|ตรวจ|เช็ก/.test(text);
	const reservedNames = [...needsCodeExecution ? ["sandbox_run"] : [], ...needsWebVerification ? ["web_check"] : []];
	const selected = [];
	for (const name of reservedNames) {
		const match = ranked.find(({ tool }) => tool.name === name);
		if (match && selected.length < limit) selected.push(match.tool);
	}
	for (const { tool } of ranked) {
		if (selected.length >= limit) break;
		if (!selected.some((item) => item.name === tool.name)) selected.push(tool);
	}
	return selected;
}
var GITHUB_TOOLS = `
You have real GitHub tools. The bot can inspect a repository, read files, write/commit files, create branches, create pull requests, create issues, inspect GitHub Actions, dispatch a workflow, and wait for CI.
Never claim an action completed unless a GitHub tool result confirms it.
Never claim CI passed unless github_actions / github_wait_for_workflow returned status=completed and conclusion=success.
`;
function buildUserMessage(data, githubContext) {
	const parts = [GITHUB_TOOLS.trim()];
	if (data.language) parts.push(`Language: ${data.language}`);
	if (data.extras) parts.push(data.extras);
	if (githubContext) parts.push(`GitHub tool result:\n${githubContext}`);
	if (data.prompt) parts.push(data.prompt);
	if (data.code?.trim()) parts.push(["Code:", data.code].join("\n"));
	return parts.filter(Boolean).join("\n\n");
}
function splitBody(text) {
	const separator = text.indexOf("\n---\n");
	if (separator < 0) return {
		first: text.trim(),
		body: ""
	};
	return {
		first: text.slice(0, separator).trim(),
		body: text.slice(separator + 5).trim()
	};
}
async function runGitHubCommand(prompt) {
	const status = prompt.match(/^github:\s*status\s+([^\s]+)\s*$/i);
	if (status) {
		const [owner, repo] = status[1].split("/");
		if (!owner || !repo) throw new Error("Use: github: status owner/repo");
		return JSON.stringify(await getGitHubStatus({ data: {
			owner,
			repo
		} }), null, 2);
	}
	const read = prompt.match(/^github:\s*read\s+([^\s]+)(?:\s+([^\s]+))?\s*$/i);
	if (read) {
		const parts = read[1].split("/");
		const owner = parts.shift();
		const repo = parts.shift();
		const path = parts.join("/");
		if (!owner || !repo || !path) throw new Error("Use: github: read owner/repo/path/to/file [ref]");
		const file = await readGitHubFile({ data: {
			owner,
			repo,
			path,
			...read[2] ? { ref: read[2] } : {}
		} });
		return JSON.stringify({
			action: "read",
			repository: `${owner}/${repo}`,
			path: file.path,
			sha: file.sha,
			content: file.content
		}, null, 2);
	}
	const write = prompt.match(/^github:\s*write\s+([^\s]+)\s+([\s\S]+)$/i);
	if (write) {
		const parts = write[1].split("/");
		const owner = parts.shift();
		const repo = parts.shift();
		const path = parts.join("/");
		if (!owner || !repo || !path) throw new Error("Use: github: write owner/repo/path/to/file <message>\n---\n<content>");
		const { first: message, body: content } = splitBody(write[2]);
		if (!content) throw new Error("GitHub write needs complete file content after ---");
		const current = await readGitHubFile({ data: {
			owner,
			repo,
			path
		} }).catch(() => null);
		const result = await writeGitHubFile({ data: {
			owner,
			repo,
			path,
			content,
			message: message || "Update from Bossnu SlieLo",
			...current?.sha ? { sha: current.sha } : {}
		} });
		return JSON.stringify({
			action: "write",
			repository: `${owner}/${repo}`,
			path,
			result
		}, null, 2);
	}
	const branch = prompt.match(/^github:\s*branch\s+([^\s]+)\s+([^\s]+)(?:\s+([^\s]+))?\s*$/i);
	if (branch) {
		const [owner, repo] = branch[1].split("/");
		if (!owner || !repo) throw new Error("Use: github: branch owner/repo new-branch [from-branch]");
		return JSON.stringify(await createGitHubBranch({ data: {
			owner,
			repo,
			branch: branch[2],
			...branch[3] ? { from: branch[3] } : {}
		} }), null, 2);
	}
	const pr = prompt.match(/^github:\s*pr\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([\s\S]+)$/i);
	if (pr) {
		const [owner, repo] = pr[1].split("/");
		if (!owner || !repo) throw new Error("Use: github: pr owner/repo head-branch base-branch <title>\n<body>");
		const { first: title, body } = splitBody(pr[4]);
		return JSON.stringify(await createGitHubPullRequest({ data: {
			owner,
			repo,
			head: pr[2],
			base: pr[3],
			title,
			...body ? { body } : {}
		} }), null, 2);
	}
	const issue = prompt.match(/^github:\s*issue\s+([^\s]+)\s+([\s\S]+)$/i);
	if (issue) {
		const [owner, repo] = issue[1].split("/");
		if (!owner || !repo) throw new Error("Use: github: issue owner/repo <title>\n<body>");
		const { first: title, body } = splitBody(issue[2]);
		return JSON.stringify(await createGitHubIssue({ data: {
			owner,
			repo,
			title,
			...body ? { body } : {}
		} }), null, 2);
	}
	const actions = prompt.match(/^github:\s*actions\s+([^\s]+)(?:\s+([^\s]+))?\s*$/i);
	if (actions) {
		const [owner, repo] = actions[1].split("/");
		if (!owner || !repo) throw new Error("Use: github: actions owner/repo [branch]");
		return JSON.stringify(await getGitHubActions({ data: {
			owner,
			repo,
			...actions[2] ? { branch: actions[2] } : {}
		} }), null, 2);
	}
	const workflow = prompt.match(/^github:\s*workflow\s+([^\s]+)\s+([^\s]+)(?:\s+([^\s]+))?\s*$/i);
	if (workflow) {
		const [owner, repo] = workflow[1].split("/");
		if (!owner || !repo) throw new Error("Use: github: workflow owner/repo workflow-file-or-id [branch]");
		return JSON.stringify(await dispatchGitHubWorkflow({ data: {
			owner,
			repo,
			workflow: workflow[2],
			...workflow[3] ? { branch: workflow[3] } : {}
		} }), null, 2);
	}
}
function wantsAgentLoop(prompt) {
	return /แก้|ซ่อม|debug|fix|repair|deploy|ดีพลอย|ci|github|sandbox|ตรวจ|verify|build|error|502|503|401|403|typescript|runtime/i.test(prompt);
}
async function runOpenRouterTurn(data, userMessage, onDelta, onActivity) {
	const key = getActiveApiKey();
	if (!key) return {
		ok: false,
		error: "ยังไม่มี OpenRouter API key (sk-or-...)"
	};
	onActivity?.(["ตรวจ OpenRouter API key"]);
	let models = getCachedOpenRouterModels();
	if (!models.length) {
		const verified = await verifyOpenRouterKey(key);
		if (!verified.ok) return {
			ok: false,
			error: verified.error
		};
		models = verified.models;
	}
	onActivity?.(["ตรวจ OpenRouter API key", "อ่าน OpenRouter model catalog"]);
	const requested = (data.modelId || "").replace(/^openrouter:/i, "").trim();
	const selected = requested ? models.find((m) => m.id === requested) ?? models.find((m) => m.id.split("/").pop() === requested) : chooseOpenRouterModel(models, data.prompt);
	if (!selected) return {
		ok: false,
		error: "OpenRouter key ใช้งานได้ แต่ยังไม่มีโมเดลข้อความที่บัญชีนี้เรียกได้ — ยังไม่เปิดตัวเลือกหลอก"
	};
	const result = await callOpenRouter({
		messages: [
			{
				role: "system",
				content: SYSTEM_PROMPTS.chat
			},
			...(data.history ?? []).slice(-8),
			{
				role: "user",
				content: userMessage
			}
		],
		model: selected.id,
		onDelta
	});
	if (!result.ok) return result;
	const activity = [
		"ตรวจ OpenRouter API key",
		"อ่าน OpenRouter model catalog",
		`Gateway: OpenRouter (ไม่ใช่ Puter)`,
		`OpenRouter model: ${selected.id}`,
		"ส่งผลลัพธ์"
	];
	onActivity?.(activity);
	return {
		ok: true,
		text: result.text,
		model: `openrouter:${selected.id}`,
		activity
	};
}
async function runFleet(data, onDelta, onActivity) {
	const systemPrompt = SYSTEM_PROMPTS[data.mode] ?? SYSTEM_PROMPTS.chat;
	const userMessage = buildUserMessage(data, await runGitHubCommand(data.prompt).catch((error) => `GitHub tool error: ${error instanceof Error ? error.message : String(error)}`));
	const selectedModelId = (data.modelId || "").trim();
	const explicitPuter = /^puter:/i.test(selectedModelId) || data.gateway === "puter";
	const explicitOpenRouter = /^openrouter:/i.test(selectedModelId) || data.gateway === "openrouter";
	const key = getActiveApiKey();
	if (explicitOpenRouter || data.gateway !== "puter" && key && !explicitPuter && data.gateway === "openrouter") return runOpenRouterTurn(data, userMessage, onDelta, onActivity);
	if (!explicitPuter && key && data.gateway === "openrouter") return runOpenRouterTurn(data, userMessage, onDelta, onActivity);
	if (!explicitPuter && key && data.gateway === "auto" && !wantsAgentLoop(data.prompt)) return runOpenRouterTurn(data, userMessage, onDelta, onActivity);
	if (wantsAgentLoop(data.prompt)) try {
		onActivity?.([
			"วิเคราะห์",
			"เลือกเครื่องมือ",
			"ลงมือทำ"
		]);
		const tools = await selectToolsForTask(data.prompt);
		const loop = await runAgentLoop(`${systemPrompt}\n\n${userMessage}`, tools);
		onDelta?.(loop.text);
		const activity = loop.steps.map((step) => `${step.phase}: ${step.detail}`);
		onActivity?.(activity);
		if (!loop.ok || loop.verified === false) return {
			ok: false,
			error: loop.text || "ยังไม่มีหลักฐานจากเครื่องมือว่างานสำเร็จ",
			activity
		};
		return {
			ok: true,
			text: loop.text,
			model: selectedModelId || "gpt-5-nano",
			activity
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		onActivity?.(["Agent loop error", message.slice(0, 180)]);
	}
	try {
		const tools = await selectToolsForTask(data.prompt);
		if (tools.length) {
			const history = (data.history ?? []).slice(-8).map((turn) => `${turn.role}: ${turn.content}`).join("\n");
			const fleet = await callWithFallback([
				`System instructions:\n${systemPrompt}`,
				history ? `Conversation history:\n${history}` : "",
				`Current user request:\n${userMessage}`
			].filter(Boolean).join("\n\n"), tools, [selectedModelId.replace(/^puter:/i, "") || "gpt-5-nano", DEFAULT_PUTER_MODEL], onActivity);
			if (fleet.ok) {
				onDelta?.(fleet.text);
				const toolNames = fleet.toolCalls.map((call) => call.name).filter(Boolean).slice(0, 8);
				const activity = [
					"วิเคราะห์",
					"Tool Registry",
					...toolNames.length ? [`ใช้เครื่องมือ: ${toolNames.join(", ")}`] : ["ประมวลผล"],
					...fleet.toolResults.length ? [`Observe: ${fleet.toolResults.filter((item) => item.ok).length}/${fleet.toolResults.length} ผ่าน`] : [],
					"ส่งผลลัพธ์"
				];
				onActivity?.(activity);
				return {
					ok: true,
					text: fleet.text,
					model: fleet.model,
					activity
				};
			}
		}
	} catch {}
	return chatWithPuter({
		messages: [
			{
				role: "system",
				content: systemPrompt
			},
			...(data.history ?? []).slice(-8),
			{
				role: "user",
				content: userMessage
			}
		],
		model: selectedModelId.replace(/^puter:/i, "") || "gpt-5-nano",
		onDelta
	});
}
var TEXT_EXT = /\.(md|txt|json|js|jsx|ts|tsx|css|html|xml|yml|yaml|csv|py|go|rs|java|sql|env|vue|svelte|mjs|cjs)$/i;
var MAX_FILES = 8;
var MAX_FILE_BYTES = 4194304;
var MAX_ZIP_CHARS = 6e4;
var MAX_ZIP_ENTRIES = 50;
function clampAttachments(files) {
	return files.filter((file) => file.size <= MAX_FILE_BYTES).slice(0, MAX_FILES);
}
function attachmentLimitMessage(file) {
	if (file.size > MAX_FILE_BYTES) return `${file.name} is larger than 4 MB and was skipped.`;
	return null;
}
async function extractZip(file) {
	const buffer = await file.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	const view = new DataView(buffer);
	const decoder = new TextDecoder();
	const files = [];
	let totalChars = 0;
	for (let i = 0; i + 46 <= bytes.length && files.length < MAX_ZIP_ENTRIES; i += 1) {
		if (view.getUint32(i, true) !== 33639248) continue;
		const method = view.getUint16(i + 10, true);
		const compressedSize = view.getUint32(i + 20, true);
		const nameLen = view.getUint16(i + 28, true);
		const extraLen = view.getUint16(i + 30, true);
		const commentLen = view.getUint16(i + 32, true);
		const localOffset = view.getUint32(i + 42, true);
		const name = decoder.decode(bytes.slice(i + 46, i + 46 + nameLen));
		i += 45 + nameLen + extraLen + commentLen;
		if (!name || name.endsWith("/") || /(^|\/)(node_modules|\.git|dist|build)(\/|$)/i.test(name)) continue;
		if (!TEXT_EXT.test(name)) continue;
		if (compressedSize > 2e6 || localOffset + 30 > bytes.length) continue;
		const localNameLen = view.getUint16(localOffset + 26, true);
		const localExtraLen = view.getUint16(localOffset + 28, true);
		const dataStart = localOffset + 30 + localNameLen + localExtraLen;
		const compressed = bytes.slice(dataStart, dataStart + compressedSize);
		let content = "";
		try {
			if (method === 0) content = decoder.decode(compressed);
			else if (method === 8 && "DecompressionStream" in globalThis) {
				const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
				content = decoder.decode(await new Response(stream).arrayBuffer());
			}
		} catch {
			content = "";
		}
		if (!content) continue;
		const remaining = MAX_ZIP_CHARS - totalChars;
		if (remaining <= 0) break;
		const clipped = content.slice(0, remaining);
		files.push(`\n### ${name}\n${clipped}`);
		totalChars += clipped.length;
	}
	if (files.length) return `ZIP extracted text files (${files.length}):${files.join("")}${totalChars >= MAX_ZIP_CHARS ? "\n[ZIP content truncated at 60,000 characters]" : ""}`;
	return "ZIP attached, but no readable text/code entries could be extracted in this browser.";
}
async function describeAttachment(file) {
	if (file.name.toLowerCase().endsWith(".zip")) return extractZip(file);
	if (file.type.startsWith("text/") || TEXT_EXT.test(file.name)) {
		const text = await file.text();
		return `File content: ${text.slice(0, MAX_ZIP_CHARS)}${text.length > MAX_ZIP_CHARS ? "\n[truncated]" : ""}`;
	}
	if (file.type.startsWith("image/")) return `Image attachment: ${file.name} (${file.type}, ${file.size} bytes)`;
	return `Binary attachment: ${file.name} (${file.type || "unknown"})`;
}
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
	const [openRouterConnected, setOpenRouterConnected] = (0, import_react.useState)(() => Boolean(getActiveApiKey()));
	(0, import_react.useEffect)(() => {
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
	const [draft, setDraft] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [attachments, setAttachments] = (0, import_react.useState)([]);
	const [previews, setPreviews] = (0, import_react.useState)([]);
	const fileInputRef = (0, import_react.useRef)(null);
	const scroller = (0, import_react.useRef)(null);
	const sorted = (0, import_react.useMemo)(() => [...threads].sort((a, b) => {
		if (a.pinned && !b.pinned) return -1;
		if (!a.pinned && b.pinned) return 1;
		return b.updatedAt - a.updatedAt;
	}), [threads]);
	function addFiles(files) {
		files.map(attachmentLimitMessage).filter(Boolean).forEach((msg) => toast.error(msg));
		const next = clampAttachments([...attachments, ...files]);
		setAttachments(next);
		setPreviews(next.map((file) => ({
			file,
			url: file.type.startsWith("image/") ? URL.createObjectURL(file) : void 0
		})));
	}
	function removeAttachment(index) {
		setPreviews((current) => {
			const item = current[index];
			if (item?.url) URL.revokeObjectURL(item.url);
			return current.filter((_, i) => i !== index);
		});
		setAttachments((current) => current.filter((_, i) => i !== index));
	}
	async function send() {
		if (!thread || !draft.trim() && attachments.length === 0 || busy) return;
		if (!canChat) {
			toast.error("Sign in with Puter หรือใส่ OpenRouter key (sk-or-...) ก่อนส่ง");
			return;
		}
		const attachmentDetails = attachments.length ? await Promise.all(attachments.map(async (f) => `- ${f.name} (${f.type || "unknown"}, ${Math.ceil(f.size / 1024)} KB)\n  ${await describeAttachment(f)}`)) : [];
		const attachmentContext = attachmentDetails.length ? `\n\nAttached files:\n${attachmentDetails.join("\n")}` : "";
		const text = (draft.trim() || "Analyze the attached files") + attachmentContext;
		const attachedMeta = attachments.map((file) => ({
			name: file.name,
			size: file.size,
			type: file.type
		}));
		setDraft("");
		setAttachments([]);
		setPreviews([]);
		appendMessage(thread.id, {
			role: "user",
			content: text,
			attachments: attachedMeta
		});
		setBusy(true);
		const assistantId = appendMessage(thread.id, {
			role: "assistant",
			content: "",
			model: modelId,
			activity: ["วิเคราะห์คำขอ"]
		});
		try {
			const history = thread.messages.filter((m) => m.content.trim()).slice(-8).map((m) => ({
				role: m.role,
				content: m.content
			}));
			const extras = memory.length ? `Memory: ${memory.map((m) => m.text).join("; ")}` : "";
			const res = await runFleet({
				mode: "chat",
				prompt: text,
				modelId,
				extras,
				history,
				gateway
			}, (full) => patchMessage(thread.id, assistantId, full), (activity) => patchActivity(thread.id, assistantId, activity));
			if (!res.ok) {
				if (res.activity) patchActivity(thread.id, assistantId, res.activity);
				toast.error(res.error);
				patchMessage(thread.id, assistantId, `ยังไม่ถือว่าสำเร็จ\n\n${res.error}`);
				learnMemory(`Task: ${text.replace(/Attached files:[\s\S]*/i, "").trim().slice(0, 700)} | Result: failed | Reason: ${res.error.slice(0, 500)}`);
				return;
			}
			if (res.activity) patchActivity(thread.id, assistantId, res.activity);
			patchMessage(thread.id, assistantId, res.text);
			learnMemory(`Task: ${text.replace(/Attached files:[\s\S]*/i, "").trim().slice(0, 700)} | Result: ${res.text.replace(/\s+/g, " ").slice(0, 600)} | Trace: ${(res.activity ?? []).slice(-6).join(" → ")}`);
		} catch (err) {
			const errorText = err instanceof Error ? err.message : "Chat failed";
			toast.error(errorText);
			patchMessage(thread.id, assistantId, errorText);
			learnMemory(`Task: ${text.replace(/Attached files:[\s\S]*/i, "").trim().slice(0, 700)} | Result: failed | Reason: ${errorText.slice(0, 500)}`);
		} finally {
			setBusy(false);
			requestAnimationFrame(() => {
				scroller.current?.scrollTo({
					top: scroller.current.scrollHeight,
					behavior: "smooth"
				});
			});
		}
	}
	if (!thread) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-[calc(100dvh-12rem)] w-full",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "hidden w-64 shrink-0 flex-col border-r border-border md:flex",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-wider text-subtle",
					children: "Chats"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon-sm",
					variant: "ghost",
					"aria-label": "New chat",
					onClick: () => newThread(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollArea, {
				className: "flex-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-0.5 px-2 pb-4",
					children: sorted.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `group flex items-center gap-1 rounded-md px-2 py-2 text-left text-sm ${t.id === thread.id ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/60 hover:text-fg"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "min-h-11 min-w-0 flex-1 truncate text-left",
								onClick: () => setActiveThread(t.id),
								children: [t.pinned ? "· " : "", t.title]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "hidden size-7 items-center justify-center rounded-sm group-hover:flex hover:bg-bg",
								onClick: () => pinThread(t.id),
								"aria-label": "Pin",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, { className: "size-3.5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "hidden size-7 items-center justify-center rounded-sm text-subtle group-hover:flex hover:text-danger",
								onClick: () => deleteThread(t.id),
								"aria-label": "Delete",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" })
							})
						]
					}, t.id))
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-w-0 flex-1 flex-col",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2 border-b border-border px-3 py-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelSource, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ml-2 flex items-center gap-1.5 text-xs text-subtle",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `size-1.5 rounded-full ${canChat ? "bg-ok" : "bg-muted"}` }), busy ? "Boss กำลังทำงาน" : canChat ? "พร้อมใช้งาน" : "รอ Puter หรือ OpenRouter key"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ml-auto flex items-center gap-1 md:hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon-sm",
								variant: "ghost",
								onClick: () => newThread(),
								"aria-label": "New chat",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: scroller,
					className: "flex-1 overflow-y-auto px-4 py-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-auto max-w-2xl space-y-5",
						children: [thread.messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: m.role === "user" ? "ml-8" : "mr-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mb-1 text-xs uppercase tracking-wider text-subtle",
									children: m.role === "user" ? "คุณ" : "Boss"
								}),
								m.attachments && m.attachments.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mb-2 flex flex-wrap gap-2",
									children: m.attachments.map((file) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: file.name }, `${m.id}-${file.name}`))
								}) : null,
								m.role === "assistant" && m.activity && m.activity.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mb-2 text-xs text-subtle",
									children: m.activity.slice(-1)[0]
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: m.role === "user" ? "rounded-lg bg-elevated px-3 py-2 text-sm shadow-[var(--shadow-border)]" : "",
									children: m.role === "assistant" ? m.content ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarkdownOutput, { text: m.content }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm text-muted",
										children: "กำลังวิเคราะห์…"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "whitespace-pre-wrap",
										children: m.content
									})
								})
							]
						}, m.id)), busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 text-sm text-muted",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin text-primary" }), "Boss กำลังทำงาน — เลือกเครื่องมือและตรวจผลให้เอง"]
						}) : null]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "border-t border-border px-3 py-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-auto max-w-2xl",
						children: [
							previews.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4",
								children: previews.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative overflow-hidden rounded-lg bg-elevated p-2 shadow-[var(--shadow-border)]",
									children: [item.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: item.url,
										alt: item.file.name,
										className: "h-24 w-full rounded object-cover"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex h-24 flex-col items-center justify-center gap-1 text-muted",
										children: [item.file.name.toLowerCase().endsWith(".zip") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, { className: "size-7" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "size-7" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "max-w-full truncate text-xs",
											children: item.file.name
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => removeAttachment(index),
										className: "absolute right-1 top-1 rounded-full bg-bg/90 p-1",
										"aria-label": `Remove ${item.file.name}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-3" })
									})]
								}, `${item.file.name}-${index}`))
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-end gap-2 rounded-lg bg-elevated p-2 shadow-[var(--shadow-border)]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										ref: fileInputRef,
										type: "file",
										multiple: true,
										accept: "image/*,.zip,.pdf,.txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.go,.rs,.java,.css,.html",
										className: "hidden",
										onChange: (e) => {
											if (e.target.files) addFiles(Array.from(e.target.files));
											e.currentTarget.value = "";
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "icon",
										variant: "ghost",
										onClick: () => fileInputRef.current?.click(),
										"aria-label": "Attach files",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Paperclip, { className: "size-4" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
										value: draft,
										onChange: (e) => setDraft(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter" && !e.shiftKey) {
												e.preventDefault();
												send();
											}
										},
										placeholder: canChat ? "คุยกับ Boss… Shift+Enter ขึ้นบรรทัดใหม่" : "Sign in with Puter หรือใส่ OpenRouter key",
										className: "min-h-12 border-0 bg-transparent shadow-none focus-visible:shadow-none",
										rows: 2
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "icon",
										onClick: () => void send(),
										disabled: busy || !draft.trim() && attachments.length === 0,
										"aria-label": "Send",
										children: busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-4" })
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-center text-[11px] text-subtle",
								children: "Boss เลือกเครื่องมือและตรวจผลให้เอง · ไม่มีปุ่ม Skill"
							})
						]
					})
				})
			]
		})]
	}) });
}
//#endregion
export { ChatPage as component };
