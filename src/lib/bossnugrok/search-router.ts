import { searchYandex, type YandexSearchResult } from "./yandex-client";

export type SearchEngine = "yandex" | "duckduckgo" | "brave" | "auto";

export interface SearchOptions {
  engine?: SearchEngine;
  maxResults?: number;
}

export interface SearchResult {
  engine: Exclude<SearchEngine, "auto">;
  query: string;
  results: YandexSearchResult[];
}

export function getSearchEngine(): SearchEngine {
  if (typeof window === "undefined") return "yandex";
  try {
    const value = window.localStorage.getItem("search_engine");
    if (value === "yandex" || value === "duckduckgo" || value === "brave" || value === "auto") return value;
  } catch {}
  return "yandex";
}

export function setSearchEngine(engine: SearchEngine) {
  if (typeof window !== "undefined") window.localStorage.setItem("search_engine", engine);
}

export async function searchWeb(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const engine = options.engine || getSearchEngine();
  const maxResults = Math.min(Math.max(options.maxResults || 5, 1), 20);

  if (engine === "duckduckgo") return searchDuckDuckGo(query, maxResults);
  if (engine === "brave") return searchBrave(query, maxResults);

  try {
    const data = await searchYandex(query, { maxResults });
    return { engine: "yandex", query, results: data.results };
  } catch (yandexError) {
    // Keep search usable even when Yandex XML/CORS is unavailable.
    console.warn("[Search] Yandex failed, falling back to DuckDuckGo", yandexError);
    return searchDuckDuckGo(query, maxResults);
  }
}

async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult> {
  const res = await fetch("https://api.duckduckgo.com/?q=" + encodeURIComponent(query) + "&format=json&no_html=1");
  if (!res.ok) throw new Error("DuckDuckGo HTTP " + res.status);

  const data = await res.json() as { RelatedTopics?: Array<{ Text?: string; FirstURL?: string }> };
  const results = (data.RelatedTopics || [])
    .filter(item => item.FirstURL)
    .slice(0, maxResults)
    .map(item => ({ title: item.Text || "", url: item.FirstURL || "", snippet: item.Text || "" }));

  return { engine: "duckduckgo", query, results };
}

async function searchBrave(query: string, maxResults: number): Promise<SearchResult> {
  if (typeof window === "undefined") throw new Error("Brave search must use a server route");

  const key = window.localStorage.getItem("brave_api_key");
  if (!key) throw new Error("Brave API key is not configured");

  const res = await fetch(
    "https://api.search.brave.com/res/v1/web/search?q=" + encodeURIComponent(query) + "&count=" + maxResults,
    { headers: { "X-Subscription-Token": key } },
  );

  if (!res.ok) throw new Error("Brave HTTP " + res.status);

  const data = await res.json() as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
  };

  return {
    engine: "brave",
    query,
    results: (data.web?.results || []).map(item => ({
      title: item.title || "",
      url: item.url || "",
      snippet: item.description || "",
    })),
  };
}
