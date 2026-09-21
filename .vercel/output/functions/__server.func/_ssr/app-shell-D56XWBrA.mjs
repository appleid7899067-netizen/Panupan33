import { d as useRouterState, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { _ as LogIn, g as LogOut, h as Menu, m as MessageSquarePlus, t as X, v as LoaderCircle } from "../_libs/lucide-react.mjs";
import { a as DialogOverlay, c as DialogTrigger, n as DialogClose, o as DialogPortal, r as DialogContent, s as DialogTitle, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as cn, a as FOOTER_LINE, c as PUTER_DOCS, g as Button, n as APP_NAME, r as APP_NAV, s as MOTTO_TH, u as usePuter } from "./router-B7-d8jQy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/app-shell-D56XWBrA.js
var import_jsx_runtime = require_jsx_runtime();
function FleetMark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 72 52",
		className: cn("h-8 w-10 sm:h-10 sm:w-14", className),
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M25 10 7 3 17 17 4 15 21 28",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "5",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M47 10 65 3 55 17 68 15 51 28",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "5",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M28 7h13c8 0 13 5 13 12s-5 12-13 12H28V7Zm0 24v13h13c8 0 13-4 13-11 0-1-.1-2-.4-3",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "5",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			})
		]
	});
}
function Logo({ compact = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to: "/",
		className: "flex min-w-0 shrink items-center gap-1.5 text-fg no-underline",
		"aria-label": "Bossnu SlieLo home",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FleetMark, { className: "shrink-0 text-primary" }), !compact && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "whitespace-nowrap text-base font-bold tracking-tight sm:text-2xl",
			children: ["Bossnu ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-primary",
				children: "SlieLo"
			})]
		})]
	});
}
function SiteFooter() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
		className: "border-t border-border bg-bg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-end sm:justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: MOTTO_TH
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-xs text-subtle",
				children: [APP_NAME, ". Models run through Puter unless you connect OpenRouter."]
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				className: "text-xs text-muted hover:text-fg",
				href: PUTER_DOCS,
				target: "_blank",
				rel: "noreferrer",
				children: "developer.puter.com"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "border-t border-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mx-auto max-w-6xl px-4 py-3 text-xs text-subtle",
				children: FOOTER_LINE
			})
		})]
	});
}
var Sheet = Dialog;
var SheetTrigger = DialogTrigger;
function SheetContent({ className, children, side = "left", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-50 bg-bg/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
		className: cn("fixed z-50 flex h-full w-[min(20rem,88vw)] flex-col bg-surface shadow-[var(--shadow-pop)]", side === "left" ? "top-0 left-0" : "top-0 right-0", className),
		...props,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
				className: "sr-only",
				children: "Menu"
			}),
			children,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
				className: "absolute top-3 right-3 rounded-sm p-1 text-muted hover:text-fg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "sr-only",
					children: "Close"
				})]
			})
		]
	})] });
}
function PuterChip() {
	const { ready, signedIn, user, signIn, signOut } = usePuter();
	if (!ready) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex h-9 items-center gap-1.5 rounded-full bg-elevated px-2.5 text-xs text-muted shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-3.5 animate-spin" }), "Puter"]
	});
	if (signedIn) {
		const label = user?.username || user?.email || "Puter";
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => void signOut(),
			className: "inline-flex h-9 max-w-36 items-center gap-1.5 rounded-full bg-elevated px-2.5 text-xs text-muted shadow-[var(--shadow-border)] hover:text-fg",
			title: "Sign out of Puter",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-1.5 shrink-0 rounded-full bg-ok" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "truncate",
					children: label
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "size-3.5 shrink-0" })
			]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
		size: "sm",
		variant: "secondary",
		onClick: () => void signIn().catch((err) => toast.error(err instanceof Error ? err.message : "Sign-in failed. Allow popups and retry.")),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogIn, { className: "size-4" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "hidden sm:inline",
				children: "Sign in with Puter"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sm:hidden",
				children: "Puter"
			})
		]
	});
}
function Header() {
	const path = useRouterState({ select: (s) => s.location.pathname });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
		className: "sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon-sm",
						className: "shrink-0 md:hidden",
						"aria-label": "Open menu",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-5" })
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetContent, {
					side: "left",
					className: "p-4 pt-12",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Logo, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "mt-6 flex flex-col gap-1",
						children: APP_NAV.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: item.to,
							className: "flex min-h-11 items-center gap-2 rounded-md px-2 py-2 text-sm text-muted hover:bg-elevated hover:text-fg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { className: "size-4" }), item.label]
						}, item.to))
					})]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Logo, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "ml-6 hidden items-center gap-1 md:flex",
					children: APP_NAV.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: item.to,
							className: path.startsWith(item.to) ? "text-fg" : void 0,
							children: item.label
						})
					}, item.to))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ml-auto flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PuterChip, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						className: "size-11 shrink-0",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/chat",
							"aria-label": "เปิดแชท",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquarePlus, { className: "size-5" })
						})
					})]
				})
			]
		})
	});
}
function AppShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1",
				children
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, {})
		]
	});
}
//#endregion
export { AppShell as t };
