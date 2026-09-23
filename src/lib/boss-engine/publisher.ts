/**
 * PHASE 4 — Publisher / Preview
 * Publish → HTTP Verify → Runtime Verify → Project Binding → Auto Update
 */

export type PublishProvider = "puter" | "vercel" | "netlify" | "render" | "unknown";

export type PublishResult = {
  ok: boolean;
  provider: PublishProvider;
  url?: string;
  commit?: string;
  detail: string;
  at: number;
};

export type HttpVerifyResult = {
  ok: boolean;
  status: number;
  url: string;
  latencyMs?: number;
  detail: string;
};

export type RuntimeVerifyResult = {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail: string }>;
  detail: string;
};

export type PreviewBinding = {
  projectId: string;
  threadId?: string;
  url: string;
  provider: PublishProvider;
  lastCommit?: string;
  verified: boolean;
  updatedAt: number;
};

const bindings = new Map<string, PreviewBinding>();

export function bindPreview(b: Omit<PreviewBinding, "updatedAt">): PreviewBinding {
  const full: PreviewBinding = { ...b, updatedAt: Date.now() };
  bindings.set(b.projectId, full);
  if (b.threadId) bindings.set(`thread:${b.threadId}`, full);
  return full;
}

export function getPreviewBinding(projectOrThread: string): PreviewBinding | null {
  return bindings.get(projectOrThread) ?? bindings.get(`thread:${projectOrThread}`) ?? null;
}

/** Evaluate HTTP response for preview health. */
export function evaluateHttp(status: number, url: string, latencyMs?: number): HttpVerifyResult {
  const ok = status >= 200 && status < 400;
  return {
    ok,
    status,
    url,
    latencyMs,
    detail: ok ? `HTTP ${status} OK${latencyMs != null ? ` (${Math.round(latencyMs)}ms)` : ""}` : `HTTP ${status} unhealthy`,
  };
}

/** Lightweight runtime checks from HTML body (no browser). */
export function evaluateRuntimeFromHtml(html: string, url: string): RuntimeVerifyResult {
  const checks: RuntimeVerifyResult["checks"] = [];
  const hasRoot = /<div[^>]+id=["'](?:root|app|__next)["']/i.test(html) || /<body/i.test(html);
  checks.push({ name: "html_shell", ok: hasRoot, detail: hasRoot ? "document shell present" : "missing root/body" });

  const hasScript = /<script/i.test(html);
  checks.push({ name: "scripts", ok: hasScript, detail: hasScript ? "script tags present" : "no scripts" });

  const looksError =
    /Application error|Internal Server Error|Cannot GET|This page could not be found|502 Bad Gateway|503 Service/i.test(
      html,
    );
  checks.push({ name: "no_error_page", ok: !looksError, detail: looksError ? "error page detected in HTML" : "no obvious error page" });

  const ok = checks.every((c) => c.ok);
  return {
    ok,
    checks,
    detail: ok ? `Runtime HTML checks passed for ${url}` : `Runtime HTML checks failed for ${url}`,
  };
}

export function recordPublish(result: PublishResult, projectId: string, threadId?: string): PreviewBinding | null {
  if (!result.ok || !result.url) return null;
  return bindPreview({
    projectId,
    threadId,
    url: result.url,
    provider: result.provider,
    lastCommit: result.commit,
    verified: false,
  });
}

export function markPreviewVerified(projectId: string, verified: boolean): PreviewBinding | null {
  const b = bindings.get(projectId);
  if (!b) return null;
  const next = { ...b, verified, updatedAt: Date.now() };
  bindings.set(projectId, next);
  if (b.threadId) bindings.set(`thread:${b.threadId}`, next);
  return next;
}

/** Auto-update: after code change, expect re-publish then re-verify. */
export function needsPreviewRefresh(binding: PreviewBinding | null, currentCommit?: string): boolean {
  if (!binding) return true;
  if (!binding.verified) return true;
  if (currentCommit && binding.lastCommit && currentCommit !== binding.lastCommit) return true;
  return false;
}
