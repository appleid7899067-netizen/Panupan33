import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as createRootRoute, g as createFileRoute, h as lazyRouteComponent, l as Scripts, m as Outlet, p as createRouter, u as HeadContent, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as Slot, s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { i as object, n as literal, o as string, r as number, s as union } from "../_libs/zod.mjs";
import { b as Cpu, n as TriangleAlert, o as Server, t as X, u as PlugZap, w as Bot } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { a as DialogOverlay, i as DialogDescription$1, n as DialogClose, o as DialogPortal, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { t as Provider } from "../_libs/radix-ui__react-tooltip.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-B7-d8jQy.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";
function errorMessage(error) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return FALLBACK_MESSAGE;
}
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-red-500",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400",
				children: errorMessage(error)
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
var CONNECTOR_TOKEN_READY_EVENT = "grok:connector-token-ready";
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
var ConnectorTokenReadySchema = EnvelopeSchema.extend({ type: literal("connector-token-ready") });
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Origin of the Grok embedder framing this page, or null when the page runs
* top-level (download/export, local `npm run dev`, deployed sites) or under a
* non-Grok parent. Client-only; null during SSR.
*/
function resolveCurrentEmbedderOrigin() {
	if (typeof window === "undefined") return null;
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	return resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	const parentOrigin = resolveCurrentEmbedderOrigin();
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onHello = (data) => {
		if (!HelloSchema.safeParse(data).success) return;
		announce();
	};
	const onNavigate = (data) => {
		const parsed = NavigateSchema.safeParse(data);
		if (!parsed.success) return;
		navigate(parsed.data.path);
		queueMicrotask(reportLocation);
	};
	const onHistory = (data) => {
		const parsed = HistorySchema.safeParse(data);
		if (!parsed.success) return;
		if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
		window.history.go(parsed.data.delta);
	};
	const onConnectorTokenReady = (data) => {
		if (!ConnectorTokenReadySchema.safeParse(data).success) return;
		window.dispatchEvent(new Event(CONNECTOR_TOKEN_READY_EVENT));
	};
	const hostMessageHandlers = /* @__PURE__ */ new Map([
		["hello", onHello],
		["navigate", onNavigate],
		["history", onHistory],
		["connector-token-ready", onConnectorTokenReady]
	]);
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		hostMessageHandlers.get(envelope.data.type)?.(event.data);
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function uid(prefix = "id") {
	return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[opacity,transform,background-color,box-shadow,color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-fg shadow-[var(--shadow-border)] hover:opacity-92 active:scale-[0.98]",
			secondary: "bg-elevated text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
			outline: "bg-transparent text-fg shadow-[var(--shadow-border)] hover:bg-elevated",
			ghost: "bg-transparent text-muted hover:text-fg hover:bg-elevated",
			danger: "bg-danger text-bg hover:opacity-92",
			link: "text-primary underline-offset-4 hover:underline"
		},
		size: {
			default: "h-10 px-4",
			sm: "h-8 rounded-sm px-3 text-xs",
			lg: "h-12 rounded-lg px-5",
			icon: "size-10",
			"icon-sm": "size-8 rounded-sm"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
var Dialog = Dialog$1;
function DialogContent({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-50 bg-bg/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
		className: cn("fixed top-1/2 left-1/2 z-50 w-[min(32rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-5 shadow-[var(--shadow-pop),var(--shadow-border)]", className),
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
			className: "absolute top-3 right-3 rounded-sm p-1 text-muted hover:text-fg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: "Close"
			})]
		})]
	})] });
}
function DialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("mb-4 space-y-1", className),
		...props
	});
}
function DialogTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
		className: cn("text-base font-medium tracking-tight", className),
		...props
	});
}
function DialogDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
		className: cn("text-sm text-muted", className),
		...props
	});
}
/** System policy is Always Ask. There is no silent allow. */
var PLUGIN_PERMISSION_MODE = "always-ask";
var PLUGIN_DECISION_EVENT = "bosses:plugin-permission";
var askHandler = null;
function setPluginPermissionAskHandler(handler) {
	askHandler = handler;
}
function isHttpsEndpoint(url) {
	try {
		return new URL(url).protocol === "https:";
	} catch {
		return false;
	}
}
async function requestPluginPermission(request) {
	if (!isHttpsEndpoint(request.endpoint)) return {
		allowed: false,
		reason: "Plugin endpoints must use HTTPS."
	};
	if (typeof window === "undefined") return {
		allowed: false,
		reason: "Plugin actions require an in-app permission gate."
	};
	if (!askHandler) return {
		allowed: false,
		reason: "Plugin permission gate is not mounted. Always Ask blocked this call."
	};
	const allowed = await askHandler(request);
	try {
		window.dispatchEvent(new CustomEvent(PLUGIN_DECISION_EVENT, { detail: {
			...request,
			allowed
		} }));
	} catch {}
	return allowed ? {
		allowed: true,
		reason: "User approved this plugin action."
	} : {
		allowed: false,
		reason: "User denied this plugin action (Always Ask)."
	};
}
function PluginPermissionGate() {
	const [pending, setPending] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		setPluginPermissionAskHandler((request) => new Promise((resolve) => {
			setPending({
				request,
				resolve
			});
		}));
		return () => setPluginPermissionAskHandler(null);
	}, []);
	function decide(allowed) {
		pending?.resolve(allowed);
		setPending(null);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open: Boolean(pending),
		onOpenChange: (open) => {
			if (!open) decide(false);
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Plugin ขออนุญาต" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "นโยบายระบบคือ Always Ask — Boss จะไม่เรียกปลั๊กอินจนกว่าคุณจะอนุมัติครั้งนี้" })] }), pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-3 text-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted",
						children: "Plugin"
					}),
					" ",
					pending.request.pluginName
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted",
						children: "Tool"
					}),
					" ",
					pending.request.toolName
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "break-all",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted",
							children: pending.request.method
						}),
						" ",
						pending.request.endpoint
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "max-h-40 overflow-auto rounded-md bg-elevated p-3 font-mono text-xs text-muted",
					children: JSON.stringify(pending.request.args, null, 2)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-end gap-2 pt-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						onClick: () => decide(false),
						children: "ปฏิเสธ"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => decide(true),
						children: "อนุญาตครั้งนี้"
					})]
				})
			]
		}) : null] })
	});
}
var TooltipProvider = Provider;
var SCRIPT_SRC = "https://js.puter.com/v2/";
var CREDENTIAL_POLICY = `
Credential policy for Bossnu SlieLo — universal credential handling:
- Treat every credential as sensitive, regardless of provider or format: API keys, access tokens, OAuth tokens, JWTs, passwords, client secrets, private keys/PEM, SSH keys, database URLs with passwords, webhook secrets, signing secrets, cookies, session tokens, service-account JSON, and cloud credentials.
- First determine the task/service that needs the credential. Do not make the customer repeat the whole task just because a credential is missing.
- If a connected tool can perform the task without customer credentials, use that connected tool immediately.
- If the required credential is missing, say exactly: which service needs access, what operation is blocked, and the exact environment-variable/secret name or connection field needed. Ask only for the minimum missing credential.
- Prefer a secure provider/hosting Secrets or connection UI. Never ask a customer to paste a private key, PEM, password, token, cookie, or service-account JSON into ordinary chat.
- If a customer accidentally sends a secret in chat, do not quote, repeat, summarize, log, or place it into code, GitHub, prompts, model context, browser storage, localStorage, or analytics. Treat it as compromised, recommend rotation, and continue with a secure connection path.
- Never invent credentials and never claim a credential was installed, connected, tested, or used unless a real tool result confirms it.
- Public IDs, repository names, project IDs, account IDs, and service IDs are not secrets and may be requested normally.
- Credential names must be task-specific when possible (for example OPENAI_API_KEY, DATABASE_URL, VERCEL_TOKEN, RENDER_API_KEY, GITHUB_APP_PRIVATE_KEY). Do not require a customer to know the variable name if the bot can identify it from the service/task.
- If the customer says they cannot configure secrets themselves, give the shortest secure setup path for the current provider/hosting and keep the task context intact; do not ask them to expose the secret in chat.
- A credential request must never be tied to a vague 'which job?' question. Preserve the current task and name the exact blocked step.
- Never expose or return the value of any credential, even after a successful connection. Confirm only the service, scope, and connection state.
`;
function isBrowser() {
	return typeof window !== "undefined";
}
function getPuter() {
	return isBrowser() ? window.puter ?? null : null;
}
function loadPuter() {
	if (!isBrowser()) return Promise.reject(/* @__PURE__ */ new Error("Puter runs in the browser only."));
	if (window.puter) return Promise.resolve(window.puter);
	const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
	if (existing) return new Promise((resolve, reject) => {
		const start = Date.now();
		const tick = () => {
			if (window.puter) return resolve(window.puter);
			if (Date.now() - start > 12e3) return reject(/* @__PURE__ */ new Error("Puter.js loaded but did not initialize."));
			requestAnimationFrame(tick);
		};
		existing.addEventListener("error", () => reject(/* @__PURE__ */ new Error("Failed to load Puter.js.")));
		tick();
	});
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = SCRIPT_SRC;
		script.async = true;
		script.onload = () => {
			const start = Date.now();
			const tick = () => {
				if (window.puter) return resolve(window.puter);
				if (Date.now() - start > 8e3) return reject(/* @__PURE__ */ new Error("Puter.js loaded but did not initialize."));
				requestAnimationFrame(tick);
			};
			tick();
		};
		script.onerror = () => reject(/* @__PURE__ */ new Error("Failed to load Puter.js."));
		document.head.appendChild(script);
	});
}
async function ensurePuter() {
	return getPuter() ?? loadPuter();
}
function extractText(value) {
	if (value == null) return "";
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
	if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join("");
	if (typeof value === "object") {
		const rec = value;
		if (typeof rec.text === "string") return rec.text;
		if (typeof rec.content === "string") return rec.content;
		if (Array.isArray(rec.content)) return extractText(rec.content);
		if (rec.message) return extractText(rec.message);
		if (Array.isArray(rec.choices)) {
			const first = rec.choices[0];
			if (first?.message) return extractText(first.message);
			if (typeof first?.text === "string") return first.text;
		}
	}
	return "";
}
function withCredentialPolicy(messages) {
	const index = messages.findIndex((m) => m.role === "system");
	if (index < 0) return [{
		role: "system",
		content: CREDENTIAL_POLICY.trim()
	}, ...messages];
	return messages.map((m, i) => i === index && !m.content.includes("Credential policy for Bossnu SlieLo — universal credential handling:") ? {
		...m,
		content: `${m.content}\n\n${CREDENTIAL_POLICY.trim()}`
	} : m);
}
function friendlyError(err) {
	const raw = err instanceof Error ? err.message : String(err ?? "Unknown error");
	const lower = raw.toLowerCase();
	if (lower.includes("popup") || lower.includes("blocked")) return "Popup blocked. Allow popups for this site, then sign in with Puter.";
	if (lower.includes("auth_window_closed") || lower.includes("closed")) return "Sign-in window closed. Try again — Puter is required for free models.";
	if (lower.includes("not signed") || lower.includes("unauthorized") || lower.includes("auth")) return "Sign in with Puter to use free models.";
	return raw.slice(0, 240);
}
var signInInFlight = null;
async function signInWithPuter(forceReauth = false) {
	if (signInInFlight) return signInInFlight;
	signInInFlight = (async () => {
		const puter = await ensurePuter();
		if (puter.auth.isSignedIn() && !forceReauth) try {
			const user = await puter.auth.getUser();
			if (user.requires_phone_verification) return null;
			return user;
		} catch {
			return null;
		}
		await puter.auth.signIn(forceReauth ? { request_auth: true } : void 0);
		if (!puter.auth.isSignedIn()) return null;
		try {
			const user = await puter.auth.getUser();
			if (user.requires_phone_verification) return null;
			return user;
		} catch {
			return null;
		}
	})();
	try {
		return await signInInFlight;
	} finally {
		signInInFlight = null;
	}
}
async function signOutPuter() {
	await (await ensurePuter()).auth.signOut();
}
async function currentPuterUser() {
	try {
		const puter = await ensurePuter();
		if (!puter.auth.isSignedIn()) return null;
		const user = await puter.auth.getUser();
		if (user.requires_phone_verification) return null;
		return user;
	} catch {
		return null;
	}
}
async function chatWithPuter(opts) {
	let puter;
	try {
		puter = await ensurePuter();
	} catch (err) {
		return {
			ok: false,
			error: friendlyError(err)
		};
	}
	if (!puter.auth.isSignedIn()) return {
		ok: false,
		error: "Puter ยังไม่ได้เข้าสู่ระบบ กรุณากด Sign in with Puter ก่อน แล้วจึงลองส่งอีกครั้ง"
	};
	try {
		if ((await puter.auth.getUser()).requires_phone_verification) return {
			ok: false,
			error: "Puter บัญชีนี้ยังมีสถานะต้องยืนยันเบอร์โทร แม้เพิ่งยืนยันแล้ว ให้กด Sign in with Puter อีกครั้งเพื่อรีเฟรชเซสชัน"
		};
	} catch {
		return {
			ok: false,
			error: "Puter session ยังไม่พร้อม กรุณากด Sign in with Puter อีกครั้ง"
		};
	}
	const payload = withCredentialPolicy(opts.messages).map((m) => ({
		role: m.role,
		content: m.content
	}));
	const run = async (stream) => {
		const resp = await puter.ai.chat(payload, {
			model: opts.model,
			stream
		});
		if (stream && resp && typeof resp === "object" && Symbol.asyncIterator in resp) {
			let full = "";
			for await (const part of resp) {
				const piece = typeof part === "string" ? part : extractText(part);
				if (!piece) continue;
				full += piece;
				opts.onDelta?.(full);
			}
			return full;
		}
		const text = extractText(resp);
		if (text) opts.onDelta?.(text);
		return text;
	};
	try {
		const text = await run(true);
		if (!text.trim()) return {
			ok: false,
			error: "Empty response from the model."
		};
		return {
			ok: true,
			text,
			model: opts.model
		};
	} catch (err) {
		try {
			const text = await run(false);
			if (!text.trim()) return {
				ok: false,
				error: friendlyError(err)
			};
			return {
				ok: true,
				text,
				model: opts.model
			};
		} catch (err2) {
			return {
				ok: false,
				error: friendlyError(err2)
			};
		}
	}
}
var PuterContext = (0, import_react.createContext)(null);
function PuterProvider({ children }) {
	const [ready, setReady] = (0, import_react.useState)(false);
	const [signedIn, setSignedIn] = (0, import_react.useState)(false);
	const [user, setUser] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const refresh = (0, import_react.useCallback)(async () => {
		try {
			await ensurePuter();
			const current = await currentPuterUser();
			setSignedIn(Boolean(current));
			setUser(current);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Puter failed to load.");
			setSignedIn(false);
			setUser(null);
		} finally {
			setReady(true);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		refresh();
	}, [refresh]);
	const signIn = (0, import_react.useCallback)(async () => {
		setError(null);
		try {
			const next = await signInWithPuter(true);
			setSignedIn(Boolean(next));
			setUser(next);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Sign-in failed.";
			setError(msg);
			throw err;
		}
	}, []);
	const signOut = (0, import_react.useCallback)(async () => {
		try {
			await signOutPuter();
		} finally {
			setSignedIn(false);
			setUser(null);
		}
	}, []);
	const value = (0, import_react.useMemo)(() => ({
		ready,
		signedIn,
		user,
		error,
		signIn,
		signOut,
		refresh
	}), [
		ready,
		signedIn,
		user,
		error,
		signIn,
		signOut,
		refresh
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PuterContext.Provider, {
		value,
		children
	});
}
function usePuter() {
	const ctx = (0, import_react.useContext)(PuterContext);
	if (!ctx) throw new Error("usePuter must be used within PuterProvider");
	return ctx;
}
var styles_default = "/assets/styles-BLwQjTxZ.css";
var APP_NAME = "Bossnu SlieLo";
var MOTTO_TH = "ไม่มีอะไรที่ทำไม่ได้ · ไม่มีสิ่งใดที่แก้ไม่ได้";
var MOTTO_EN = "Nothing is impossible. Nothing can't be fixed.";
var FOOTER_LINE = "© 2026 Bossnu SlieLo · พัฒนาโดย ภาณุพัน และ สลี่.ออลา · Models run through Puter. Threads stay in this browser.";
var PUTER_DOCS = "https://developer.puter.com";
/** Puter's documented default when no model is specified. */
var DEFAULT_PUTER_MODEL = "gpt-5-nano";
var APP_NAV = [
	{
		to: "/chat",
		label: "Chat",
		icon: Bot
	},
	{
		to: "/sandbox",
		label: "Sandbox",
		icon: Server
	},
	{
		to: "/plugins",
		label: "Plugins",
		icon: PlugZap
	},
	{
		to: "/models",
		label: "Models",
		icon: Cpu
	}
];
var SYSTEM_PROMPTS = {
	chat: `You are Boss, the coding agent of Bossnu SlieLo.
Speak Thai when the user writes Thai; otherwise match the user's language.
You select tools yourself. Never ask the user to pick a Skill button.
Never claim an external action succeeded unless a tool result confirms it.
If a mutation, deploy, build, or CI step is involved, verify with a real tool before saying it worked.
Diagnose HTTP 401/403/502/503, missing modules, TypeScript errors, and runtime errors from actual output.
Credential policy: never echo secrets. If a credential is missing, name the exact service and field. Do not invent keys.
OpenRouter is a separate gateway from Puter. Never say an OpenRouter key calls Puter models.
If verification is missing, say so instead of declaring success.`,
	agents: `You are the Boss orchestrator for Bossnu SlieLo. Plan, select tools, act, observe, repair, and verify. Do not stop at a commit; wait for CI/tool evidence.`
};
var Route$5 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "description",
				content: `${MOTTO_EN} AI coding agent for Bossnu SlieLo.`
			},
			{
				name: "theme-color",
				content: "#0b0c0e"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+Thai:wght@400;500;600&family=Sora:wght@400;500;600&display=swap"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "th",
		className: "antialiased",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "bg-bg text-fg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PuterProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipProvider, {
					delayDuration: 200,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginPermissionGate, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
							theme: "dark",
							position: "bottom-right",
							toastOptions: { style: {
								background: "#1c2026",
								border: "1px solid #262b32",
								color: "#eceef2"
							} }
						})
					]
				}) }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
			]
		})]
	})
});
var $$splitComponentImporter$4 = () => import("./routes-OULiJa1q.mjs");
var Route$4 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./chat-DZwxYsY5.mjs");
var Route$3 = createFileRoute("/chat")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./models-BItLxJx6.mjs");
var Route$2 = createFileRoute("/models")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./plugins-B1uvgjd6.mjs");
var Route$1 = createFileRoute("/plugins")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./sandbox-D5c6hC2V.mjs");
var Route = createFileRoute("/sandbox")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var rootRouteChildren = {
	IndexRoute: Route$4.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$5
	}),
	ChatRoute: Route$3.update({
		id: "/chat",
		path: "/chat",
		getParentRoute: () => Route$5
	}),
	ModelsRoute: Route$2.update({
		id: "/models",
		path: "/models",
		getParentRoute: () => Route$5
	}),
	PluginsRoute: Route$1.update({
		id: "/plugins",
		path: "/plugins",
		getParentRoute: () => Route$5
	}),
	SandboxRoute: Route.update({
		id: "/sandbox",
		path: "/sandbox",
		getParentRoute: () => Route$5
	})
};
var routeTree = Route$5._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { cn as _, FOOTER_LINE as a, PUTER_DOCS as c, chatWithPuter as d, ensurePuter as f, Button as g, requestPluginPermission as h, DEFAULT_PUTER_MODEL as i, SYSTEM_PROMPTS as l, PLUGIN_PERMISSION_MODE as m, APP_NAME as n, MOTTO_EN as o, extractText as p, APP_NAV as r, MOTTO_TH as s, router_exports as t, usePuter as u, uid as v };
