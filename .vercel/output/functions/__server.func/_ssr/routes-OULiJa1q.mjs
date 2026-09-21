import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { T as ArrowRight, a as ShieldCheck, i as Terminal, p as Paperclip, w as Bot } from "../_libs/lucide-react.mjs";
import { g as Button, n as APP_NAME, o as MOTTO_EN, s as MOTTO_TH } from "./router-B7-d8jQy.mjs";
import { t as AppShell } from "./app-shell-D56XWBrA.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-OULiJa1q.js
var import_jsx_runtime = require_jsx_runtime();
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-[0.22em] text-subtle",
					children: "AI coding agent"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-4 max-w-3xl text-4xl font-medium tracking-tight text-fg sm:text-6xl",
					children: APP_NAME
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 max-w-2xl text-lg text-muted",
					children: MOTTO_TH
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-2xl text-sm text-subtle",
					children: MOTTO_EN
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 max-w-2xl text-sm leading-7 text-muted",
					children: "คุยกับ Boss อย่างเดียว ไม่ต้องกด Skill. Boss เลือกเครื่องมือ วิเคราะห์ ลงมือ ดูผล ซ่อม แล้วตรวจซ้ำ — จะไม่บอกว่าสำเร็จจนกว่าจะมีหลักฐานจากเครื่องมือจริง"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 flex flex-wrap gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/chat",
							children: ["เริ่มแชทกับ Boss", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						variant: "secondary",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/sandbox",
							children: "Sandbox preview"
						})
					})]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "border-t border-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto grid max-w-5xl gap-4 px-5 py-12 sm:grid-cols-3 sm:px-8",
				children: [
					{
						icon: Bot,
						title: "Boss loop",
						body: "วิเคราะห์ → เลือก tool → ลงมือ → ดูผล → ซ่อม → ตรวจซ้ำ รวม GitHub CI, sandbox และ web check"
					},
					{
						icon: Paperclip,
						title: "ไฟล์และ ZIP",
						body: "แนบหลายไฟล์ รูป หรือ ZIP แล้ว Boss อ่านโค้ดออกมาวิเคราะห์ก่อนตอบ"
					},
					{
						icon: ShieldCheck,
						title: "Always Ask",
						body: "ปลั๊กอินขออนุญาตก่อนเรียก endpoint — ไม่มีปุ่มหลอก และไม่เดาโมเดลที่ยังไม่ยืนยัน"
					}
				].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { className: "size-5 text-primary" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-4 text-base font-medium",
							children: item.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-6 text-muted",
							children: item.body
						})
					]
				}, item.title))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "border-t border-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-5xl flex-col gap-4 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium",
					children: "โมเดล"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 max-w-xl text-sm leading-6 text-muted",
					children: "Puter คือเส้นทางหลักหลัง Sign in. OpenRouter ใช้ได้เมื่อใส่ key จริง แล้วดึงโมเดลจาก OpenRouter — ไม่ใช่โมเดลของ Puter และยังไม่ประกาศว่าเส้นนั้นเสร็จถ้า catalog ไม่ตอบ"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/plugins",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Terminal, { className: "size-4" }), "Plugins และ keys"]
					})
				})]
			})
		})
	] }) });
}
//#endregion
export { Home as component };
