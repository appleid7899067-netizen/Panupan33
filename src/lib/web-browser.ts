/**
 * Public-internet browser for Boss tools.
 * Forces real HTTPS navigation to public hosts only (blocks private/local/metadata).
 * web_search uses live browser engines (Bing + Wikipedia), not private network.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 BossnuBrowser/1.0";

export type BrowserPage = {
  ok: boolean;
  status: number;
  finalUrl: string;
  contentType: string | null;
  title?: string;
  text: string;
  htmlPreview?: string;
  responseTimeMs: number;
  error?: string;
  via: "browser";
};

export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
};

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "::1" ||
    h.startsWith("fc") ||
    h.startsWith("fd") ||
    h.startsWith("fe8") ||
    h.startsWith("fe9") ||
    h.startsWith("fea") ||
    h.startsWith("feb")
  );
}

/** Reject anything that is not a public internet HTTPS host. */
export function assertPublicHttpsUrl(raw: string): URL {
  const s = raw.trim();
  if (!s) throw new Error("URL required");
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  if (!/^https:\/\//i.test(withScheme)) throw new Error("Public browser allows HTTPS only");
  let target: URL;
  try {
    target = new URL(withScheme);
  } catch {
    throw new Error("Invalid URL");
  }
  if (target.username || target.password) throw new Error("URL credentials not allowed");
  const hostname = target.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname === "localhost.localdomain" ||
    hostname === "ip6-localhost" ||
    hostname === "metadata.google.internal" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    isPrivateIpv4(hostname) ||
    isPrivateIpv6(hostname)
  ) {
    throw new Error(`Blocked non-public host: ${hostname}`);
  }
  return target;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripHtml(m[1]).slice(0, 300) : undefined;
}

