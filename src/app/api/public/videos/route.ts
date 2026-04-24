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
// Rendered on demand, cached at the edge via the Cache-Control header
// on the response. `revalidate` would pre-render at build time, which
// fails in fresh environments where the Prisma tables don't exist yet.
export const dynamic = "force-dynamic";

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
      // No Vercel-edge caching — same reasoning as articles/route.ts:
      // per-edge cached responses can linger past a revalidatePath
      // call, causing stale slugs to reach the rebuild. The rebuild
      // calls this with cache:'no-store', so edge caching was
      // redundant AND risky.
      "Cache-Control": "private, no-store",
    },
  });
}
