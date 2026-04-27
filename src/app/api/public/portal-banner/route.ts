import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public feed for the investor portal /dashboard hero banner carousel.
 *
 *   GET /api/public/portal-banner
 *     →
 *     {
 *       items: [
 *         {
 *           key: "<topicId>:<imageIndex>",
 *           imageUrl: string,
 *           ctaUrl: string | null,
 *           alt: string
 *         }
 *       ]
 *     }
 *
 * Source: LearnTopics with isPublished=true && showInPortalBanner=true.
 * Sort: portalBannerOrder ASC NULLS LAST, then createdAt DESC.
 *
 * One slide per IMAGE — a topic with three images contributes three
 * items. Images stay in the order set on the admin form. Topics
 * with no image at all are dropped.
 *
 * Cache contract mirrors the rest of the public API: this route is
 * dynamic, but writes through /api/admin/learn-topics flush the
 * `portal-banner` cache tag so external fetchers (rebuild,
 * future Investor App, etc.) see updates within ~1 s.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.learnTopic.findMany({
    where: { isPublished: true, showInPortalBanner: true },
    orderBy: [
      { portalBannerOrder: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      title: true,
      images: true,
      imageUrl: true,
      ctaUrl: true,
    },
  });

  const items: Array<{
    key: string;
    imageUrl: string;
    ctaUrl: string | null;
    alt: string;
  }> = [];

  for (const r of rows) {
    const urls =
      Array.isArray(r.images) && r.images.length > 0
        ? r.images
        : r.imageUrl
          ? [r.imageUrl]
          : [];
    urls.forEach((url, idx) => {
      items.push({
        key: `${r.id}:${idx}`,
        imageUrl: url,
        ctaUrl: r.ctaUrl,
        alt: r.title,
      });
    });
  }

  return NextResponse.json({ items });
}
