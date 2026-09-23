/**
 * Public-internet browser for Boss tools.
 * Forces real HTTPS navigation to public hosts only (blocks private/local/metadata).
 * Used by web_search / web_browse / web_check / web_fetch.
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
    // Re-validate final URL after redirects
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
      htmlPreview: isHtml ? raw.slice(0, 4000) : undefined,
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

function decodeDdEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "");
}

/** DuckDuckGo HTML results — no API key, public browser path. */
export async function browserSearchDuckDuckGo(
  query: string,
  count = 8,
): Promise<{ ok: boolean; query: string; hits: SearchHit[]; error?: string; via: "browser" }> {
  const q = query.trim();
  if (!q) throw new Error("query required");
  const n = Math.min(10, Math.max(1, count));
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const page = await browserNavigate(searchUrl, { timeoutMs: 25000 });
  if (!page.ok && page.status === 0) {
    return { ok: false, query: q, hits: [], error: page.error ?? "browser navigate failed", via: "browser" };
  }
  const html = page.htmlPreview ? await (async () => {
    // Re-fetch with larger body for parsing results
    const full = await browserNavigate(searchUrl, { timeoutMs: 25000, maxBytes: 800_000 });
    return full.htmlPreview ? (full as BrowserPage & { htmlPreview: string }).htmlPreview : full.text;
  })() : page.text;

  // Prefer full HTML if we got it via a second pass
  const fullPage = await browserNavigate(searchUrl, { timeoutMs: 25000, maxBytes: 1_000_000 });
  const body = fullPage.htmlPreview ?? fullPage.text;
  const hits: SearchHit[] = [];

  // Classic DDG HTML result blocks
  const resultRe =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/)/gi;
  let m: RegExpExecArray | null;
  while ((m = resultRe.exec(body)) !== null && hits.length < n) {
    let href = decodeDdEntities(m[1]);
    // DDG sometimes wraps redirects: //duckduckgo.com/l/?uddg=<encoded>
    const uddg = href.match(/[?&]uddg=([^&]+)/);
    if (uddg) {
      try {
        href = decodeURIComponent(uddg[1]);
      } catch {
        /* keep */
      }
    }
    if (!/^https?:\/\//i.test(href)) continue;
    try {
      assertPublicHttpsUrl(href.replace(/^http:\/\//i, "https://"));
    } catch {
      continue;
    }
    hits.push({
      title: decodeDdEntities(m[2]).slice(0, 200),
      url: href.replace(/^http:\/\//i, "https://"),
      snippet: decodeDdEntities(m[3] || m[4] || "").slice(0, 400),
    });
  }

  // Fallback looser pattern
  if (!hits.length) {
    const loose = /href="(https?:\/\/[^"\s]+)"[^>]*>([^<]{5,120})/gi;
    const seen = new Set<string>();
    while ((m = loose.exec(body)) !== null && hits.length < n) {
      let href = m[1];
      if (/duckduckgo\.com|javascript:/i.test(href)) continue;
      if (seen.has(href)) continue;
      seen.add(href);
      try {
        assertPublicHttpsUrl(href.replace(/^http:\/\//i, "https://"));
      } catch {
        continue;
      }
      hits.push({
        title: decodeDdEntities(m[2]).slice(0, 200),
        url: href.replace(/^http:\/\//i, "https://"),
        snippet: "",
      });
    }
  }

  return {
    ok: hits.length > 0,
    query: q,
    hits,
    ...(hits.length ? {} : { error: "No public results parsed from browser search" }),
    via: "browser",
  };
}

/**
 * Forced public browser search:
 * 1) DuckDuckGo HTML via browser UA
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
    ...(pages.length ? { pages } : {}),
    via: "browser",
  };
}
