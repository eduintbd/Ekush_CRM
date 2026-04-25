import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public feed for the rebuild's What's New floating side-tab.
 *
 *   GET /api/public/whats-new
 *     →
 *     {
 *       whatsappNumber: string | null,   // global wa.me target
 *       items: [
 *         { id, title, summary, images: string[], category }
 *       ]
 *     }
 *
 * Items are LearnTopics with both isPublished AND showInWhatsNew set,
 * sorted by whatsNewOrder ASC NULLS LAST, then createdAt DESC.
 *
 * If no topics opt in, items is []; the rebuild then hides the tab.
 * If the admin hasn't configured a WhatsApp number yet, whatsappNumber
 * is null and the rebuild hides the WhatsApp button on each card.
 *
 * No Vercel-edge caching: the rebuild fetches with no-store, and a
 * stale "What's new" surface defeats the point of the feature.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const [rows, setting] = await Promise.all([
    prisma.learnTopic.findMany({
      where: { isPublished: true, showInWhatsNew: true },
      // Postgres NULLS LAST so explicitly-ordered topics sit on top
      // and unordered ones fall through to createdAt as a tiebreaker.
      orderBy: [
        { whatsNewOrder: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        summary: true,
        images: true,
        imageUrl: true,
        category: true,
      },
    }),
    prisma.whatsNewSetting.findUnique({
      where: { id: "singleton" },
      select: { whatsappNumber: true },
    }),
  ]);

  // Match the legacy-imageUrl merge done by /api/public/learn-topics
  // so rebuild code can render either shape with one path.
  const items = rows
    .map(({ images, imageUrl, ...rest }) => ({
      ...rest,
      images: images.length ? images : imageUrl ? [imageUrl] : [],
    }))
    // Drop topics with no image at all — the carousel is image-only,
    // so an iconKey-only topic would render as a blank slide.
    .filter((t) => t.images.length > 0);

  return NextResponse.json(
    {
      whatsappNumber: setting?.whatsappNumber ?? null,
      items,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
