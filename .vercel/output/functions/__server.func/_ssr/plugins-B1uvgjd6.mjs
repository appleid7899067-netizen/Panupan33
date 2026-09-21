import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as cn, g as Button, m as PLUGIN_PERMISSION_MODE, u as usePuter } from "./router-B7-d8jQy.mjs";
import { t as AppShell } from "./app-shell-D56XWBrA.mjs";
import { a as connectApiKey, c as hasOpenRouterKey, i as clearActiveApiKey, s as getCachedOpenRouterModels, t as API_KEY_CHANGED_EVENT } from "./provider-keys-B_SoxQZP.mjs";
import { n as getGithubPat, r as setGithubPat } from "./github-pat-B8vengCJ.mjs";
import { t as Root } from "../_libs/radix-ui__react-label.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/plugins-B1uvgjd6.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-10 w-full rounded-md bg-elevated px-3 text-sm text-fg shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 placeholder:text-subtle file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
function Label({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
		className: cn("text-xs font-medium text-muted", className),
		...props
	});
}
function PluginsPage() {
	const { signedIn, user, signIn, signOut } = usePuter();
	const [openRouterKey, setOpenRouterKey] = (0, import_react.useState)("");
	const [openRouterOn, setOpenRouterOn] = (0, import_react.useState)(() => hasOpenRouterKey());
	const [modelCount, setModelCount] = (0, import_react.useState)(() => getCachedOpenRouterModels().length);
	const [githubToken, setGithubToken] = (0, import_react.useState)("");
	const [githubOn, setGithubOn] = (0, import_react.useState)(() => Boolean(getGithubPat()));
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const sync = () => {
			setOpenRouterOn(hasOpenRouterKey());
			setModelCount(getCachedOpenRouterModels().length);
		};
		window.addEventListener(API_KEY_CHANGED_EVENT, sync);
		return () => window.removeEventListener(API_KEY_CHANGED_EVENT, sync);
	}, []);
	async function connectOpenRouter() {
		setBusy(true);
		try {
			const result = await connectApiKey(openRouterKey);
			setOpenRouterKey("");
			toast.success(`OpenRouter connected · ${result.models.length} chat models`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "OpenRouter connect failed");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-3xl px-5 py-10 sm:px-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-medium tracking-tight",
				children: "Plugins และ keys"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm leading-6 text-muted",
				children: [
					"นโยบายสิทธิ์ระดับระบบคือ ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-fg",
						children: PLUGIN_PERMISSION_MODE
					}),
					". Boss จะถามก่อนเรียกปลั๊กอิน ไม่เรียก endpoint เงียบ ๆ"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-base font-medium",
						children: "Puter"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "เส้นทางหลัก: puter.ai.chat() หลังตรวจ session จริงด้วย getUser()"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 flex flex-wrap items-center gap-3",
						children: signedIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm",
							children: user?.username || user?.email || "Signed in"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							onClick: () => void signOut(),
							children: "Sign out"
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => void signIn().catch((err) => toast.error(err instanceof Error ? err.message : "Sign-in failed")),
							children: "Sign in with Puter"
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-base font-medium",
						children: "OpenRouter"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm leading-6 text-muted",
						children: "ใส่ key แล้ว Boss จะเรียก OpenRouter โดยตรง แล้วดึงโมเดลจาก OpenRouter catalog. ไม่ใช่โมเดลของ Puter และจะไม่แสดงตัวเลือกจนกว่า catalog จะตอบจริง"
					}),
					openRouterOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-ok",
							children: [
								"Connected · ",
								modelCount,
								" chat models verified"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							onClick: () => {
								clearActiveApiKey();
								toast.success("OpenRouter key cleared");
							},
							children: "Disconnect"
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mt-4 grid gap-3",
						onSubmit: (e) => {
							e.preventDefault();
							connectOpenRouter();
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "or-key",
								children: "OpenRouter API key"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "or-key",
								type: "password",
								autoComplete: "off",
								value: openRouterKey,
								onChange: (e) => setOpenRouterKey(e.target.value),
								placeholder: "sk-or-..."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								disabled: busy || !openRouterKey.trim(),
								children: "Verify and connect"
							}) })
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-base font-medium",
						children: "GitHub token"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm leading-6 text-muted",
						children: "สำหรับเขียนไฟล์, PR, Issue, และรอ CI เมื่อยังไม่ได้ติดตั้ง GitHub App. Token อยู่ใน session ของเบราว์เซอร์นี้เท่านั้น"
					}),
					githubOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-ok",
							children: "GitHub token connected"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							onClick: () => {
								setGithubPat(null);
								setGithubOn(false);
								toast.success("GitHub token cleared");
							},
							children: "Disconnect"
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mt-4 grid gap-3",
						onSubmit: (e) => {
							e.preventDefault();
							if (!githubToken.trim()) return;
							setGithubPat(githubToken);
							setGithubToken("");
							setGithubOn(true);
							toast.success("GitHub token saved in this session");
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "gh-key",
								children: "Personal access token"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "gh-key",
								type: "password",
								autoComplete: "off",
								value: githubToken,
								onChange: (e) => setGithubToken(e.target.value),
								placeholder: "ghp_..."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								disabled: !githubToken.trim(),
								children: "Save for this session"
							}) })
						]
					})
				]
			})
		]
	}) });
}
//#endregion
export { PluginsPage as component };
