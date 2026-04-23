/**
 * Shared input parser for the /api/admin/videos POST + PATCH handlers.
 * Lives outside route.ts because Next.js App Router restricts which
 * names route.ts files are allowed to export (HTTP verbs + config
 * symbols only).
 */

export type VideoInput = {
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
