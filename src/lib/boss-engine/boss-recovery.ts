/**
 * Recovery Loop Engine
 * Error → Diagnose → Root cause → Change strategy → Fix → Run → Verify
 * ไม่ซ้ำ tool เดิมแบบตาบอด
 */

export type RecoveryPhase =
  | "idle"
  | "diagnose"
  | "root_cause"
  | "change_strategy"
  | "fix"
  | "run"
  | "verify"
  | "escalated"
  | "resolved";

export type RecoveryAttempt = {
  id: string;
  toolName: string;
  error: string;
  diagnosis: string;
  strategy: string;
  phase: RecoveryPhase;
  at: number;
  resolved?: boolean;
};

export type RecoveryDecision = {
  phase: RecoveryPhase;
  instruction: string;
  avoidTools: string[];
  preferCapabilities: string[];
  shouldEscalate: boolean;
};

function uid(): string {
  return `rec_${Math.random().toString(36).slice(2, 10)}`;
}

export function diagnoseError(toolName: string, errorText: string): string {
  const text = errorText.toLowerCase();
  if (/502|bad gateway/.test(text)) return `upstream/deployment gateway failure (HTTP 502) from ${toolName}`;
  if (/503|service unavailable/.test(text)) return `service unavailable or unhealthy deployment from ${toolName}`;
  if (/timeout|timed out|etimedout|econnreset|socket hang up/.test(text)) return `network/service timeout from ${toolName}`;
  if (/401|unauthorized|authentication|token|api key/.test(text)) return `authentication/credential failure from ${toolName}`;
  if (/403|forbidden|permission|access denied/.test(text)) return `permission/access failure from ${toolName}`;
  if (/404|not found|module not found/.test(text)) return `missing route/resource/module from ${toolName}`;
  if (/eaddrinuse|address already in use|port/.test(text)) return `port/process conflict from ${toolName}`;
  if (/typescript|ts\d+|type error/.test(text)) return `TypeScript/type-check failure from ${toolName}`;
  if (/eslint|lint/.test(text)) return `lint/style-check failure from ${toolName}`;
  if (/npm err|pnpm|yarn|package|dependency|cannot find module/.test(text)) return `dependency/package resolution failure from ${toolName}`;
  if (/referenceerror|typeerror|cannot read propert|undefined is not/.test(text)) return `runtime JavaScript error from ${toolName}`;
  if (/syntaxerror|parse error|unexpected token/.test(text)) return `syntax/parse failure from ${toolName}`;
  return `inspect concrete error from ${toolName}; do not guess`;
}

function strategyFor(diagnosis: string, toolName: string, failCount: number): string {
  const d = diagnosis.toLowerCase();
  if (failCount >= 3) return `Escalate: stop repeating ${toolName}. Switch capability or report blocker with evidence.`;
  if (/502|503|timeout|gateway|unavailable/.test(d)) return "Re-check health with web_check after short wait; if deploy related, re-verify latest commit is live.";
  if (/auth|token|401|403/.test(d)) return "Do not retry same call blindly. Check credentials / scope; use alternative authenticated path if available.";
  if (/module not found|dependency|npm|package/.test(d)) return "Inspect package.json; install missing dep once; re-run sandbox build/test.";
  if (/typescript|type-check|lint/.test(d)) return "Open the failing file, fix the specific type/lint error, re-run typecheck only.";
  if (/runtime javascript|referenceerror|typeerror/.test(d)) return "Locate stack frame, patch the null/undefined path, re-run the same test.";
  if (/port|eaddrinuse/.test(d)) return "Kill conflicting process or change port; restart sandbox cleanly.";
  if (/404|not found/.test(d)) return "Confirm path/route exists; read file tree before rewriting.";
  return `Change approach for ${toolName}: gather more evidence, try a different tool in the same capability group, then re-verify.`;
}

export class RecoveryEngine {
  private attempts: RecoveryAttempt[] = [];
  private failureCounts = new Map<string, number>();

  recordFailure(toolName: string, error: string): RecoveryAttempt {
    const count = (this.failureCounts.get(toolName) ?? 0) + 1;
    this.failureCounts.set(toolName, count);
    const diagnosis = diagnoseError(toolName, error);
    const strategy = strategyFor(diagnosis, toolName, count);
    const attempt: RecoveryAttempt = {
      id: uid(),
      toolName,
      error: error.slice(0, 1500),
      diagnosis,
      strategy,
      phase: "diagnose",
      at: Date.now(),
    };
    this.attempts.push(attempt);
    return attempt;
  }

  markResolved(toolName: string): void {
    this.failureCounts.delete(toolName);
    for (const a of this.attempts) {
      if (a.toolName === toolName && !a.resolved) a.resolved = true;
    }
  }

  failureCount(toolName: string): number {
    return this.failureCounts.get(toolName) ?? 0;
  }

  repeatedTools(min = 2): string[] {
    return Array.from(this.failureCounts.entries())
      .filter(([, c]) => c >= min)
      .map(([name]) => name);
  }

  decide(): RecoveryDecision {
    const repeated = this.repeatedTools(2);
    const last = this.attempts[this.attempts.length - 1];
    if (!last) {
      return {
        phase: "idle",
        instruction: "",
        avoidTools: [],
        preferCapabilities: [],
        shouldEscalate: false,
      };
    }

    const count = this.failureCount(last.toolName);
    if (count >= 3 || repeated.length >= 2) {
      return {
        phase: "escalated",
        instruction: `RECOVERY ESCALATION: Tools failing repeatedly: ${repeated.join(", ") || last.toolName}. Do NOT call the same failing tool again. Diagnose from evidence, switch strategy/capability, or report blocker with concrete error. Last diagnosis: ${last.diagnosis}. Strategy: ${last.strategy}`,
        avoidTools: repeated.length ? repeated : [last.toolName],
        preferCapabilities: [],
        shouldEscalate: true,
      };
    }

    return {
      phase: "change_strategy",
      instruction: `RECOVERY LOOP:
1. DIAGNOSE: ${last.diagnosis}
2. ROOT CAUSE: use only observed error text, do not invent causes
3. CHANGE STRATEGY: ${last.strategy}
4. FIX the smallest cause
5. RUN the relevant check again
6. VERIFY with real tool output before claiming success
Avoid blindly repeating: ${last.toolName} (failures so far: ${count}).`,
      avoidTools: count >= 2 ? [last.toolName] : [],
      preferCapabilities: [],
      shouldEscalate: false,
    };
  }

  detectLoop(recentToolNames: string[]): boolean {
    if (recentToolNames.length < 3) return false;
    const last3 = recentToolNames.slice(-3);
    return last3.every((n) => n === last3[0]);
  }

  summary(): string {
    if (!this.attempts.length) return "No recovery attempts";
    return this.attempts
      .slice(-5)
      .map((a) => `• ${a.toolName}: ${a.diagnosis} → ${a.strategy.slice(0, 100)}${a.resolved ? " [resolved]" : ""}`)
      .join("\n");
  }
}

export function createRecoveryEngine(): RecoveryEngine {
  return new RecoveryEngine();
}
