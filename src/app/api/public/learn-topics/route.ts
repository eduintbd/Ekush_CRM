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
// Rendered on demand, cached at the edge via the Cache-Control header
// below. See videos/route.ts for the reasoning.
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
      category: true,
      displayOrder: true,
    },
  });

  return NextResponse.json(topics, {
    headers: {
      "Cache-Control":
        "public, s-maxage=86400, stale-while-revalidate=172800",
    },
  });
}
