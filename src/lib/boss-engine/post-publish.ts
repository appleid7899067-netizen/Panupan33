/**
 * After puter_hosting_create (or any deploy tool), auto-suggest verify chain.
 */

import { verifyPublishedUrl, type PublishChainResult } from "./publisher-runner";
import type { PublishProvider } from "./publisher";

export function extractPublishUrl(toolResult: unknown): string | null {
  if (!toolResult || typeof toolResult !== "object") {
    if (typeof toolResult === "string" && /^https:\/\//i.test(toolResult.trim())) return toolResult.trim();
    return null;
  }
  const rec = toolResult as Record<string, unknown>;
  for (const key of ["url", "publicUrl", "siteUrl", "href", "finalUrl", "hostingUrl"]) {
    const v = rec[key];
    if (typeof v === "string" && /^https:\/\//i.test(v)) return v;
  }
  // nested
  for (const nested of [rec.result, rec.data, rec.site]) {
    const u = extractPublishUrl(nested);
    if (u) return u;
  }
  return null;
}

export function isPublishTool(name: string): boolean {
  return /hosting_create|deploy|publish|vercel|netlify|render/i.test(name);
}

export async function autoVerifyAfterPublish(
  toolName: string,
  toolResult: unknown,
  opts?: { projectId?: string; threadId?: string; provider?: PublishProvider },
): Promise<PublishChainResult | null> {
  if (!isPublishTool(toolName)) return null;
  const url = extractPublishUrl(toolResult);
  if (!url) return null;
  return verifyPublishedUrl(url, {
    projectId: opts?.projectId ?? "default",
    threadId: opts?.threadId,
    provider: opts?.provider ?? (toolName.includes("puter") ? "puter" : "unknown"),
  });
}
