import { z } from "zod";
import { runInBrowserSandbox, type BrowserSandboxResult } from "@/lib/browser-sandbox";

export type SandboxRequest = {
  language: string;
  code: string;
  timeoutMs?: number;
};

export type SandboxResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode?: number;
  durationMs?: number;
  runtime?: BrowserSandboxResult["runtime"];
  logs?: BrowserSandboxResult["logs"];
  previewHtml?: string;
  error?: string;
};

const requestSchema = z.object({
  language: z.string().min(1).max(40),
  code: z.string().max(500_000),
  timeoutMs: z.number().int().min(100).max(120_000).optional(),
});

export async function runInSandbox(input: SandboxRequest): Promise<SandboxResult> {
  const request = requestSchema.parse(input);
  const browser = await runInBrowserSandbox(request);
  return {
    ok: browser.ok,
    stdout: browser.stdout,
    stderr: browser.stderr,
    durationMs: browser.durationMs,
    runtime: browser.runtime,
    logs: browser.logs,
    previewHtml: browser.previewHtml,
    ...(typeof browser.exitCode === "number" ? { exitCode: browser.exitCode } : {}),
    ...(browser.error ? { error: browser.error } : {}),
  };
}
