import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public list of press articles for the ekushwml.com /knowledge page's
 * Press & Articles tab. Returns every published article sorted by
 * the admin-curated displayOrder so the editorial team controls
 * the 3-column grid without touching code.
 */
// Rendered on demand, cached at the edge via the Cache-Control header
// below. See videos/route.ts for the reasoning.
export const dynamic = "force-dynamic";

export async function GET() {
  const articles = await prisma.article.findMany({
    where: { isPublished: true },
    orderBy: [{ displayOrder: "asc" }, { publishedAt: "desc" }],
    select: {
      id: true,
      articleUrl: true,
      publisher: true,
      title: true,
      excerpt: true,
      coverImageUrl: true,
      category: true,
      publishedAt: true,
      readTimeMinutes: true,
      displayOrder: true,
    },
  });

  return NextResponse.json(articles, {
    headers: {
      // No Vercel-edge caching — revalidatePath doesn't reliably
      // invalidate every edge region simultaneously, so pre-edit
      // cached responses can linger at some edges long after the
      // admin has corrected content (observed: daily_star articles
      // serving "other" to the rebuild's server-side fetch while
      // client curls from a different geo saw the corrected data).
      // The rebuild calls this with cache:'no-store' anyway, so the
      // only cache we're giving up was a 24h one that caused bugs.
      "Cache-Control": "private, no-store",
    },
  });
}
