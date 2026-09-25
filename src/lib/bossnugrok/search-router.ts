export type SearchEngine = "google";

export interface SearchOptions {
  engine?: SearchEngine;
  maxResults?: number;
}

export interface SearchResult {
  engine: "google";
  query: string;
  results: Array<{ title: string; url: string; snippet: string }>;
}

/**
 * Google-first search.
 *
 * Uses Google's Custom Search JSON API server-side so the agent gets real
 * Google web results without exposing credentials to the browser.
 *
 * Required server env:
 *   GOOGLE_API_KEY
 *   GOOGLE_CSE_ID (or GOOGLE_SEARCH_ENGINE_ID)
 */
export function getSearchEngine(): SearchEngine {
  return "google";
}

export function setSearchEngine(_engine: SearchEngine) {
  // Google is intentionally the only search provider.
}

export async function searchWeb(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const maxResults = Math.min(Math.max(options.maxResults || 5, 1), 10);
  return searchGoogle(query, maxResults);
}

async function searchGoogle(query: string, maxResults: number): Promise<SearchResult> {
  const apiKey = typeof process !== "undefined" ? process.env.GOOGLE_API_KEY : undefined;
  const cx =
    typeof process !== "undefined"
      ? process.env.GOOGLE_CSE_ID || process.env.GOOGLE_SEARCH_ENGINE_ID
      : undefined;

  if (!apiKey || !cx) {
    throw new Error(
      "Google Search ยังไม่ได้ตั้งค่า: ต้องมี GOOGLE_API_KEY และ GOOGLE_CSE_ID (หรือ GOOGLE_SEARCH_ENGINE_ID) ใน server environment",
    );
  }

  const url =
    "https://www.googleapis.com/customsearch/v1?key=" +
    encodeURIComponent(apiKey) +
    "&cx=" +
    encodeURIComponent(cx) +
    "&q=" +
    encodeURIComponent(query) +
    "&num=" +
    String(maxResults);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error("Google Search HTTP " + res.status + (body ? ": " + body.slice(0, 240) : ""));
  }

  const data = (await res.json()) as {
    items?: Array<{ title?: string; link?: string; snippet?: string }>;
  };

  return {
    engine: "google",
    query,
    results: (data.items || [])
      .filter((item) => item.link)
      .map((item) => ({
        title: item.title || "",
        url: item.link || "",
        snippet: item.snippet || "",
      })),
  };
}
