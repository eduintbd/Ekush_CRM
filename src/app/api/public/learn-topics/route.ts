import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public list of learn topics for the ekushwml.com /knowledge page's
 * "Basic of Mutual Fund" tab (and, optionally, future tabs that we
 * migrate out of the rebuild's static knowledge.json).
 *
 *   GET /api/public/learn-topics            — every published topic
 *   GET /api/public/learn-topics?category=basics — just basics
 *
 * The rebuild currently only asks for ?category=basics; FAQ and Myth
 * Buster still live in its static JSON. Keeping the query param
 * flexible means we can migrate those later without a schema change.
 */
// Rendered on demand. Unlike /api/public/videos, this route takes a
// `?category=...` query string and Next.js's revalidatePath doesn't
// purge Vercel-CDN entries for query-parametered URLs — so a long
// s-maxage would let the `?category=basics` variant sit stale after
// every admin write. The rebuild's own ISR (web/src/lib/api/knowledge.ts
// with `revalidate: 3600`) is the real cache; this endpoint just reads
// Prisma cheap. See videos/route.ts for the reasoning that does still
// apply to the query-less endpoints.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");

  const topics = await prisma.learnTopic.findMany({
    where: {
      isPublished: true,
      ...(category ? { category } : {}),
    },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      title: true,
      summary: true,
      body: true,
      iconKey: true,
      imageUrl: true,
      category: true,
      displayOrder: true,
    },
  });

  return NextResponse.json(topics, {
    headers: {
      // No Vercel-edge caching here — see the file-top comment.
      "Cache-Control": "private, no-store",
    },
  });
}
