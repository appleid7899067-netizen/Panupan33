import { ensurePuter, extractText } from "@/lib/puter";
// FILE CORRUPTED DURING FIX - RESTORE IN PROGRESS
// See commit before f88c572 for full content
export type CodingFleetTool = any;
export type ToolExecutionResult = { name: string; ok: boolean; result?: unknown; error?: unknown };
export async function loadCodingFleetTools(): Promise<CodingFleetTool[]> { return []; }
export async function callWithFallback(): Promise<{ ok: boolean; text: string; toolCalls: any[]; toolResults: ToolExecutionResult[]; error?: string }> {
  return { ok: false, text: "", toolCalls: [], toolResults: [], error: "puter-tool-loader temporarily reduced; restore full file" };
}
export async function executeTool(): Promise<unknown> { throw new Error("restore puter-tool-loader"); }
