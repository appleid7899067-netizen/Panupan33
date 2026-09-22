import { useEffect, useMemo, useState } from "react";

type BossLiveActivityProps = { steps: string[]; active?: boolean; verified?: boolean; compact?: boolean; };
function iconFor(step: string) {
  if (/ค้นหา|search|เว็บ|google|yandex/i.test(step)) return "⌕";
  if (/verify|ตรวจ|เช็ก|ทดสอบ|build|ci/i.test(step)) return "✓";
  if (/error|fail|ผิด|ล้ม/i.test(step)) return "!";
  if (/tool|เครื่องมือ|mcp/i.test(step)) return "⌘";
  if (/วิเคราะห์|คิด|plan|reason/i.test(step)) return "✦";
  return "›";
}
export function BossLiveActivity({ steps, active = false, verified = false, compact = false }: BossLiveActivityProps) {
  const visible = useMemo(() => steps.filter(Boolean).slice(-8), [steps]);
  const [pulse, setPulse] = useState(0);
  useEffect(() => { if (!active) return; const timer = window.setInterval(() => setPulse((v) => v + 1), 900); return () => window.clearInterval(timer); }, [active]);
  if (!visible.length && !active) return null;
  return (<div className={compact ? "mt-2" : "mt-3"} aria-live="polite">
    <style>{`@keyframes boss-shimmer { 0% { background-position: 180% 0; } 100% { background-position: -80% 0; } } @keyframes boss-soft-pulse { 0%,100% { opacity:.55; transform:scale(.96); } 50% { opacity:1; transform:scale(1); } } .boss-shimmer { background-image: linear-gradient(90deg, currentColor 0%, rgba(255,255,255,.25) 45%, currentColor 70%); background-size: 220% 100%; -webkit-background-clip:text; background-clip:text; color:transparent; animation: boss-shimmer 1.8s linear infinite; } .boss-pulse { animation: boss-soft-pulse 1.2s ease-in-out infinite; }`}</style>
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/70 px-3 py-2.5 shadow-inner">
      <div className="flex items-center gap-2 text-[11px] text-zinc-500"><span className={active ? "boss-pulse text-zinc-200" : "text-zinc-500"}>✦</span><span className={active ? "boss-shimmer" : ""}>{active ? `Boss กำลังทำงาน${".".repeat(pulse % 4)}` : verified ? "ตรวจสอบแล้ว" : "สรุปการทำงาน"}</span></div>
      <div className="mt-2 space-y-1.5">{visible.map((step, index) => { const last = index === visible.length - 1; return (<div key={`${step}-${index}`} className="flex items-center gap-2 text-[11px] leading-5 text-zinc-400"><span className={`grid size-4 shrink-0 place-items-center rounded-full border border-zinc-800 bg-zinc-900 text-[9px] ${active && last ? "text-zinc-100" : "text-zinc-500"}`}>{iconFor(step)}</span><span className={active && last ? "text-zinc-200" : ""}>{step}</span></div>); })}</div>
    </div></div>);
}
