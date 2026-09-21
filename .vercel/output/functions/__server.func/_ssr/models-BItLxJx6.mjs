import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { g as Button, u as usePuter } from "./router-B7-d8jQy.mjs";
import { t as AppShell } from "./app-shell-D56XWBrA.mjs";
import { c as hasOpenRouterKey, s as getCachedOpenRouterModels, t as API_KEY_CHANGED_EVENT } from "./provider-keys-B_SoxQZP.mjs";
import { t as listLivePuterModels } from "./puter-models-Dp1fHGPS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/models-BItLxJx6.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ModelsPage() {
	const { signedIn } = usePuter();
	const [puterModels, setPuterModels] = (0, import_react.useState)([]);
	const [puterError, setPuterError] = (0, import_react.useState)(null);
	const [openRouterOn, setOpenRouterOn] = (0, import_react.useState)(() => hasOpenRouterKey());
	const [openRouterCount, setOpenRouterCount] = (0, import_react.useState)(() => getCachedOpenRouterModels().length);
	(0, import_react.useEffect)(() => {
		const sync = () => {
			setOpenRouterOn(hasOpenRouterKey());
			setOpenRouterCount(getCachedOpenRouterModels().length);
		};
		window.addEventListener(API_KEY_CHANGED_EVENT, sync);
		return () => window.removeEventListener(API_KEY_CHANGED_EVENT, sync);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!signedIn) return;
		let cancelled = false;
		listLivePuterModels().then((models) => {
			if (!cancelled) setPuterModels(models);
		}).catch((err) => {
			if (!cancelled) setPuterError(err instanceof Error ? err.message : "Puter catalog unavailable");
		});
		return () => {
			cancelled = true;
		};
	}, [signedIn]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-3xl px-5 py-10 sm:px-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-medium tracking-tight",
				children: "Models"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm leading-6 text-muted",
				children: "ไม่มีตัวเลือกหลอก. รายการ Puter มาจาก puter.ai.listModels() หลัง Sign in. รายการ OpenRouter มาจาก OpenRouter API หลังใส่ key — ไม่ใช่โมเดลของ Puter"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-base font-medium",
					children: "Puter"
				}), !signedIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Sign in with Puter เพื่อดึงรายการจริง"
				}) : puterError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-danger",
					children: puterError
				}) : puterModels.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "กำลังดึง catalog จาก Puter…"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 max-h-80 space-y-1 overflow-auto text-sm text-muted",
					children: puterModels.slice(0, 80).map((model) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "font-mono text-xs",
						children: [model.id, model.provider ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-subtle",
							children: [" · ", model.provider]
						}) : null]
					}, model.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-base font-medium",
						children: "OpenRouter"
					}),
					openRouterOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-sm text-ok",
						children: [
							"Verified · ",
							openRouterCount,
							" chat models จาก OpenRouter"
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: "ยังไม่ได้เชื่อม OpenRouter จึงยังไม่มีรายการโมเดลให้เลือก"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-4",
						variant: "secondary",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/plugins",
							children: "ไปหน้า Plugins เพื่อใส่ key"
						})
					})
				]
			})
		]
	}) });
}
//#endregion
export { ModelsPage as component };
