import { searchWeb, type SearchEngine } from "../search-router";

export interface SearchArgs {
  query: string;
  depth?: "quick" | "normal" | "deep";
  engine?: SearchEngine;
}

export interface WebSearchResult {
  ok: boolean;
  data?: {
    query: string;
    engine: string;
    results: Array<{ title: string; url: string; snippet: string }>;
    summary: string;
    duration: number;
  };
  error?: string;
  duration: number;
}

export type WebSearchStream = (chunk: string) => void;

export async function executeWebSearch(
  args: SearchArgs,
  onStream?: WebSearchStream,
  summarize?: (prompt: string) => Promise<string>,
): Promise<WebSearchResult> {
  const start = Date.now();

  try {
    const query = args.query.trim();
    if (!query) throw new Error("ต้องระบุคำค้นหา");

    onStream?.("🌐 ค้นหา: " + query + "\n");
    onStream?.("📡 Search engine: " + (args.engine || "google") + "\n\n");

    const search = await searchWeb(query, {
      engine: args.engine,
      maxResults: args.depth === "deep" ? 10 : 5,
    });

    onStream?.("✅ เจอ " + search.results.length + " ผลลัพธ์\n");
    search.results.forEach((result, index) => {
      onStream?.("  " + (index + 1) + ". " + result.title + "\n     " + result.url + "\n");
    });

    const combined = search.results
      .map((result, index) => "[" + (index + 1) + "] " + result.title + "\n" + result.snippet + "\n" + result.url)
      .join("\n\n");

    let summary = combined || "ไม่พบผลการค้นหา";

    if (summarize && combined) {
      summary = await summarize(
        "สรุปข้อมูลต่อไปนี้เป็นภาษาไทย\n\nคำถาม: " + query + "\n\n" + combined,
      );
    }

    onStream?.("\n🤖 สรุปผล:\n" + summary + "\n");

    const duration = Date.now() - start;
    onStream?.("\n✅ เสร็จสิ้น (" + duration + "ms) · " + search.engine + "\n");

    return {
      ok: true,
      data: { query, engine: search.engine, results: search.results, summary, duration },
      duration,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onStream?.("\n❌ " + message + "\n");
    return { ok: false, error: message, duration: Date.now() - start };
  }
}
