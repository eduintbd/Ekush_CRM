import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchYoutubeMetadata } from "@/lib/youtube";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../../../knowledge/_guard";

/**
 * Manual "Refresh metadata" button target. Used when admin notices
 * stale stats or wants to pull an updated title/thumbnail without
 * waiting for the daily cron.
 *
 * Replaces title, thumbnail, duration, view/like counts, publish
 * date, and lastSyncedAt. Admin-set fields (category, isFeatured,
 * displayOrder, isPublished, youtubeUrl) are preserved.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireStaff();
  if (guard) return guard;

  const existing = await prisma.video.findUnique({
    where: { id: params.id },
    select: { videoId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "video not found" }, { status: 404 });
  }

  const result = await fetchYoutubeMetadata(existing.videoId);
  if (!result.ok) {
    const status = result.kind === "missing_key" ? 500 : 502;
    return NextResponse.json(
      { error: result.error, kind: result.kind },
      { status },
    );
  }

  const video = await prisma.video.update({
    where: { id: params.id },
    data: {
      title: result.data.title,
      thumbnailUrl: result.data.thumbnailUrl,
      duration: result.data.duration,
      viewCount: result.data.viewCount,
      likeCount: result.data.likeCount,
      publishedAt: new Date(result.data.publishedAt),
      lastSyncedAt: new Date(),
    },
  });

  await flushTag("knowledge-videos");
  return NextResponse.json({ video });
}
