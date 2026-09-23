/**
 * Phase 2 — Diff Intelligence + Change Planning + Rollback helpers
 */

export type FileChangePlan = {
  path: string;
  action: "create" | "edit" | "delete";
  dependsOn: string[];
  reason: string;
  contentBefore?: string;
  contentAfter?: string;
};

export type ChangeSet = {
  id: string;
  goal: string;
  changes: FileChangePlan[];
  status: "planned" | "applied" | "rolled_back" | "failed";
};

function uid(): string {
  return `chg_${Math.random().toString(36).slice(2, 10)}`;
}

export function summarizeDiff(before: string, after: string, maxLines = 40): string {
  const a = before.split("\n");
  const b = after.split("\n");
  const lines: string[] = [];
  const max = Math.max(a.length, b.length);
  let added = 0;
  let removed = 0;
  for (let i = 0; i < max && lines.length < maxLines; i++) {
    if (a[i] === b[i]) continue;
    if (a[i] !== undefined && b[i] === undefined) {
      lines.push(`- ${a[i]}`);
      removed++;
    } else if (a[i] === undefined && b[i] !== undefined) {
      lines.push(`+ ${b[i]}`);
      added++;
    } else {
      lines.push(`- ${a[i]}`);
      lines.push(`+ ${b[i]}`);
      removed++;
      added++;
    }
  }
  return `Δ +${added} -${removed}\n${lines.join("\n")}`.slice(0, 4000);
}

export function planChangeOrder(paths: string[]): FileChangePlan[] {
  const score = (p: string) => {
    if (p.endsWith("package.json")) return 0;
    if (p.includes("types") || p.endsWith(".d.ts")) return 1;
    if (p.includes("/lib/") || p.includes("/utils/")) return 2;
    if (p.includes("/components/")) return 3;
    if (p.includes("/routes/") || p.includes("/pages/")) return 4;
    return 5;
  };
  const sorted = [...paths].sort((a, b) => score(a) - score(b) || a.localeCompare(b));
  const plans: FileChangePlan[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const path = sorted[i];
    const dependsOn = i > 0 && score(path) > score(sorted[i - 1]) ? [sorted[i - 1]] : [];
    plans.push({
      path,
      action: "edit",
      dependsOn,
      reason: `ordered by layer (score ${score(path)})`,
    });
  }
  return plans;
}

export function createChangeSet(goal: string, paths: string[]): ChangeSet {
  return {
    id: uid(),
    goal,
    changes: planChangeOrder(paths),
    status: "planned",
  };
}

export type RollbackSnapshot = {
  id: string;
  files: Array<{ path: string; contentBefore: string }>;
  createdAt: number;
};

export function createRollbackSnapshot(
  files: Array<{ path: string; contentBefore: string }>,
): RollbackSnapshot {
  return { id: uid(), files, createdAt: Date.now() };
}

export function rollbackInstructions(snap: RollbackSnapshot): string {
  return [
    `Rollback snapshot ${snap.id} (${snap.files.length} files)`,
    ...snap.files.map((f) => `- restore ${f.path} (${f.contentBefore.length} bytes)`),
    "Apply by writing contentBefore to each path, then re-run build/test.",
  ].join("\n");
}
