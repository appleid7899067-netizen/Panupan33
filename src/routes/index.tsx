import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Paperclip, ShieldCheck, Terminal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { APP_NAME, MOTTO_EN, MOTTO_TH } from "@/lib/catalog";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <AppShell>
      <main>
        <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-subtle">AI coding agent</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-medium tracking-tight text-fg sm:text-6xl">
            {APP_NAME}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">{MOTTO_TH}</p>
          <p className="mt-2 max-w-2xl text-sm text-subtle">{MOTTO_EN}</p>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-muted">
            คุยกับ Boss อย่างเดียว ไม่ต้องกด Skill. Boss เลือกเครื่องมือ วิเคราะห์ ลงมือ ดูผล ซ่อม แล้วตรวจซ้ำ
            — จะไม่บอกว่าสำเร็จจนกว่าจะมีหลักฐานจากเครื่องมือจริง
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/chat">
                เริ่มแชทกับ Boss
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/sandbox">Sandbox preview</Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid max-w-5xl gap-4 px-5 py-12 sm:grid-cols-3 sm:px-8">
            {[
              {
                icon: Bot,
                title: "Boss loop",
                body: "วิเคราะห์ → เลือก tool → ลงมือ → ดูผล → ซ่อม → ตรวจซ้ำ รวม GitHub CI, sandbox และ web check",
              },
              {
                icon: Paperclip,
                title: "ไฟล์และ ZIP",
                body: "แนบหลายไฟล์ รูป หรือ ZIP แล้ว Boss อ่านโค้ดออกมาวิเคราะห์ก่อนตอบ",
              },
              {
                icon: ShieldCheck,
                title: "Always Ask",
                body: "ปลั๊กอินขออนุญาตก่อนเรียก endpoint — ไม่มีปุ่มหลอก และไม่เดาโมเดลที่ยังไม่ยืนยัน",
              },
            ].map((item) => (
              <article key={item.title} className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
                <item.icon className="size-5 text-primary" />
                <h2 className="mt-4 text-base font-medium">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <p className="text-sm font-medium">โมเดล</p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
                Puter คือเส้นทางหลักหลัง Sign in. OpenRouter ใช้ได้เมื่อใส่ key จริง แล้วดึงโมเดลจาก OpenRouter
                — ไม่ใช่โมเดลของ Puter และยังไม่ประกาศว่าเส้นนั้นเสร็จถ้า catalog ไม่ตอบ
              </p>
            </div>
            <Button variant="secondary" asChild>
              <Link to="/plugins">
                <Terminal className="size-4" />
                Plugins และ keys
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
