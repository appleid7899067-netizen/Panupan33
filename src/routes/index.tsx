import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Paperclip, ShieldCheck, Terminal, Brain, GitBranch, Search, Wrench, CheckCircle2, Users, Workflow, LockKeyhole, Code2, Radar, Bug, Rocket, Eye } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { APP_NAME, MOTTO_EN, MOTTO_TH } from "@/lib/catalog";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const roles = [
    { icon: Brain, title: "COMMANDER", body: "อ่าน Goal และกำหนดเส้นทางงานโดยไม่บังคับให้คุณเลือกเครื่องมือ" },
    { icon: Search, title: "RESEARCHER", body: "ค้นข้อมูล ตรวจเอกสาร และแยกสัญญาณสำคัญก่อนลงมือ" },
    { icon: Code2, title: "BUILDER", body: "สร้างและแก้โค้ดเป็นงานจริง พร้อมรักษาโครงสร้างของโปรเจกต์" },
    { icon: Terminal, title: "OPERATOR", body: "รันคำสั่ง ทดสอบ Sandbox เชื่อม GitHub และจัดการ workflow" },
    { icon: Bug, title: "REPAIR ENGINE", body: "เมื่อพังไม่หยุดที่รายงาน Error แต่ย้อนหาสาเหตุแล้วซ่อมต่อ" },
    { icon: Eye, title: "VERIFIER", body: "ตรวจ Build, Runtime, HTTP และ Preview ก่อนยืนยันผล" },
    { icon: Rocket, title: "PUBLISHER", body: "พางานจากไฟล์ไปสู่ Preview หรือ deployment ที่ตรวจสอบได้" },
    { icon: Radar, title: "WATCHER", body: "เฝ้าดูผลหลังลงมือและเปิด Recovery Loop เมื่อผลจริงไม่ตรงเป้า" },
  ];

  const capabilities = [
    {
      icon: Users,
      title: "6-Agent orchestration",
      body: "Planner, Researcher, Builder, Operator, Reviewer และ Verifier ทำงานตามบทบาท แทนการโยนทุกอย่างให้โมเดลตัวเดียว",
    },
    {
      icon: Brain,
      title: "Goal-first intelligence",
      body: "Boss เริ่มจากผลลัพธ์ที่ผู้ใช้ต้องการ แล้วแตกเป็น context, plan, route และ execution โดยไม่บังคับให้ผู้ใช้เลือกเครื่องมือเอง",
    },
    {
      icon: Wrench,
      title: "Skill + Tool Registry",
      body: "Agent เลือกทักษะและเครื่องมือที่ตรงกับงาน เช่น GitHub, Sandbox, Web และ deployment providers ผ่านชั้นกลางเดียว",
    },
    {
      icon: Workflow,
      title: "Live execution trace",
      body: "ทุกขั้นตอนสำคัญมีสถานะและร่องรอยให้เห็น ตั้งแต่คิด วางแผน ลงมือ แก้ปัญหา จนถึงตรวจผล",
    },
    {
      icon: CheckCircle2,
      title: "Verify before done",
      body: "การทำงานเสร็จไม่เท่ากับงานสำเร็จ Boss ต้องตรวจหลักฐานจากระบบจริงก่อนประกาศผลลัพธ์",
    },
    {
      icon: LockKeyhole,
      title: "Permission-aware",
      body: "ออกแบบการเรียก Tool โดยคำนึงถึงสิทธิ์และ least privilege เพื่อให้ความสามารถที่เพิ่มขึ้นยังควบคุมได้",
    },
  ];

  return (
    <AppShell>
      <main className="min-h-full">
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(120,90,255,.18),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(40,170,255,.14),transparent_32%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
          <div className="pointer-events-none absolute -left-32 top-10 size-72 rounded-full bg-primary/10 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute -right-32 top-24 size-80 rounded-full bg-sky-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />
          <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <div className="max-w-4xl">
              <div className="group inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface/70 px-3 py-1.5 text-xs font-medium tracking-[0.18em] text-subtle shadow-[0_0_35px_rgba(120,90,255,.10)] transition-all duration-500 hover:border-primary/50 hover:shadow-[0_0_55px_rgba(120,90,255,.22)]">
                <span className="size-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(139,92,246,.9)] animate-pulse" />
                BOSSNU UNIFIED · AI AGENT WORKSPACE
              </div>
              <h1 className="mt-6 text-5xl font-semibold tracking-[-0.04em] text-fg sm:text-7xl">
                คุณบอกเป้าหมาย
                <br />
                <span className="bg-gradient-to-r from-primary via-fuchsia-400 to-sky-400 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(139,92,246,.25)]">Boss หาวิธีทำเอง</span>
              </h1>
              <p className="mt-6 max-w-3xl text-xl leading-8 text-muted sm:text-2xl">
                ไม่ใช่แค่ AI ที่ตอบข้อความ แต่เป็นชั้นควบคุมที่เชื่อม
                <span className="text-fg"> ความเข้าใจ → การวางแผน → การลงมือทำ → การตรวจสอบ </span>
                ให้กลายเป็น workflow เดียว
              </p>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-subtle">
                ผู้ใช้ไม่จำเป็นต้องรู้ว่า Agent ไหนเหมาะกับงาน Tool ตัวไหนต้องเรียก หรือควรทำกี่ขั้นตอน
                Boss รับ Goal แล้วจัดเส้นทางให้เอง พร้อมเก็บ Execution Trace และไม่ประกาศว่าสำเร็จจนกว่าจะมีหลักฐานจากระบบจริง
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <div className="pointer-events-none absolute right-8 top-28 hidden size-28 rounded-full border border-primary/20 sm:block animate-[spin_18s_linear_infinite]">
                  <div className="absolute -right-1 top-1/2 size-2 rounded-full bg-primary shadow-[0_0_18px_rgba(139,92,246,1)]" />
                </div>
                <Button size="lg" className="boss-primary-cta" asChild>
                  <Link to="/chat">
                    เริ่มแชทกับ Boss
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/sandbox">เปิด Sandbox</Link>
                </Button>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-subtle">              <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">ใครจะรู้... ถ้าไม่ลองสั่ง Boss</span>
              <span className="rounded-full border border-border bg-surface/60 px-3 py-1.5">30,000+ Identity Space</span>
              <span className="rounded-full border border-border bg-surface/60 px-3 py-1.5">Goal → Build → Verify → Live</span>
            </div>

            <div className="boss-type-hero mt-14" aria-label="BOSSNU typographic identity">
              <div className="boss-type-word">BOSSNU</div>
              <div className="boss-type-rule" />
              <div className="boss-type-meta">
                <span>UNIFIED AI WORKSPACE</span>
                <span>GOAL → BUILD → VERIFY → LIVE</span>
              </div>
              <div className="boss-type-mark" aria-hidden="true">B</div>
            </div>

            <div className="boss-template-grid mt-10" aria-label="Bossnu workspace templates">
              {[
                { tone: "violet", label: "SITES", title: "Northstar", body: "หน้าเว็บที่ Boss วางโครง สร้างเนื้อหา และตรวจ Preview ให้พร้อมใช้งาน", mark: "N" },
                { tone: "cyan", label: "APPS", title: "Pulse", body: "แอปที่ Boss ช่วยแตกงาน เขียนโค้ด รัน และตรวจผลแบบเป็นขั้นตอน", mark: "P" },
                { tone: "amber", label: "SYSTEMS", title: "Ledger", body: "ระบบข้อมูลที่เริ่มจาก Goal แล้วค่อยเชื่อม Tool, API และ workflow ที่ต้องใช้", mark: "L" },
              ].map((item) => (
                <article key={item.title} className={`boss-template-card boss-template-${item.tone}`}>
                  <div className="boss-template-visual">
                    <div className="boss-template-gridlines" aria-hidden="true" />
                    <div className="boss-template-mark">{item.mark}</div>
                    <div className="boss-template-kicker">BOSSNU TEMPLATE</div>
                    <div className="boss-template-preview">
                      <span>{item.title}</span>
                      <span className="boss-template-dot" />
                    </div>
                  </div>
                  <div className="boss-template-copy">
                    <div className="flex items-center justify-between gap-3">
                      <h3>{item.title}</h3>
                      <span>{item.label}</span>
                    </div>
                    <p>{item.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-surface/20">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">App showcase</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">ดูงานที่ Boss สร้างได้จริง</h2>
                <p className="mt-4 text-sm leading-7 text-muted">หน้าแรกควรเห็นภาพทันทีว่า Boss ไม่ได้มีแค่ช่องแชท แต่สามารถพา Goal ไปเป็นเว็บไซต์ แอป และระบบที่เปิดดู Preview ได้</p>
              </div>
              <Link to="/chat" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-fg">
                สั่ง Boss สร้างแอป <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-9 grid gap-5 lg:grid-cols-3">
              {[
                { title: "Website Studio", tag: "WEB APP", icon: Code2, tone: "violet", body: "สร้างหน้าเว็บหลายบล็อก พร้อม layout, typography, content และ Preview ในงานเดียว" },
                { title: "App Builder", tag: "APPLICATION", icon: Rocket, tone: "cyan", body: "แตก Goal เป็นหน้าจอและฟังก์ชัน แล้วให้ Agent ลงมือแก้โค้ด ทดสอบ และวนซ้ำ" },
                { title: "Live Preview", tag: "VERIFY", icon: Eye, tone: "amber", body: "แสดงผลลัพธ์จากงานจริงให้เห็นก่อนจบ พร้อมตรวจ runtime และเส้นทาง Preview" },
              ].map((item) => (
                <article key={item.title} className="group overflow-hidden rounded-3xl border border-border bg-background shadow-[0_20px_70px_rgba(0,0,0,.16)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30">
                  <div className={`relative h-48 overflow-hidden border-b border-border bg-gradient-to-br ${item.tone === "violet" ? "from-violet-500/20 via-background to-fuchsia-500/5" : item.tone === "cyan" ? "from-cyan-500/20 via-background to-sky-500/5" : "from-amber-400/20 via-background to-orange-500/5"}`}>
                    <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:28px_28px]" />
                    <div className="absolute left-5 right-5 top-5 rounded-xl border border-white/10 bg-black/30 p-3 backdrop-blur-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-red-400/70" /><span className="size-2 rounded-full bg-amber-300/70" /><span className="size-2 rounded-full bg-emerald-400/70" />
                        <span className="ml-2 text-[9px] tracking-[0.18em] text-white/45">BOSS PREVIEW</span>
                      </div>
                      <div className="mt-4 grid grid-cols-[1fr_1.5fr] gap-2">
                        <div className="h-20 rounded-lg bg-white/5" />
                        <div className="space-y-2"><div className="h-3 w-2/3 rounded bg-white/10" /><div className="h-3 w-full rounded bg-white/5" /><div className="h-10 w-full rounded-lg bg-white/5" /></div>
                      </div>
                    </div>
                    <div className="absolute bottom-4 right-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] text-white/65 backdrop-blur-sm">
                      <item.icon className="size-3.5 text-primary" /> {item.tag}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,.7)]" />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
                    <Link to="/chat" className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-subtle transition-colors group-hover:text-fg">
                      ให้ Boss ลงมือ <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">Agent roles</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">เบื้องหลังคำว่า “ทำเลย” มีทั้งทีม</h2>
              <p className="mt-4 text-sm leading-7 text-muted">Boss แบ่งบทบาทตามงาน แล้วส่งไม้ต่อพร้อมหลักฐาน ตั้งแต่ค้นหา สร้าง รัน ซ่อม ตรวจ จนถึง publish</p>
            </div>
            <div className="mb-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {roles.map((role) => (
                <article key={role.title} className="group rounded-2xl border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30">
                  <role.icon className="size-5 text-primary transition-transform duration-200 group-hover:scale-110" />
                  <div className="mt-5 text-[10px] font-semibold tracking-[0.2em] text-subtle">BOSS MESH</div>
                  <h3 className="mt-1 text-sm font-semibold">{role.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{role.body}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">How Boss thinks</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">จากประโยคเดียวสู่ผลลัพธ์จริง</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
                  Chat คือ Control Plane ของระบบ ผู้ใช้คุยกับ Boss เพียงห้องเดียว แต่เบื้องหลังสามารถแตกงานและประสานหลายชั้นได้
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["01", "GOAL", "เข้าใจสิ่งที่ต้องการให้เกิดขึ้น"],
                  ["02", "CONTEXT", "รวมบทสนทนา memory และสถานะงาน"],
                  ["03", "PLAN", "แตกเป้าหมายเป็นขั้นตอนที่ทำได้จริง"],
                  ["04", "ROUTE", "เลือก Agent, Skill, Tool และ Model"],
                  ["05", "EXECUTE", "ลงมือกับระบบจริงและเก็บ trace"],
                  ["06", "VERIFY", "ตรวจหลักฐานก่อนส่งผลลัพธ์"],
                ].map(([n, title, body]) => (
                  <article key={n} className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-subtle">{n}</span>
                      <GitBranch className="size-4 text-primary" />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold tracking-[0.12em]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">System capability</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">ความสามารถที่อยู่ใต้ห้องแชทเดียว</h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((item) => (
                <article key={item.title} className="group rounded-2xl border border-border bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_18px_50px_rgba(0,0,0,.16)]">
                  <item.icon className="size-5 text-primary transition-transform duration-300 group-hover:scale-125 group-hover:rotate-3" />
                  <h3 className="mt-5 text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="rounded-3xl border border-border bg-[radial-gradient(circle_at_20%_20%,rgba(255,190,70,.10),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(70,170,255,.10),transparent_32%)] p-6 sm:p-10">
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-subtle">Leadership signature</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">ผู้สร้างวิสัยทัศน์ · ผู้ขับเคลื่อนระบบ</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted">
                  Bossnu ถูกวางแนวคิดให้เป็นระบบที่พา AI จากการเข้าใจเป้าหมายไปสู่การทำงานที่ตรวจสอบได้
                </p>
              </div>

              <div className="mt-10 grid gap-6 md:grid-cols-2">
                <article className="rounded-2xl border border-amber-400/20 bg-black/20 p-7 text-center">
                  <div className="font-serif text-5xl italic tracking-tight text-amber-300 sm:text-6xl">Panupan</div>
                  <div className="mx-auto mt-2 h-px w-40 bg-amber-300/40" />
                  <h3 className="mt-5 text-xl font-semibold">ภาณุพันธ์</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-amber-300">Chief Executive Officer · CEO</p>
                  <p className="mx-auto mt-6 max-w-sm text-sm leading-7 text-muted">
                    “คิดให้ไกล ทำให้จริง สร้างอนาคตไปด้วยกัน”
                  </p>
                </article>

                <article className="rounded-2xl border border-sky-400/20 bg-black/20 p-7 text-center">
                  <div className="font-serif text-5xl italic tracking-tight text-sky-300 sm:text-6xl">Sliola</div>
                  <div className="mx-auto mt-2 h-px w-40 bg-sky-300/40" />
                  <h3 className="mt-5 text-xl font-semibold">สลี่ออลา</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-300">Chief Technology Officer · CTO</p>
                  <p className="mx-auto mt-6 max-w-sm text-sm leading-7 text-muted">
                    “เทคโนโลยีคือเครื่องมือ ศักยภาพคือพลังของทุกคน”
                  </p>
                </article>
              </div>

              <div className="mt-8 text-center">
                <div className="text-lg font-semibold tracking-[0.3em]">BOSSNU</div>
                <div className="mt-1 text-xs tracking-[0.55em] text-subtle">UNIFIED</div>
                <div className="mt-4 text-[10px] uppercase tracking-[0.35em] text-subtle">One system · Endless possibilities</div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <p className="text-sm font-medium">พร้อมให้ Boss ลงมือ</p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
                บอกเป้าหมายมา แล้วดูระบบแตกงาน วางแผน เรียกเครื่องมือ ลงมือ และตรวจสอบผลแบบเรียลไทม์
              </p>
            </div>
            <Button size="lg" className="boss-primary-cta" asChild>
              <Link to="/chat">
                เปิด Boss Chat
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
