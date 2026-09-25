import { chromium } from "playwright";

export type ServerBrowserSandboxResult = {
  ok: boolean;
  runtime: "playwright-browser-sandbox";
  durationMs: number;
  evidence: string[];
  snapshot?: { title: string; bodyTextLength: number; bodyChildren: number; readyState: string };
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  error?: string;
};

export async function runServerBrowserSandbox(html: string, timeoutMs = 8000): Promise<ServerBrowserSandboxResult> {
  const startedAt = Date.now();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    const context = await browser.newContext({ offline: true, serviceWorkers: "block" });
    const page = await context.newPage();
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 500)); });
    page.on("pageerror", (e) => pageErrors.push(String(e.message || e).slice(0, 500)));
    page.on("requestfailed", (r) => failedRequests.push(`${r.url().slice(0, 300)}: ${r.failure()?.errorText || "request failed"}`));
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForTimeout(150);
    const snapshot = await page.evaluate(() => ({
      title: document.title,
      bodyTextLength: document.body?.innerText?.length ?? 0,
      bodyChildren: document.body?.children.length ?? 0,
      readyState: document.readyState,
    }));
    const ok = pageErrors.length === 0 && consoleErrors.length === 0 && snapshot.readyState === "complete" && snapshot.bodyChildren > 0;
    return {
      ok,
      runtime: "playwright-browser-sandbox",
      durationMs: Date.now() - startedAt,
      evidence: ["browser_started", "html_loaded", snapshot.readyState === "complete" ? "document_complete" : "document_not_complete", snapshot.bodyChildren > 0 ? "dom_present" : "dom_empty", consoleErrors.length === 0 ? "console_clean" : "console_error", pageErrors.length === 0 ? "page_error_free" : "page_error"],
      snapshot,
      consoleErrors,
      pageErrors,
      failedRequests: failedRequests.slice(0, 10),
    };
  } catch (error) {
    return { ok: false, runtime: "playwright-browser-sandbox", durationMs: Date.now() - startedAt, evidence: ["browser_execution_failed"], consoleErrors, pageErrors, failedRequests: failedRequests.slice(0, 10), error: error instanceof Error ? error.message : String(error) };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
