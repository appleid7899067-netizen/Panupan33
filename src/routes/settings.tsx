import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bot, Check, ChevronLeft, RotateCcw, ShieldCheck,
  SlidersHorizontal, Sparkles, Wrench, Zap
} from "lucide-react";
import { useFleet, DEFAULT_AGENT_SETTINGS, type AgentSettings } from "@/lib/store";

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (value: boolean) => void; label: string; description: string;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-xl border border-border bg-elevated/35 p-4 text-left transition hover:bg-elevated/60">
      <span className={"mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition " + (checked ? "bg-primary" : "bg-zinc-700")}>
        <span className={"h-4 w-4 rounded-full bg-white transition " + (checked ? "translate-x-5" : "")} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
      </span>
    </button>
  );
}

function Section({ icon: Icon, title, description, children }: {
  icon: typeof Bot; title: string; description: string; children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg/70 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" /></span>
        <div><h2 className="text-sm font-semibold text-fg">{title}</h2><p className="mt-1 text-xs leading-5 text-muted">{description}</p></div>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const settings = useFleet((s) => s.agentSettings);
  const setAgentSettings = useFleet((s) => s.setAgentSettings);
  const resetAgentSettings = useFleet((s) => s.resetAgentSettings);
  const modelId = useFleet((s) => s.modelId);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 1400);
    return () => window.clearTimeout(t);
  }, [saved]);

  const update = <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => {
    setAgentSettings({ [key]: value });
    setSaved(true);
  };

  const reset = () => {
    resetAgentSettings();
    setSaved(true);
  };

  return (
    <main className="min-h-full overflow-auto bg-bg">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Link to="/chat" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg"><ChevronLeft className="size-4" />กลับแชท</Link>
            <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><SlidersHorizontal className="size-5" /></div><div><h1 className="text-xl font-semibold">การตั้งค่า Boss</h1><p className="mt-1 text-xs text-muted">ตั้งค่าตัวแทน, เครื่องมือ และการตรวจงาน โดยบันทึกไว้ในเครื่องนี้</p></div></div>
          </div>
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted hover:bg-elevated hover:text-fg"><RotateCcw className="size-3.5" />ค่าเริ่มต้น</button>
        </div>

        <div className="space-y-4">
          <Section icon={Bot} title="ตัวแทนและการทำงาน" description="กำหนดว่า Boss จะตัดสินใจและวนแก้งานมากแค่ไหน">
            <div className="rounded-xl border border-border bg-elevated/30 p-4">
              <div className="mb-3 text-xs font-medium text-fg">โหมดการทำงาน</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ["supervised", "คุมเข้ม", "หยุดง่าย เหมาะกับงานที่ต้องการควบคุม"],
                  ["balanced", "สมดุล", "ทำงานอัตโนมัติในระดับกลาง"],
                  ["high", "อัตโนมัติสูง", "วางแผน ลงมือ แก้ และตรวจซ้ำเต็มที่"],
                ] as const).map(([value, label, desc]) => (
                  <button key={value} type="button" onClick={() => update("autonomy", value)}
                    className={"rounded-xl border p-3 text-left " + (settings.autonomy === value ? "border-primary bg-primary/10" : "border-border bg-bg/40 hover:bg-elevated/50")}>
                    <div className="text-sm font-medium">{label}</div><div className="mt-1 text-[11px] leading-4 text-muted">{desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-elevated/30 p-4">
              <div className="mb-3 text-xs font-medium">รอบการทำงานสูงสุด</div>
              <div className="flex flex-wrap gap-2">
                {[3, 6, 8, 10].map((n) => <button key={n} type="button" onClick={() => update("maxIterations", n as AgentSettings["maxIterations"])} className={"rounded-lg px-4 py-2 text-xs " + (settings.maxIterations === n ? "bg-primary text-white" : "bg-elevated text-muted hover:text-fg")}>{n} รอบ</button>)}
              </div>
            </div>
            <Toggle checked={settings.autoTools} onChange={(v) => update("autoTools", v)} label="เลือกเครื่องมืออัตโนมัติ" description="ให้ Boss เลือก Web, Sandbox, GitHub, MCP และเครื่องมืออื่นตามเจตนา" />
            <Toggle checked={settings.autoRepair} onChange={(v) => update("autoRepair", v)} label="แก้ไขและลองใหม่อัตโนมัติ" description="เมื่อพบ error ให้ตรวจผลและพยายามแก้ก่อนสรุปงาน" />
            <Toggle checked={settings.requireVerification} onChange={(v) => update("requireVerification", v)} label="บังคับ Verification Gate" description="งานที่มีการเปลี่ยนแปลงจะไม่ถูกถือว่าสำเร็จจนกว่าจะมีหลักฐานตรวจจริง" />
            <Toggle checked={settings.showProgress} onChange={(v) => update("showProgress", v)} label="แสดงสถานะการทำงาน" description="แสดง plan → act → observe → verify ในห้องแชทแบบต่อเนื่อง" />
          </Section>

          <Section icon={Wrench} title="เครื่องมือของ Agent" description="เปิดหรือปิดความสามารถที่ Boss สามารถเรียกใช้">
            <Toggle checked={settings.webAccess} onChange={(v) => update("webAccess", v)} label="Web / ข้อมูลสด" description="ค้นหา เปิดหน้าเว็บ ตรวจ HTTP และดึงข้อมูลสดเมื่องานต้องการ" />
            <Toggle checked={settings.sandboxAccess} onChange={(v) => update("sandboxAccess", v)} label="Sandbox / Code Runner" description="รันหรือตรวจโค้ด รวมถึง Python server runner เมื่ออยู่บน Render" />
            <Toggle checked={settings.githubAccess} onChange={(v) => update("githubAccess", v)} label="GitHub Agent" description="อ่านไฟล์ แก้ไฟล์ branch, PR, issue และตรวจ Actions ตามสิทธิ์ที่มี" />
            <Toggle checked={settings.mcpAccess} onChange={(v) => update("mcpAccess", v)} label="MCP Tools" description="ค้นหาและเรียกใช้ MCP ที่เชื่อมต่ออยู่เมื่อจำเป็น" />
          </Section>

          <Section icon={ShieldCheck} title="ความปลอดภัยและบริบท" description="ควบคุมสิ่งที่ Boss จำและวิธีแสดงผล">
            <Toggle checked={settings.rememberContext} onChange={(v) => update("rememberContext", v)} label="จำบริบทของงาน" description="ใช้ memory ของ thread และ Boss Engine ต่อเนื่องเมื่อมี Puter authentication" />
            <div className="flex items-center gap-3 rounded-xl border border-border bg-elevated/30 p-4 text-xs">
              <Sparkles className="size-4 text-primary" /><span className="text-muted">โมเดลปัจจุบัน: <strong className="text-fg">{modelId}</strong> · เปลี่ยนโมเดลได้จากหน้า Models</span>
            </div>
          </Section>

          <Section icon={Zap} title="สถานะค่าเริ่มต้น" description="ค่าเหล่านี้ถูกบันทึกด้วย Zustand persistence ในเบราว์เซอร์">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-elevated/30 p-3 text-xs text-muted">Autonomy: <strong className="text-fg">{settings.autonomy}</strong></div>
              <div className="rounded-xl bg-elevated/30 p-3 text-xs text-muted">Max rounds: <strong className="text-fg">{settings.maxIterations}</strong></div>
              <div className="rounded-xl bg-elevated/30 p-3 text-xs text-muted">Verification: <strong className="text-fg">{settings.requireVerification ? "ON" : "OFF"}</strong></div>
              <div className="rounded-xl bg-elevated/30 p-3 text-xs text-muted">Tools: <strong className="text-fg">{settings.autoTools ? "AUTO" : "LIMITED"}</strong></div>
            </div>
          </Section>
        </div>

        <div className="sticky bottom-4 mt-5 flex justify-end">
          {saved && <div className="mr-2 inline-flex items-center gap-2 rounded-xl bg-ok/10 px-3 py-2 text-xs text-ok"><Check className="size-3.5" />บันทึกแล้ว</div>}
        </div>
      </div>
    </main>
  );
}
