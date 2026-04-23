/**
 * YouTube Data API v3 helpers for the admin Video CRUD flow.
 *
 * - `extractVideoId` handles every URL shape admins might paste.
 * - `parseDuration` converts ISO 8601 ("PT14M32S") to display form.
 * - `fetchYoutubeMetadata` calls the Data API for a single video ID
 *   and returns the subset of fields the CRM persists.
 * - `fetchYoutubeStats` is a cheaper variant used by the daily cron —
 *   only refreshes viewCount / likeCount + lastSyncedAt.
 *
 * All failure modes return a typed Result rather than throwing so
 * callers can decide whether a missing key blocks admin writes or
 * just silently skips a refresh.
 */

const API_BASE = "https://www.googleapis.com/youtube/v3/videos";

export type YoutubeMetadata = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  duration: string;      // "14:32" or "1:02:03"
  viewCount: number;
  likeCount: number;
  publishedAt: string;   // ISO 8601
};

export type YoutubeStats = {
  viewCount: number;
  likeCount: number;
};

export type YoutubeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number; kind?: YoutubeErrorKind };

export type YoutubeErrorKind =
  | "missing_key"
  | "bad_url"
  | "not_found"
  | "private"
  | "api_error"
  | "network";

/**
 * Pulls the 11-character video ID out of the assorted URL shapes
 * admin might paste. Falls back to treating the input as a raw ID
 * when URL parsing fails.
 */
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Raw ID check first — cheap, and lets admin paste "dQw4w9WgXcQ" directly.
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // watch?v=ID on youtube.com
  const v = url.searchParams.get("v");
  if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;

  // youtu.be/ID shortlink
  if (url.hostname.endsWith("youtu.be")) {
    const id = url.pathname.slice(1).split("/")[0] ?? "";
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }

  // /embed/ID, /shorts/ID, /v/ID on youtube.com
  const parts = url.pathname.split("/").filter(Boolean);
  for (const marker of ["embed", "shorts", "v"]) {
    const idx = parts.indexOf(marker);
    if (idx >= 0 && parts[idx + 1]) {
      const id = parts[idx + 1];
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }
  }

  return null;
}

/**
 * ISO 8601 duration → "MM:SS" or "H:MM:SS".
 * YouTube's contentDetails.duration is always in this format.
 */
export function parseDuration(iso: string): string {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return "";
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(min)}:${pad(s)}`;
  return `${min}:${pad(s)}`;
}

/**
 * Fetches full metadata for a single video. Prefers maxres thumbnail,
 * falls back in order: high → medium → default.
 */
export async function fetchYoutubeMetadata(
  videoId: string,
): Promise<YoutubeResult<YoutubeMetadata>> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return { ok: false, error: "YOUTUBE_API_KEY not set", kind: "missing_key" };
  }

  const url =
    `${API_BASE}?part=snippet,contentDetails,statistics` +
    `&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(key)}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "network error",
      kind: "network",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `YouTube API returned ${res.status}`,
      status: res.status,
      kind: "api_error",
    };
  }

  const body = (await res.json()) as {
    items?: Array<{
      snippet?: {
        title?: string;
        publishedAt?: string;
        thumbnails?: Record<string, { url?: string }>;
      };
      contentDetails?: { duration?: string };
      statistics?: { viewCount?: string; likeCount?: string };
      status?: { privacyStatus?: string; embeddable?: boolean };
    }>;
  };

  const item = body.items?.[0];
  if (!item) {
    return {
      ok: false,
      error: "Video not found — it may be private, deleted, or region-blocked",
      kind: "not_found",
    };
  }

  const thumbs = item.snippet?.thumbnails ?? {};
  const thumbnailUrl =
    thumbs.maxres?.url ??
    thumbs.high?.url ??
    thumbs.medium?.url ??
    thumbs.default?.url ??
    "";

  return {
    ok: true,
    data: {
      videoId,
      title: item.snippet?.title ?? "",
      thumbnailUrl,
      duration: parseDuration(item.contentDetails?.duration ?? ""),
      viewCount: Number(item.statistics?.viewCount ?? 0),
      likeCount: Number(item.statistics?.likeCount ?? 0),
      publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
    },
  };
}

/**
 * Cheaper batched variant used by the daily cron. YouTube accepts up
 * to 50 IDs per `videos.list` call; we chunk accordingly.
 */
export async function fetchYoutubeStatsBatch(
  videoIds: string[],
): Promise<YoutubeResult<Map<string, YoutubeStats>>> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return { ok: false, error: "YOUTUBE_API_KEY not set", kind: "missing_key" };
  }

  const out = new Map<string, YoutubeStats>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const slice = videoIds.slice(i, i + 50);
    const url =
      `${API_BASE}?part=statistics&id=${slice.join(",")}` +
      `&key=${encodeURIComponent(key)}`;

    let res: Response;
    try {
      res = await fetch(url, { cache: "no-store" });
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "network error",
        kind: "network",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: `YouTube API returned ${res.status}`,
        status: res.status,
        kind: "api_error",
      };
    }
    const body = (await res.json()) as {
      items?: Array<{
        id?: string;
        statistics?: { viewCount?: string; likeCount?: string };
      }>;
    };
    for (const item of body.items ?? []) {
      if (!item.id) continue;
      out.set(item.id, {
        viewCount: Number(item.statistics?.viewCount ?? 0),
        likeCount: Number(item.statistics?.likeCount ?? 0),
      });
    }
  }
  return { ok: true, data: out };
}
