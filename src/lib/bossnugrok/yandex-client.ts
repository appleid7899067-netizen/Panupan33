export interface YandexSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface YandexSearchResponse {
  query: string;
  results: YandexSearchResult[];
  total: number;
  engine: "yandex";
  source: "xml" | "fallback";
}

const SEARCH_URL = "https://yandex.com/search/xml";

function storage(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try { return window.localStorage.getItem(key) || undefined; } catch { return undefined; }
}

export async function searchYandex(
  query: string,
  options: { apiKey?: string; user?: string; maxResults?: number; region?: number } = {},
): Promise<YandexSearchResponse> {
  const q = query.trim();
  if (!q) throw new Error("Yandex search query is empty");

  const maxResults = Math.min(Math.max(options.maxResults || 10, 1), 50);
  const apiKey = options.apiKey || storage("yandex_api_key");
  const user = options.user || storage("yandex_user");

  if (!apiKey || !user) return searchYandexFallback(q, maxResults);

  const params = new URLSearchParams({
    user,
    key: apiKey,
    query: q,
    lr: String(options.region || 225),
    sortby: "rlv",
    filter: "none",
    maxpassages: "3",
    groupby: "attr=d.mode=deep.groups-on-page=" + maxResults,
  });

  try {
    const res = await fetch(SEARCH_URL + "?" + params.toString(), {
      headers: { Accept: "application/xml, text/xml" },
    });
    if (!res.ok) throw new Error("Yandex HTTP " + res.status);
    return { ...parseXml(await res.text(), q, maxResults), engine: "yandex", source: "xml" };
  } catch (error) {
    console.warn("[Yandex] XML search failed", error);
    return searchYandexFallback(q, maxResults);
  }
}

async function searchYandexFallback(query: string, maxResults: number): Promise<YandexSearchResponse> {
  const target = "https://yandex.com/search/?text=" + encodeURIComponent(query);
  const proxies = [
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(target),
    "https://corsproxy.io/?url=" + encodeURIComponent(target),
  ];

  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy);
      if (!res.ok) continue;
      const parsed = parseHtml(await res.text(), query, maxResults);
      if (parsed.results.length) return { ...parsed, engine: "yandex", source: "fallback" };
    } catch {}
  }

  throw new Error("Yandex search unavailable. Configure XML API or a server-side search route.");
}

function parseXml(xml: string, query: string, maxResults: number) {
  const results: YandexSearchResult[] = [];
  const re = /<doc>([\s\S]*?)<\/doc>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(xml)) && results.length < maxResults) {
    const doc = match[1];
    const url = decodeXml(doc.match(/<url>([\s\S]*?)<\/url>/i)?.[1] || "");
    const title = decodeXml(doc.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
    const snippet = decodeXml(doc.match(/<passage>([\s\S]*?)<\/passage>/i)?.[1] || "");
    if (url && title) results.push({ url, title, snippet });
  }

  return { query, results, total: results.length };
}

function parseHtml(html: string, query: string, maxResults: number) {
  const results: YandexSearchResult[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href=["'](https?:\/\/[^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html)) && results.length < maxResults) {
    const url = match[1];
    if (/yandex\./i.test(url) || seen.has(url)) continue;
    const title = stripHtml(match[2]).replace(/\s+/g, " ").trim().slice(0, 160);
    if (!title) continue;
    seen.add(url);
    results.push({ url, title, snippet: "" });
  }

  return { query, results, total: results.length };
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
}

export async function translateWithYandex(
  text: string,
  targetLang = "th",
  apiKey?: string,
): Promise<string> {
  const key = apiKey || storage("yandex_translate_key");
  if (!key) throw new Error("Yandex Translate API key is not configured");

  const params = new URLSearchParams({ key, text, lang: targetLang });
  const res = await fetch("https://translate.yandex.net/api/v1.5/tr.json/translate?" + params.toString());
  if (!res.ok) throw new Error("Yandex Translate HTTP " + res.status);

  const data = await res.json() as { text?: string[] };
  return data.text?.[0] || "";
}

export async function detectLanguage(text: string, apiKey?: string): Promise<string> {
  const key = apiKey || storage("yandex_translate_key");
  if (!key) throw new Error("Yandex Translate API key is not configured");

  const params = new URLSearchParams({ key, text });
  const res = await fetch("https://translate.yandex.net/api/v1.5/tr.json/detect?" + params.toString());
  if (!res.ok) throw new Error("Yandex Detect HTTP " + res.status);

  const data = await res.json() as { lang?: string };
  return data.lang || "unknown";
}
