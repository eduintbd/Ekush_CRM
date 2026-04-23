import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public list of YouTube videos for the ekushwml.com /knowledge page's
 * Video Library tab. Returns every published video sorted by the
 * admin-curated displayOrder; the frontend picks the single
 * isFeatured row and renders the rest in its 1+4 grid.
 *
 * No auth, CORS allowed via next.config.js headers() rule for
 * /api/public/:path*.
 */
export const revalidate = 86400;

export async function GET() {
  const videos = await prisma.video.findMany({
    where: { isPublished: true },
    orderBy: [{ displayOrder: "asc" }, { publishedAt: "desc" }],
    select: {
      id: true,
      youtubeUrl: true,
      videoId: true,
      title: true,
      category: true,
      thumbnailUrl: true,
      duration: true,
      viewCount: true,
      likeCount: true,
      publishedAt: true,
      isFeatured: true,
      displayOrder: true,
    },
  });

  return NextResponse.json(videos, {
    headers: {
      // Daily freshness window + two-day SWR. View/like counts lag
      // that much anyway between YouTube-API syncs, so tight TTL
      // would waste compute.
      "Cache-Control":
        "public, s-maxage=86400, stale-while-revalidate=172800",
    },
  });
}
