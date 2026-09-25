import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { maskInternalUrls } from "@/lib/ui-safe";

type BossLiveActivityProps = {
  steps: string[];
  active?: boolean;
  verified?: boolean;
  compact?: boolean;
};

type WorkflowPhase = {
  key: "goal" | "plan" | "research" | "execute" | "repair" | "verify";
  label: string;
  icon: string;
  match: RegExp;
};

const WORKFLOW: WorkflowPhase[] = [
  { key: "goal", label: "Goal & Context", icon: "🎯", match: /goal|context|เป้าหมาย|บริบท/i },
  { key: "plan", label: "Plan & Route", icon: "🗺️", match: /plan|route|แผน|เส้นทาง|budget|coworker|specialist/i },
  { key: "research", label: "Research", icon: "🔎", match: /research|ค้นหา|search|เว็บ|เตรียมข้อมูล/i },
  { key: "execute", label: "Execute & Trace", icon: "🛠️", match: /execute|trace|tool|เครื่องมือ|รอบ \d+|github|sandbox|builder|web_|รันคำสั่ง|bash/i },
  { key: "repair", label: "Repair Engine", icon: "🔧", match: /repair|root cause|recovery|error|ผิดพลาด|แก้|หลีกเลี่ยง|วน|approve/i },
  { key: "verify", label: "Verify & Publish", icon: "✅", match: /verify|publish|ตรวจ|เช็ก|ทดสอบ|build|ci|ผ่าน|หลักฐาน/i },
];

function phaseFor(step: string): WorkflowPhase {
  return WORKFLOW.find((phase) => phase.match.test(step)) ?? WORKFLOW[3];
}

function cleanStep(step: string): string {
  return maskInternalUrls(
    step
      .replace(/^\s*[🎯🗺️🔎🛠️🔧🔬✅✓✦›⚠️🚨🧩🔄⛔🤝📦☁️]+\s*/u, "")
      .replace(/^(Goal & Context|Plan & Route|Research|Execute & Trace|Repair Engine|Verify & Publish)\s*:\s*/i, "")
      .trim(),
    "display",
  );
}

function iconFor(step: string) {
  if (/error|fail|ผิด|ล้ม/i.test(step)) return "!";
  if (/verify|ตรวจ|เช็ก|ทดสอบ|build|ci/i.test(step)) return "✓";
  if (/search|ค้น|เว็บ/i.test(step)) return "⌕";
  if (/tool|เครื่องมือ|mcp|รันคำสั่ง/i.test(step)) return "⌘";
  if (/repair|แก้|recovery|root cause|approve/i.test(step)) return "↻";
  if (/plan|reason|วิเคราะห์|คิด|coworker|specialist/i.test(step)) return "✦";
  return "›";
}

export function BossLiveActivity({ steps, active = false, verified = false, compact = false }: BossLiveActivityProps) {
  const visible = useMemo(() => steps.filter(Boolean).slice(-24), [steps]);
  const phases = useMemo(() => {
    const map = new Map<WorkflowPhase["key"], string[]>();
    for (const step of visible) {
      const phase = phaseFor(step);
      const list = map.get(phase.key) ?? [];
      list.push(step);
      map.set(phase.key, list);
    }
    return WORKFLOW.map((phase) => ({ phase, steps: map.get(phase.key) ?? [] })).filter((entry) => entry.steps.length);
  }, [visible]);

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (key: string, stepCount: number) => {
    if (open[key] !== undefined) return open[key];
    // Auto-collapse phases with many steps; keep current/active expanded
    return stepCount <= 3;
  };
  const toggle = (key: string, stepCount: number) => {
    setOpen((prev) => ({ ...prev, [key]: !isOpen(key, stepCount) }));
  };

  if (!visible.length && !active && !verified) return null;

  const currentPhase = active
    ? phaseFor(visible[visible.length - 1] ?? "Execute & Trace")
    : verified
      ? WORKFLOW[5]
      : phaseFor(visible[visible.length - 1] ?? "Execute & Trace");

  return (
    <div className={compact ? "mt-2" : "mt-3"} aria-live="polite">
      <div className="boss-activity-surface rounded-xl border border-zinc-800/80 bg-zinc-950/55 px-3 py-2.5 shadow-inner">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-[11px] text-zinc-400">
            <span className="shrink-0" aria-hidden="true">{currentPhase.icon}</span>
            <span className="truncate font-medium text-zinc-100">
              {active ? currentPhase.label : verified ? "Verify & Publish · ตรวจสอบแล้ว" : "Workflow Trace"}
            </span>
          </div>
          <span className="shrink-0 text-[10px] text-zinc-500">
            {active ? "กำลังทำงาน" : verified ? "เสร็จสิ้น" : `${visible.length} ขั้น`}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {WORKFLOW.map((phase) => {
            const done = phases.some((entry) => entry.phase.key === phase.key);
            const current = active && currentPhase.key === phase.key;
            const finalDone = verified && phase.key === "verify";
            return (
              <span
                key={phase.key}
                className={[
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] transition",
                  current
                    ? "border-primary/40 bg-primary/15 text-zinc-50"
                    : done || finalDone
                      ? "border-zinc-700 bg-zinc-900/70 text-zinc-300"
                      : "border-zinc-900 bg-zinc-950/40 text-zinc-600",
                ].join(" ")}
              >
                <span aria-hidden="true">{phase.icon}</span>
                {phase.label}
              </span>
            );
          })}
        </div>

        <div className="mt-2 space-y-1">
          {phases.map(({ phase, steps: phaseSteps }) => {
            const expanded = isOpen(phase.key, phaseSteps.length) || (active && phase.key === currentPhase.key);
            const show = expanded ? phaseSteps : phaseSteps.slice(-1);
            return (
              <div key={phase.key} className="rounded-lg border border-zinc-900/80 bg-zinc-950/40">
                <button
                  type="button"
                  onClick={() => toggle(phase.key, phaseSteps.length)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] text-zinc-300 hover:bg-zinc-900/60"
                  aria-expanded={expanded}
                >
                  {expanded ? (
                    <ChevronDown className="size-3.5 shrink-0 text-zinc-500" />
                  ) : (
                    <ChevronRight className="size-3.5 shrink-0 text-zinc-500" />
                  )}
                  <span aria-hidden="true">{phase.icon}</span>
                  <span className="font-medium text-zinc-200">{phase.label}</span>
                  <span className="ml-auto text-[10px] text-zinc-500">{phaseSteps.length}</span>
                </button>
                {expanded && (
                  <div className="space-y-1 border-t border-zinc-900 px-2 py-1.5">
                    {show.map((step, index) => (
                      <div
                        key={`${phase.key}-${index}-${step.slice(0, 24)}`}
                        className="boss-activity-row flex items-start gap-2 text-[11px] leading-5 text-zinc-400"
                      >
                        <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-zinc-800 bg-zinc-900 text-[9px] text-zinc-500">
                          {iconFor(step)}
                        </span>
                        <span
                          className={
                            "min-w-0 break-words " +
                            (active && phase.key === currentPhase.key && index === show.length - 1
                              ? "text-zinc-100"
                              : "")
                          }
                        >
                          {cleanStep(step)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
