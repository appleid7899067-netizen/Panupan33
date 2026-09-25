/**
 * Packaged coworker jobs (Grok Bot-style workflows).
 * Each job is a plan template + required tool lanes — not a fake "done" claim.
 */

import type { ToolLane } from "./coworker-pipeline";

export type PackagedJobId =
  | "inbox_manager"
  | "invoice_collector"
  | "expense_manager"
  | "bug_reproduction"
  | "competitive_intel"
  | "sales_outbound"
  | "talent_scout"
  | "account_health";

export type PackagedJob = {
  id: PackagedJobId;
  name: string;
  description: string;
  steps: string[];
  requiredLanes: ToolLane[];
  requiresApprove: boolean;
  triggers: string[];
};

export const PACKAGED_JOBS: readonly PackagedJob[] = [
  {
    id: "inbox_manager",
    name: "Inbox Manager",
    description: "Triage email, flag urgent, draft replies — never send without approve",
    steps: ["list unread", "classify urgency", "draft replies", "pause for approve before send"],
    requiredLanes: ["apis", "web"],
    requiresApprove: true,
    triggers: ["inbox", "email", "จดหมาย", "กล่องจดหมาย"],
  },
  {
    id: "invoice_collector",
    name: "Invoice Collector",
    description: "Pull invoices from vendor portals and park for review",
    steps: ["open portal connector", "download invoices", "normalize files", "park artifact"],
    requiredLanes: ["browser", "files", "cloud_computer"],
    requiresApprove: true,
    triggers: ["invoice", "ใบแจ้งหนี้", "บิล"],
  },
  {
    id: "expense_manager",
    name: "Expense Manager",
    description: "Pull receipts, code expenses, chase missing items",
    steps: ["collect receipts", "code categories", "flag missing", "summary report"],
    requiredLanes: ["files", "apis", "browser"],
    requiresApprove: true,
    triggers: ["expense", "receipt", "ค่าใช้จ่าย", "ใบเสร็จ"],
  },
  {
    id: "bug_reproduction",
    name: "Bug Reproduction",
    description: "Recreate issue in sandbox and hand eng a clean write-up",
    steps: ["read report", "repro in sandbox", "capture logs", "write eng brief"],
    requiredLanes: ["cloud_computer", "files"],
    requiresApprove: false,
    triggers: ["bug", "repro", "reproduce", "บั๊ก", "ทำซ้ำ"],
  },
  {
    id: "competitive_intel",
    name: "Competitive Intelligence",
    description: "Watch launches and messaging changes",
    steps: ["list targets", "web scan", "diff messaging", "overnight digest"],
    requiredLanes: ["web", "files"],
    requiresApprove: false,
    triggers: ["competitor", "intel", "คู่แข่ง", "competitive"],
  },
  {
    id: "sales_outbound",
    name: "Sales Outbound",
    description: "Research, outreach drafts, CRM notes — queue only after approve",
    steps: ["research account", "draft outreach", "CRM note", "approve gate"],
    requiredLanes: ["web", "apis"],
    requiresApprove: true,
    triggers: ["outbound", "sales", "cold email", "ขาย"],
  },
  {
    id: "talent_scout",
    name: "Talent Scout",
    description: "Source candidates, skip ATS hits, draft LinkedIn in user voice",
    steps: ["define role", "source", "ATS skip", "draft message", "approve"],
    requiredLanes: ["web", "apis"],
    requiresApprove: true,
    triggers: ["recruit", "talent", "candidate", "สรรหา"],
  },
  {
    id: "account_health",
    name: "Account Health",
    description: "Digests, risk flags, next-step drafts",
    steps: ["pull account signals", "risk score", "draft next steps"],
    requiredLanes: ["apis", "web"],
    requiresApprove: false,
    triggers: ["account health", "churn", "สุขภาพบัญชี"],
  },
] as const;

export function matchPackagedJob(text: string): PackagedJob | null {
  const lower = text.toLowerCase();
  for (const job of PACKAGED_JOBS) {
    if (job.triggers.some((t) => lower.includes(t.toLowerCase()))) return job;
  }
  return null;
}

export function packagedJobPrompt(job: PackagedJob): string {
  return [
    `# Packaged job: ${job.name} (${job.id})`,
    job.description,
    "Steps:",
    ...job.steps.map((s, i) => `${i + 1}. ${s}`),
    job.requiresApprove ? "APPROVE GATE: do not send/commit external side-effects without user approval." : "",
    `Preferred tool lanes: ${job.requiredLanes.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}
