export type RetryDecision = { retry: boolean; delayMs: number; reason: string };

export function retryDecision(status: number | undefined, attempt: number, retryAfterSeconds?: number): RetryDecision {
  if (status === 404 || status === 401 || status === 403) return { retry: false, delayMs: 0, reason: "Permanent/auth failure for this route." };
  if (attempt >= 5) return { retry: false, delayMs: 0, reason: "Retry budget exhausted." };
  const transient = status === undefined || status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  if (!transient) return { retry: false, delayMs: 0, reason: "Status is not classified as transient." };
  const base = retryAfterSeconds != null ? Math.max(0, retryAfterSeconds * 1000) : Math.min(60000, 2 ** attempt * 1000);
  const jitter = Math.floor(Math.random() * 1000);
  return { retry: true, delayMs: Math.min(60000, base + jitter), reason: "Transient failure; exponential backoff with jitter." };
}
