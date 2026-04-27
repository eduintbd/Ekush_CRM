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
 *           id, title, summary,
 *           imageUrl: string,           // first image picked from images[]
 *           ctaUrl: string | null,
 *           ctaLabel: string | null
 *         }
 *       ]
 *     }
 *
 * Items are LearnTopics with both isPublished AND showInPortalBanner
 * set, sorted by portalBannerOrder ASC NULLS LAST, then createdAt DESC.
 *
 * Topics with no images are filtered out — no banner without a picture.
 *
 * If items is [] the dashboard falls back to <TaxRebateBanner />, so
 * the banner area never goes blank during the transition period.
 *
 * Cache strategy mirrors /api/public/whats-new: rebuild fetchers can
 * tag this with `portal-banner` to opt into 60-second SWR; the admin
 * write handlers in /api/admin/learn-topics flush that tag on save.
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
      summary: true,
      images: true,
      imageUrl: true,
      ctaUrl: true,
      ctaLabel: true,
    },
  });

  // Coalesce the legacy single `imageUrl` column into `images[]` the
  // same way the other public feeds do. Drop topics with no image at
  // all — a banner slide with no picture would render as a flat
  // navy block.
  const items = rows
    .map((r) => {
      const imageUrl =
        (Array.isArray(r.images) && r.images[0]) || r.imageUrl || null;
      if (!imageUrl) return null;
      return {
        id: r.id,
        title: r.title,
        summary: r.summary,
        imageUrl,
        ctaUrl: r.ctaUrl,
        ctaLabel: r.ctaLabel,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return NextResponse.json({ items });
}
