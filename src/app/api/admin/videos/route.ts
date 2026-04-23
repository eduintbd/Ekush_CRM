import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../knowledge/_guard";

// Tag used by rebuild's /api/public/videos wrapper. On any write we
// invalidate the whole list since ordering and the single featured
// row can shift from any individual edit.
const CACHE_TAG = "knowledge-videos";

export async function GET() {
  const guard = await requireStaff();
  if (guard) return guard;

  const videos = await prisma.video.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ videos });
}

export async function POST(req: NextRequest) {
  const guard = await requireStaff();
  if (guard) return guard;

  const body = (await req.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!body) {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = parseVideoInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // One-featured-at-a-time: if the new row is featured, demote every
  // existing featured video inside the same transaction. Prisma can't
  // enforce a partial unique constraint so this is the next-cleanest
  // thing — atomic and fails closed if either step errors.
  const video = await prisma.$transaction(async (tx) => {
    if (parsed.isFeatured) {
      await tx.video.updateMany({
        where: { isFeatured: true },
        data: { isFeatured: false },
      });
    }
    return tx.video.create({ data: parsed });
  });

  await flushTag(CACHE_TAG);
  return NextResponse.json({ video });
}

// --- shared parser used by POST + PATCH -----------------------------
type VideoInput = {
  youtubeUrl: string;
  videoId: string;
  title: string;
  category: string;
  thumbnailUrl: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  publishedAt: Date;
  isFeatured: boolean;
  displayOrder: number;
  isPublished: boolean;
  lastSyncedAt: Date;
};

export function parseVideoInput(
  body: Record<string, unknown>,
): VideoInput | { error: string } {
  const youtubeUrl = str(body.youtubeUrl);
  const videoId = str(body.videoId);
  const title = str(body.title);
  const category = str(body.category);
  const thumbnailUrl = str(body.thumbnailUrl);
  const duration = str(body.duration);
  const publishedAtRaw = str(body.publishedAt);

  if (!youtubeUrl) return { error: "youtubeUrl is required" };
  if (!videoId) return { error: "videoId is required" };
  if (!title) return { error: "title is required" };
  if (!category) return { error: "category is required" };
  if (!thumbnailUrl) return { error: "thumbnailUrl is required" };
  if (!duration) return { error: "duration is required" };

  const publishedAt = new Date(publishedAtRaw);
  if (!publishedAtRaw || Number.isNaN(publishedAt.getTime())) {
    return { error: "publishedAt must be an ISO date" };
  }

  return {
    youtubeUrl,
    videoId,
    title,
    category,
    thumbnailUrl,
    duration,
    viewCount: intOrZero(body.viewCount),
    likeCount: intOrZero(body.likeCount),
    publishedAt,
    isFeatured: !!body.isFeatured,
    displayOrder: intOrZero(body.displayOrder),
    isPublished: !!body.isPublished,
    lastSyncedAt: new Date(),
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function intOrZero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
