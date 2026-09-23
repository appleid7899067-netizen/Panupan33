/**
 * Phase 4 hardening — publish → HTTP → runtime verify chain
 */

import {
  bindPreview,
  evaluateHttp,
  evaluateRuntimeFromHtml,
  markPreviewVerified,
  needsPreviewRefresh,
  recordPublish,
  type PreviewBinding,
  type PublishProvider,
  type PublishResult,
} from "./publisher";

export type PublishChainResult = {
  publish?: PublishResult;
  http?: ReturnType<typeof evaluateHttp>;
  runtime?: ReturnType<typeof evaluateRuntimeFromHtml>;
  binding?: PreviewBinding | null;
  ok: boolean;
  detail: string;
};

export async function verifyPublishedUrl(
  url: string,
  opts?: {
    projectId?: string;
    threadId?: string;
    provider?: PublishProvider;
    commit?: string;
    fetchImpl?: typeof fetch;
  },
): Promise<PublishChainResult> {
  const fetchFn = opts?.fetchImpl ?? fetch;
  const started = Date.now();
  try {
    const res = await fetchFn(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/json;q=0.9,*/*;q=0.1",
        "User-Agent": "Bossnu-Preview-Verify/1.0",
      },
    });
    const latencyMs = Date.now() - started;
    const body = await res.text();
    const http = evaluateHttp(res.status, res.url || url, latencyMs);
    const runtime = evaluateRuntimeFromHtml(body, res.url || url);

    let binding: PreviewBinding | null = null;
    if (opts?.projectId) {
      recordPublish(
        {
          ok: http.ok,
          provider: opts.provider ?? "unknown",
          url: res.url || url,
          commit: opts.commit,
          detail: http.detail,
          at: Date.now(),
        },
        opts.projectId,
        opts.threadId,
      );
      binding = markPreviewVerified(opts.projectId, http.ok && runtime.ok);
    }

    const ok = http.ok && runtime.ok;
    return {
      http,
      runtime,
      binding,
      ok,
      detail: ok
        ? `Preview verified: ${http.detail}; ${runtime.detail}`
        : `Preview failed: ${http.detail}; ${runtime.detail}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      detail: `Preview fetch error: ${msg}`,
      http: evaluateHttp(0, url),
    };
  }
}

export function shouldRefreshPreview(binding: PreviewBinding | null, currentCommit?: string): boolean {
  return needsPreviewRefresh(binding, currentCommit);
}

export function bindProjectPreview(
  projectId: string,
  url: string,
  provider: PublishProvider,
  threadId?: string,
  commit?: string,
): PreviewBinding {
  return bindPreview({
    projectId,
    threadId,
    url,
    provider,
    lastCommit: commit,
    verified: false,
  });
}
