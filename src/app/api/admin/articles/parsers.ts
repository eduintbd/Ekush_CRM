/**
 * Shared input parser for the /api/admin/articles POST + PATCH
 * handlers. Lives outside route.ts because Next.js App Router only
 * allows HTTP-verb + config exports from route files.
 */

export type ArticleInput = {
  articleUrl: string;
  publisher: string;
  title: string;
  excerpt: string;
  coverImageUrl: string;
  category: string;
  publishedAt: Date;
  readTimeMinutes: number;
  displayOrder: number;
  isPublished: boolean;
};

export function parseArticleInput(
  body: Record<string, unknown>,
): ArticleInput | { error: string } {
  const articleUrl = str(body.articleUrl);
  const publisher = str(body.publisher);
  const title = str(body.title);
  const excerpt = str(body.excerpt);
  const coverImageUrl = str(body.coverImageUrl);
  const category = str(body.category);
  const publishedAtRaw = str(body.publishedAt);

  if (!articleUrl) return { error: "articleUrl is required" };
  if (!publisher) return { error: "publisher is required" };
  if (!title) return { error: "title is required" };
  if (!excerpt) return { error: "excerpt is required" };
  if (!coverImageUrl) return { error: "coverImageUrl is required" };
  if (!category) return { error: "category is required" };

  const publishedAt = new Date(publishedAtRaw);
  if (!publishedAtRaw || Number.isNaN(publishedAt.getTime())) {
    return { error: "publishedAt must be an ISO date" };
  }

  return {
    articleUrl,
    publisher,
    title,
    excerpt,
    coverImageUrl,
    category,
    publishedAt,
    readTimeMinutes: Math.max(1, intOrZero(body.readTimeMinutes)),
    displayOrder: intOrZero(body.displayOrder),
    isPublished: !!body.isPublished,
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function intOrZero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
