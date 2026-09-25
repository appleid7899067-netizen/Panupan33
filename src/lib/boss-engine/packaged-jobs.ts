export type PackagedJobKind = "inbox" | "invoice" | "expense" | "bug" | "intel" | "sales" | "talent" | "account";
export type PackagedJob = { kind: PackagedJobKind; goal: string; steps: string[] };
const STEPS: Record<PackagedJobKind, string[]> = {
  inbox: ["collect", "classify", "draft", "verify"],
  invoice: ["collect", "extract", "validate", "report"],
  expense: ["collect", "categorize", "validate", "report"],
  bug: ["reproduce", "inspect", "patch", "verify"],
  intel: ["collect", "compare", "cite", "summarize"],
  sales: ["collect", "qualify", "draft", "review"],
  talent: ["collect", "screen", "compare", "review"],
  account: ["inspect", "validate", "change", "verify"],
};
export function matchPackagedJob(text: string): PackagedJob | null {
  const t = text.toLowerCase();
  const kind = (Object.keys(STEPS) as PackagedJobKind[]).find((k) => t.includes(k) || (k === "bug" && /bug|error|debug|บั๊ก/.test(t)));
  return kind ? { kind, goal: text, steps: [...STEPS[kind]] } : null;
}