function unwrapBingUrl(href: string): string {
  try {
    const u = new URL(href.replace(/&amp;/g, "&"));
    const payload = u.searchParams.get("u");
    if (payload && payload.startsWith("a1")) {
      const b64 = payload.slice(2).replace(/-/g, "+").replace(/_/g, "/");
      const bin =
        typeof atob === "function"
          ? atob(b64)
          : Buffer.from(b64, "base64").toString("binary");
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const decoded = new TextDecoder().decode(bytes);
      if (/^https?:\/\//i.test(decoded)) return decoded.replace(/^http:\/\//i, "https://");
    }
  } catch {
    /* keep original */
  }
  return href.replace(/&amp;/g, "&").replace(/^http:\/\//i, "https://");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "");
}

/** Navigate a public HTTPS page with browser User-Agent. */
export async function browserNavigate(
  url: string,
  opts?: { timeoutMs?: number; maxBytes?: number },
): Promise<BrowserPage> {
  const target = assertPublicHttpsUrl(url);
  const timeoutMs = Math.min(45000, Math.max(2000, Number(opts?.timeoutMs ?? 20000)));
  const maxBytes = Math.min(2_000_000, Math.max(50_000, Number(opts?.maxBytes ?? 500_000)));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(target.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
        "Accept-Language": "en-US,en;q=0.9,th;q=0.8",
        "User-Agent": BROWSER_UA,
        "Cache-Control": "no-cache",
      },
    });
    try {
      assertPublicHttpsUrl(response.url);
    } catch (e) {
      return {
        ok: false,
        status: response.status,
        finalUrl: response.url,
        contentType: response.headers.get("content-type"),
        text: "",
        responseTimeMs: Date.now() - started,
        error: e instanceof Error ? e.message : String(e),
        via: "browser",
      };
    }
    const buf = await response.arrayBuffer();
    const slice = buf.byteLength > maxBytes ? buf.slice(0, maxBytes) : buf;
    const raw = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    const contentType = response.headers.get("content-type");
    const isHtml = /html|xml/i.test(contentType ?? "") || /<html/i.test(raw.slice(0, 500));
    const text = isHtml ? stripHtml(raw).slice(0, 80_000) : raw.slice(0, 80_000);
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      contentType,
      title: isHtml ? extractTitle(raw) : undefined,
      text,
      htmlPreview: isHtml ? raw.slice(0, 200_000) : undefined,
      responseTimeMs: Date.now() - started,
      via: "browser",
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: target.toString(),
      contentType: null,
      text: "",
      responseTimeMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
      via: "browser",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function searchWikipedia(query: string, count: number): Promise<SearchHit[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${count}&namespace=0&format=json`;
  const page = await browserNavigate(url, { timeoutMs: 15000, maxBytes: 200_000 });
  if (!page.ok) return [];
  try {
    const data = JSON.parse(page.text) as [string, string[], string[], string[]];
    const titles = data[1] ?? [];
    const descs = data[2] ?? [];
    const links = data[3] ?? [];
    const hits: SearchHit[] = [];
    for (let i = 0; i < Math.min(count, titles.length); i++) {
      const href = String(links[i] ?? "").replace(/^http:\/\//i, "https://");
      if (!href) continue;
      try {
        assertPublicHttpsUrl(href);
      } catch {
        continue;
      }
      hits.push({
        title: String(titles[i] ?? ""),
        url: href,
        snippet: String(descs[i] ?? ""),
      });
    }
    return hits;
  } catch {
    return [];
  }
}

async function searchBing(query: string, count: number): Promise<SearchHit[]> {
  const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`;
  const page = await browserNavigate(searchUrl, { timeoutMs: 25000, maxBytes: 1_500_000 });
  if (!page.ok && page.status === 0) return [];
  const body = page.htmlPreview ?? page.text;
  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  const re = /<h2[^>]*>\s*<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null && hits.length < count) {
    const href = unwrapBingUrl(decodeEntities(m[1]));
    if (/javascript:/i.test(href)) continue;
    if (/bing\.com\/(search|ck|account|maps)/i.test(href)) continue;
    if (seen.has(href)) continue;
    try {
      assertPublicHttpsUrl(href);
    } catch {
      continue;
    }
    seen.add(href);
    hits.push({
      title: decodeEntities(m[2]).slice(0, 200),
      url: href,
      snippet: "",
    });
  }

  if (hits.length) {
    const citeRe = /class="b_caption"[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
    let i = 0;
    while ((m = citeRe.exec(body)) !== null && i < hits.length) {
      hits[i].snippet = decodeEntities(m[1]).slice(0, 400);
      i += 1;
    }
  }
  return hits;
}

/** Multi-engine public browser search. */
export async function browserSearchDuckDuckGo(
  query: string,
  count = 8,
): Promise<{ ok: boolean; query: string; hits: SearchHit[]; error?: string; via: "browser"; engines?: string[] }> {
  const q = query.trim();
  if (!q) throw new Error("query required");
  const n = Math.min(10, Math.max(1, count));
  const engines: string[] = [];
  const merged: SearchHit[] = [];
  const seen = new Set<string>();

  const wiki = await searchWikipedia(q, Math.min(5, n));
  if (wiki.length) engines.push("wikipedia");
  for (const h of wiki) {
    if (seen.has(h.url)) continue;
    seen.add(h.url);
    merged.push(h);
  }

  const bing = await searchBing(q, n);
  if (bing.length) engines.push("bing");
  for (const h of bing) {
    if (seen.has(h.url)) continue;
    seen.add(h.url);
    merged.push(h);
    if (merged.length >= n) break;
  }

  return {
    ok: merged.length > 0,
    query: q,
    hits: merged.slice(0, n),
    engines,
    ...(merged.length ? {} : { error: "No public results from browser engines" }),
    via: "browser",
  };
}

/**
 * Forced public browser search:
 * 1) Wikipedia + Bing via browser UA
 * 2) Optionally open top hits and extract page text
 */
export async function browserWebSearch(
  query: string,
  opts?: { count?: number; openTop?: number },
): Promise<{
  ok: boolean;
  query: string;
  hits: SearchHit[];
  pages?: Array<{ url: string; title?: string; text: string; status: number }>;
  via: "browser";
  engines?: string[];
  error?: string;
}> {
  const count = Math.min(10, Math.max(1, Number(opts?.count ?? 8)));
  const openTop = Math.min(3, Math.max(0, Number(opts?.openTop ?? 0)));
  const search = await browserSearchDuckDuckGo(query, count);
  if (!search.ok) return { ...search, via: "browser" };

  const pages: Array<{ url: string; title?: string; text: string; status: number }> = [];
  for (const hit of search.hits.slice(0, openTop)) {
    const page = await browserNavigate(hit.url, { timeoutMs: 15000 });
    if (page.text) {
      pages.push({
        url: page.finalUrl || hit.url,
        title: page.title ?? hit.title,
        text: page.text.slice(0, 6000),
        status: page.status,
      });
    }
  }
  return {
    ok: true,
    query: search.query,
    hits: search.hits,
    engines: search.engines,
    ...(pages.length ? { pages } : {}),
    via: "browser",
  };
}
