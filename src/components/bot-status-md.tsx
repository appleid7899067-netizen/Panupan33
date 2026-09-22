/**
 * Bot Status — แสดงสถานะการทำงานของบอทแบบข้อความ Markdown + HTML
 * อ่านง่าย สวย และรองรับ live streaming
 */

import { CheckCircle2, Circle, Loader2, XCircle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepStatus = "pending" | "running" | "done" | "error";

export type StatusStep = {
  phase: string;
  detail?: string;
  status: StepStatus;
};

const PHASES = ["วิเคราะห์", "เลือกเครื่องมือ", "ลงมือทำ", "ตรวจสอบ"] as const;

function inferPhaseStatus(
  phase: string,
  steps: string[],
  active: boolean,
  verified?: boolean,
): StepStatus {
  const lower = phase.toLowerCase();
  const matched = steps.filter((s) => s.toLowerCase().includes(lower));
  if (matched.some((s) => /error|fail|ไม่สำเร็จ|ล้มเหลว/i.test(s))) return "error";
  if (matched.length > 0) {
    // ถ้ายัง streaming และเป็น phase ล่าสุดที่เจอ → running
    const last = steps[steps.length - 1] ?? "";
    if (active && last.toLowerCase().includes(lower)) return "running";
    return "done";
  }
  // heuristic ตามลำดับ
  const idx = PHASES.indexOf(phase as (typeof PHASES)[number]);
  if (idx === -1) return "pending";
  if (verified && idx <= 3) return "done";
  if (!active && steps.length > 0 && idx < Math.min(steps.length, 3)) return "done";
  return "pending";
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "done") return <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />;
  if (status === "running") return <Loader2 className="size-3.5 text-sky-400 animate-spin shrink-0" />;
  if (status === "error") return <XCircle className="size-3.5 text-red-400 shrink-0" />;
  return <Circle className="size-3.5 text-zinc-600 shrink-0" />;
}

function statusLabel(status: StepStatus): string {
  switch (status) {
    case "done":
      return "เสร็จ";
    case "running":
      return "กำลังทำ";
    case "error":
      return "ผิดพลาด";
    default:
      return "รอ";
  }
}

export function buildStatusMarkdown(
  steps: string[],
  opts: { active?: boolean; verified?: boolean } = {},
): string {
  const { active = false, verified = false } = opts;
  const header = active
    ? "> **สถานะ:** กำลังทำงาน · streaming"
    : verified
      ? "> **สถานะ:** เสร็จสิ้น · verified"
      : "> **สถานะ:** เก็บ trace ไว้ตรวจย้อนหลัง";

  const rows = PHASES.map((phase) => {
    const st = inferPhaseStatus(phase, steps, active, verified);
    const icon = { pending: "⏳", running: "🔄", done: "✅", error: "❌" }[st];
    const detail =
      steps
        .filter((s) => s.toLowerCase().includes(phase.toLowerCase()))
        .map((s) => s.split(": ").slice(1).join(": ") || s)
        .pop() || "—";
    return `| ${phase} | ${icon} ${statusLabel(st)} | ${detail} |`;
  });

  const liveLines =
    steps.length > 0
      ? ["", "**Live steps**", ...steps.slice(-8).map((s) => `- \`${s}\``)]
      : [];

  return [
    "### 🤖 Boss Status",
    header,
    "",
    "| ขั้น | สถานะ | รายละเอียด |",
    "|------|--------|-------------|",
    ...rows,
    ...liveLines,
  ].join("\n");
}

type BotStatusMdProps = {
  steps: string[];
  active?: boolean;
  verified?: boolean;
  open?: boolean;
  onToggle?: () => void;
  className?: string;
};

/**
 * แสดงสถานะแบบข้อความ Markdown + HTML (ไม่ใช้ table จริง เพื่อให้สวยและ responsive)
 */
