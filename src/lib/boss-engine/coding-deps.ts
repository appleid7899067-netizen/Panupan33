/**
 * Phase 2 — Dependency Intelligence
 */

export type DepDecision = {
  action: "skip" | "add" | "update" | "conflict";
  packageName: string;
  reason: string;
  suggestedVersion?: string;
};

export type PackageLockLike = {
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
};

export function decideDependency(
  packageName: string,
  current: PackageLockLike,
  opts?: { asDev?: boolean; requiredBy?: string },
): DepDecision {
  const deps = { ...(current.dependencies || {}), ...(current.devDependencies || {}) };
  const keys = Object.keys(deps).map((k) => k.toLowerCase());
  const name = packageName.trim();
  const lower = name.toLowerCase();

  if (!name) {
    return { action: "skip", packageName: name, reason: "empty package name" };
  }

  if (keys.includes(lower) || keys.some((k) => k === lower || k.startsWith(`${lower}@`))) {
    return {
      action: "skip",
      packageName: name,
      reason: `already present in package.json — do not install again`,
    };
  }

  if (lower === "react" && keys.some((k) => k.includes("preact"))) {
    return { action: "conflict", packageName: name, reason: "project appears to use Preact; adding React may conflict" };
  }

  return {
    action: "add",
    packageName: name,
    reason: opts?.requiredBy ? `required by ${opts.requiredBy}` : "not present — safe to add",
    suggestedVersion: "latest",
  };
}

export function interpretInstallResult(stdout: string, stderr: string, exitCode: number): {
  ok: boolean;
  summary: string;
} {
  if (exitCode === 0 && !/npm err/i.test(stderr)) {
    return { ok: true, summary: "install completed (exit 0)" };
  }
  const errLine = (stderr || stdout).split("\n").find((l) => /err|error|ENOTFOUND|ERESOLVE|peer/i.test(l)) || "install failed";
  return { ok: false, summary: errLine.slice(0, 400) };
}

export function installCommand(packages: string[], asDev = false): string {
  const list = packages.filter(Boolean).join(" ");
  if (!list) return "";
  return asDev ? `npm install -D ${list}` : `npm install ${list}`;
}
