import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchYoutubeStatsBatch } from "@/lib/youtube";
import { flushTag } from "@/lib/marketing-revalidator";
import { STAFF_ROLES } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Public-endpoint fan-out + YouTube API round-trip can take a while
// on a cold start; give it room without tripping the default limit.
export const maxDuration = 60;

/**
 * Daily Vercel Cron hook (see vercel.json). Walks every published
 * video, calls YouTube's `videos.list?part=statistics` in batches of
 * 50, and writes back viewCount / likeCount / lastSyncedAt.
 *
 * Does NOT touch title / thumbnail / duration — those only change
 * when admin explicitly triggers /refresh, because a title rename
 * on YouTube shouldn't quietly mutate the marketing site.
 *
 * Authorised either by Vercel's Bearer $CRON_SECRET header or by a
 * staff session (handy for the "Run now" button we may add later).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const isCron = secret && auth === `Bearer ${secret}`;

  if (!isCron) {
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || !STAFF_ROLES.includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const published = await prisma.video.findMany({
    where: { isPublished: true },
    select: { id: true, videoId: true },
  });
  if (published.length === 0) {
    return NextResponse.json({ updated: 0, skipped: 0 });
  }

  const result = await fetchYoutubeStatsBatch(published.map((v) => v.videoId));
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, kind: result.kind },
      { status: 502 },
    );
  }

  const now = new Date();
  let updated = 0;
  let skipped = 0;

  // One UPDATE per video — the dataset is tiny (≤ a few hundred rows)
  // so this stays well under the Supabase pool. If this ever grows,
  // swap to prisma.$executeRaw with VALUES (…) and CASE WHEN.
  for (const v of published) {
    const stats = result.data.get(v.videoId);
    if (!stats) {
      // Video went private / was removed between admin save and now.
      // Leave the row alone; the health-check endpoint will flag it.
      skipped += 1;
      continue;
    }
    await prisma.video.update({
      where: { id: v.id },
      data: {
        viewCount: stats.viewCount,
        likeCount: stats.likeCount,
        lastSyncedAt: now,
      },
    });
    updated += 1;
  }

  await flushTag("knowledge-videos");
  return NextResponse.json({ updated, skipped });
}
