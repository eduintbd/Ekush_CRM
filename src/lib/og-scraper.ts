import * as cheerio from "cheerio";

/**
 * Open Graph scraper used by the admin Article CRUD flow.
 *
 * Fetches an article URL server-side, parses <meta> tags, and returns
 * the subset of fields the admin form prefills. Nothing is cached;
 * admin hits Fetch on demand and reviews before saving so a stale
 * scrape can't silently pollute the database.
 *
 * Publisher detection keys on the URL's hostname — two known domains
 * plus a generic "other" bucket. Read-time is computed from the
 * excerpt at 200 wpm (matches the original spec).
 *
 * Failure modes surface as a typed Result so the UI can distinguish
 * "URL unreachable" from "page loaded but no OG tags" (we still
 * return what we have in the second case rather than erroring).
 */

export type OgMetadata = {
  title: string;
  excerpt: string;
  coverImageUrl: string;
  publishedAt: string | null; // ISO if parseable
  publisher: "tbs" | "financial_express" | "other";
  readTimeMinutes: number;
};

export type OgResult =
  | { ok: true; data: OgMetadata }
  | { ok: false; error: string; kind: OgErrorKind };

export type OgErrorKind = "bad_url" | "timeout" | "http_error" | "parse_error";

const FETCH_TIMEOUT_MS = 5_000;

/**
 * Maps an article hostname to the publisher slug stored in
 * Article.publisher. Falls through to "other" for anything we
 * haven't explicitly tagged.
 */
export function detectPublisher(
  urlString: string,
): OgMetadata["publisher"] {
  let host: string;
  try {
    host = new URL(urlString).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (host.includes("tbsnews.net")) return "tbs";
  if (host.includes("thefinancialexpress.com.bd")) return "financial_express";
  return "other";
}

export function wordsToReadMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // 200 wpm, floor 1.
  return Math.max(1, Math.round(words / 200) || 1);
}

export async function scrapeOpenGraph(articleUrl: string): Promise<OgResult> {
  let parsed: URL;
  try {
    parsed = new URL(articleUrl);
  } catch {
    return { ok: false, error: "Not a valid URL", kind: "bad_url" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      error: "URL must be http(s)",
      kind: "bad_url",
    };
  }

  let res: Response;
  try {
    res = await fetch(articleUrl, {
      // Some publisher sites block the Node default UA. Announce as a
      // modern Chrome so we get the public article HTML the newsroom
      // hands to a logged-out reader.
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EkushBot/1.0; +https://ekushwml.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    const kind: OgErrorKind = /abort|timeout/i.test(msg) ? "timeout" : "http_error";
    return { ok: false, error: msg, kind };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `Publisher returned HTTP ${res.status}`,
      kind: "http_error",
    };
  }

  let html: string;
  try {
    html = await res.text();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "parse failed",
      kind: "parse_error",
    };
  }

  const $ = cheerio.load(html);
  const meta = (selectors: string[]): string => {
    for (const sel of selectors) {
      const v = $(sel).attr("content") ?? $(sel).attr("value") ?? "";
      if (v && v.trim()) return v.trim();
    }
    return "";
  };

  // Standard OG with conservative fallbacks. Order matters — og:*
  // first, twitter:* second, generic <meta name="…"> last.
  const title =
    meta([
      'meta[property="og:title"]',
      'meta[name="og:title"]',
      'meta[property="twitter:title"]',
      'meta[name="twitter:title"]',
    ]) ||
    $("title").first().text().trim();

  const excerpt = meta([
    'meta[property="og:description"]',
    'meta[name="og:description"]',
    'meta[name="description"]',
    'meta[property="twitter:description"]',
    'meta[name="twitter:description"]',
  ]);

  let coverImageUrl = meta([
    'meta[property="og:image"]',
    'meta[name="og:image"]',
    'meta[property="og:image:secure_url"]',
    'meta[property="twitter:image"]',
    'meta[name="twitter:image"]',
  ]);

  // Publishers sometimes serve og:image as a relative path. Resolve
  // against the article URL so admin gets a clickable preview.
  if (coverImageUrl && !/^https?:\/\//i.test(coverImageUrl)) {
    try {
      coverImageUrl = new URL(coverImageUrl, articleUrl).toString();
    } catch {
      /* leave as-is; the image will 404 and admin can paste a manual URL */
    }
  }

  const publishedAtRaw = meta([
    'meta[property="article:published_time"]',
    'meta[name="article:published_time"]',
    'meta[property="og:published_time"]',
    'meta[name="date"]',
    'meta[name="pubdate"]',
  ]);
  let publishedAt: string | null = null;
  if (publishedAtRaw) {
    const d = new Date(publishedAtRaw);
    if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
  }

  const readTimeMinutes = wordsToReadMinutes(excerpt);

  return {
    ok: true,
    data: {
      title,
      excerpt,
      coverImageUrl,
      publishedAt,
      publisher: detectPublisher(articleUrl),
      readTimeMinutes,
    },
  };
}
