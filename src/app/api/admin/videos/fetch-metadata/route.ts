import { NextRequest, NextResponse } from "next/server";
import { extractVideoId, fetchYoutubeMetadata } from "@/lib/youtube";
import { requireStaff } from "../../knowledge/_guard";

/**
 * Prefill helper for the "Add video" admin form. Takes a raw YouTube
 * URL (or bare 11-char ID), calls the Data API, and returns the
 * subset of fields the admin form populates so the staff member only
 * has to adjust category / order / featured / published before save.
 *
 * Does NOT write to the database — that happens on form submit via
 * the main POST /api/admin/videos handler.
 */
export async function POST(req: NextRequest) {
  const guard = await requireStaff();
  if (guard) return guard;

  const body = (await req.json().catch(() => null)) as
    | { url?: string }
    | null;
  const url = (body?.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json(
      {
        error:
          "Couldn't extract a YouTube video ID from that URL. Paste a full watch/embed/shorts/youtu.be link, or the 11-char ID itself.",
      },
      { status: 400 },
    );
  }

  const result = await fetchYoutubeMetadata(videoId);
  if (!result.ok) {
    // Pass the kind through so the UI can differentiate "config
    // broken" (401-ish) from "bad video" (404-ish).
    const status = result.kind === "missing_key" ? 500 : 502;
    return NextResponse.json(
      { error: result.error, kind: result.kind },
      { status },
    );
  }

  return NextResponse.json({
    // `youtubeUrl` is whatever the admin pasted — form keeps it
    // for audit trail. Everything else is fresh from YouTube.
    youtubeUrl: url,
    ...result.data,
  });
}
