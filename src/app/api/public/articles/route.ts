import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public list of press articles for the ekushwml.com /knowledge page's
 * Press & Articles tab. Returns every published article sorted by
 * the admin-curated displayOrder so the editorial team controls
 * the 3-column grid without touching code.
 */
export const revalidate = 86400;

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
      "Cache-Control":
        "public, s-maxage=86400, stale-while-revalidate=172800",
    },
  });
}
