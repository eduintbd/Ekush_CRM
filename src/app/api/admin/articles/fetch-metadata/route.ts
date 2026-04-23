import { NextRequest, NextResponse } from "next/server";
import { scrapeOpenGraph } from "@/lib/og-scraper";
import { requireStaff } from "../../knowledge/_guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Prefill helper for the "Add article" admin form. Takes a press URL
 * (TBS, Financial Express, or anything else), scrapes its Open Graph
 * tags, and returns title / excerpt / cover image / publish date /
 * detected publisher / computed read-time.
 *
 * Does NOT write the DB — admin reviews the prefilled form and
 * submits via POST /api/admin/articles as usual.
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

  const result = await scrapeOpenGraph(url);
  if (!result.ok) {
    // 400 for bad URL, 504 for timeout, 502 for everything else —
    // matches what the UI shows next to the Fetch button.
    const status =
      result.kind === "bad_url"
        ? 400
        : result.kind === "timeout"
          ? 504
          : 502;
    return NextResponse.json(
      { error: result.error, kind: result.kind },
      { status },
    );
  }

  return NextResponse.json({
    articleUrl: url,
    ...result.data,
    // Expose a YYYY-MM-DD slice too so the date input on the form
    // can bind it directly without extra parsing on the client.
    publishedAtDate: result.data.publishedAt
      ? result.data.publishedAt.slice(0, 10)
      : "",
  });
}
