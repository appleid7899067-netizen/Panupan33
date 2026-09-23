/**
 * Evidence Engine
 * รู้ว่าหลักฐานเพียงพอแล้ว, หยุด tool อัตโนมัติ, ไม่เรียก web_check ซ้ำ, แยก ตรวจแล้ว vs ยังไม่ตรวจ
 */

export type EvidenceKind =
  | "http_ok"
  | "sandbox_ok"
  | "build_ok"
  | "ci_ok"
  | "deploy_ok"
  | "file_mutated"
  | "test_ok"
  | "preview_ok"
  | "other";

export type EvidenceItem = {
  id: string;
  kind: EvidenceKind;
  source: string;
  summary: string;
  raw?: unknown;
  at: number;
  fingerprint: string;
};

export type EvidenceGateResult = {
  sufficient: boolean;
  missing: string[];
  items: EvidenceItem[];
  reason: string;
};

function uid(): string {
  return `ev_${Math.random().toString(36).slice(2, 10)}`;
}

function fingerprintOf(kind: EvidenceKind, source: string, summary: string): string {
  return `${kind}|${source}|${summary.slice(0, 120)}`.toLowerCase();
}

export class EvidenceEngine {
  private items: EvidenceItem[] = [];
  private seenFingerprints = new Set<string>();

  add(kind: EvidenceKind, source: string, summary: string, raw?: unknown): boolean {
    const fp = fingerprintOf(kind, source, summary);
    if (this.seenFingerprints.has(fp)) return false;
    this.seenFingerprints.add(fp);
    this.items.push({
      id: uid(),
      kind,
      source,
      summary: summary.slice(0, 1500),
      raw,
      at: Date.now(),
      fingerprint: fp,
    });
    return true;
  }

  hasKind(kind: EvidenceKind): boolean {
    return this.items.some((i) => i.kind === kind);
  }

  hasSource(source: string): boolean {
    return this.items.some((i) => i.source === source);
  }

  alreadyChecked(kind: EvidenceKind, source: string, summaryHint = ""): boolean {
    const fp = fingerprintOf(kind, source, summaryHint);
    return this.seenFingerprints.has(fp) || this.items.some((i) => i.kind === kind && i.source === source);
  }

  list(): EvidenceItem[] {
    return [...this.items];
  }

  evaluate(opts: {
    mutationExpected: boolean;
    verificationRequested: boolean;
    deployRequested: boolean;
    previewRequested: boolean;
  }): EvidenceGateResult {
    const missing: string[] = [];
    const { mutationExpected, verificationRequested, deployRequested, previewRequested } = opts;

    if (mutationExpected && !this.hasKind("file_mutated") && !this.hasKind("sandbox_ok") && !this.hasKind("build_ok")) {
      missing.push("code/sandbox mutation evidence");
    }
    if ((verificationRequested || mutationExpected) && !this.hasKind("http_ok") && !this.hasKind("build_ok") && !this.hasKind("ci_ok") && !this.hasKind("test_ok") && !this.hasKind("sandbox_ok")) {
      missing.push("verification (build/test/http/ci)");
    }
    if (deployRequested && !this.hasKind("deploy_ok") && !this.hasKind("preview_ok")) {
      missing.push("deploy/preview success evidence");
    }
    if (previewRequested && !this.hasKind("preview_ok") && !this.hasKind("http_ok")) {
      missing.push("preview HTTP evidence");
    }

    const sufficient = missing.length === 0;
    return {
      sufficient,
      missing,
      items: this.list(),
      reason: sufficient
        ? `Evidence sufficient (${this.items.length} items): ${this.items.map((i) => i.kind).join(", ")}`
        : `Still missing: ${missing.join("; ")}`,
    };
  }

  ingestToolResult(name: string, ok: boolean, result: unknown): boolean {
    if (!ok) return false;
    const n = name.toLowerCase();

    if (n.includes("web_check") || n.includes("http") || n.includes("health")) {
      const rec = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
      const status = Number(rec.status ?? 0);
      if (rec.ok === true && status >= 200 && status < 300) {
        return this.add("http_ok", name, `HTTP ${status}`, result);
      }
      if (status >= 200 && status < 300) {
        return this.add("http_ok", name, `HTTP ${status}`, result);
      }
    }

    if (n.includes("sandbox")) {
      const rec = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
      if (rec.ok === true || rec.exitCode === 0) {
        return this.add("sandbox_ok", name, "sandbox exit ok", result);
      }
    }

    if (/build|typecheck|lint|test/.test(n)) {
      const rec = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
      if (rec.ok === true || rec.success === true || rec.exitCode === 0) {
        return this.add(n.includes("build") ? "build_ok" : "test_ok", name, `${name} passed`, result);
      }
    }

    if (/workflow|actions|ci/.test(n)) {
      const rec = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
      if (rec.conclusion === "success" || rec.success === true || rec.verified === true) {
        return this.add("ci_ok", name, "CI success", result);
      }
    }

    if (/deploy|vercel|netlify|railway|puter/.test(n)) {
      const rec = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
      if (rec.ok === true || rec.success === true || rec.url) {
        return this.add("deploy_ok", name, String(rec.url ?? "deploy ok"), result);
      }
    }

    if (/write|edit|patch|create.*file|update.*file/.test(n)) {
      return this.add("file_mutated", name, "file mutation recorded", result);
    }

    if (/preview/.test(n)) {
      return this.add("preview_ok", name, "preview recorded", result);
    }

    if (ok) {
      return this.add("other", name, `${name} ok`, result);
    }
    return false;
  }

  summary(): string {
    if (!this.items.length) return "ยังไม่มีหลักฐาน";
    return this.items.map((i) => `• [${i.kind}] ${i.source}: ${i.summary.slice(0, 120)}`).join("\n");
  }
}

export function createEvidenceEngine(): EvidenceEngine {
  return new EvidenceEngine();
}