export function BotStatusMd({
  steps,
  active = false,
  verified = false,
  open = true,
  onToggle,
  className,
}: BotStatusMdProps) {
  const badge = active ? "streaming" : verified ? "verified" : "trace";

  return (
    <div className={cn("mt-4 border-t border-zinc-800/80 pt-3 text-[12px]", className)}>
      <button
        type="button"
        onClick={onToggle}
        className="mb-3 flex w-full items-center gap-2 text-left text-zinc-300"
      >
        <span className="relative grid size-5 place-items-center rounded-md bg-emerald-500/10 text-emerald-400">
          <Activity className="size-3.5" />
          {active && (
            <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </span>
        <span className="font-medium">Boss Status</span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] uppercase tracking-widest",
            active
              ? "bg-sky-500/15 text-sky-400"
              : verified
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-zinc-800 text-zinc-500",
          )}
        >
          {badge}
        </span>
        <span className="ml-auto text-[10px] text-zinc-600">{open ? "▼" : "▶"}</span>
      </button>

      {open && (
        <div className="space-y-3">
          {/* Markdown-style blockquote status */}
          <blockquote className="border-l-2 border-emerald-500/40 pl-3 text-zinc-400">
            <strong className="text-zinc-200">สถานะ:</strong>{" "}
            {active
              ? "กำลังทำงาน · streaming"
              : verified
                ? "เสร็จสิ้น · verified"
                : "เก็บ execution trace ไว้ตรวจย้อนหลัง"}
          </blockquote>

          {/* Task plan — text rows เหมือน Markdown table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 font-mono">
            <div className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
              ### Task plan
            </div>
            <div className="space-y-1">
              {/* header row */}
              <div className="grid grid-cols-[1fr_72px_1fr] gap-2 border-b border-zinc-800 pb-1 text-[10px] text-zinc-600">
                <span>ขั้น</span>
                <span>สถานะ</span>
                <span>รายละเอียด</span>
              </div>
              {PHASES.map((phase) => {
                const st = inferPhaseStatus(phase, steps, active, verified);
                const detail =
                  steps
                    .filter((s) => s.toLowerCase().includes(phase.toLowerCase()))
                    .map((s) => s.split(": ").slice(1).join(": ") || s)
                    .pop() || "—";
                return (
                  <div
                    key={phase}
                    className={cn(
                      "grid grid-cols-[1fr_72px_1fr] gap-2 rounded-md px-1 py-1.5 items-center",
                      st === "running" && "bg-sky-500/10 text-zinc-100",
                      st === "done" && "text-zinc-300",
                      st === "error" && "bg-red-500/10 text-red-200",
                      st === "pending" && "text-zinc-600",
                    )}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <StatusIcon status={st} />
                      {phase}
                    </span>
                    <span className="text-[11px]">{statusLabel(st)}</span>
                    <span className="truncate text-[11px] text-zinc-500">{detail}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live steps — Markdown list style */}
          {steps.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                  ** Live steps **
                </span>
                <span className="text-[10px] text-zinc-600">{steps.length} events</span>
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                {steps.slice(-8).map((a, i, arr) => {
                  const isLast = i === arr.length - 1;
                  const parts = a.split(": ");
                  const phase = parts[0] ?? "";
                  const detail = parts.slice(1).join(": ");
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2 rounded-md px-1.5 py-1",
                        isLast && active
                          ? "bg-zinc-900 text-zinc-100"
                          : isLast
                            ? "text-zinc-200"
                            : "text-zinc-500",
                      )}
                    >
                      <span className="select-none shrink-0">
                        {isLast && active ? "›" : "✓"}
                      </span>
                      <span className="min-w-0 break-words">
                        <code className="rounded bg-zinc-900/80 px-1 text-zinc-400">{phase}</code>
                        {detail ? <span className="text-zinc-500"> · {detail}</span> : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 text-[10px] text-zinc-600">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  active
                    ? "bg-emerald-400 animate-pulse"
                    : verified
                      ? "bg-emerald-400"
                      : "bg-zinc-600",
                )}
              />
              <span>
                {active
                  ? "ติดตามแบบเรียลไทม์ · ไม่เลื่อนหน้าจอผู้ใช้เอง"
                  : verified
                    ? "ตรวจสอบแล้วจาก Agent"
                    : "เก็บ execution trace ไว้ตรวจย้อนหลัง"}
              </span>
            </div>
            {verified && (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="size-3" /> verified
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
