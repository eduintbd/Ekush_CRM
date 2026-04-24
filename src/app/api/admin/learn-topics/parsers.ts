/**
 * Shared input parser for the /api/admin/learn-topics POST + PATCH
 * handlers. Lives outside route.ts because Next.js App Router only
 * allows HTTP-verb + config exports from route files.
 */

export type LearnTopicInput = {
  title: string;
  summary: string;
  body: string;
  iconKey: string;
  imageUrl: string | null;
  category: string;
  displayOrder: number;
  isPublished: boolean;
};

const ALLOWED_ICONS = new Set(["cube", "layers", "bank", "chart"]);

export function parseLearnTopicInput(
  body: Record<string, unknown>,
): LearnTopicInput | { error: string } {
  const title = str(body.title);
  const summary = str(body.summary);
  const bodyHtml = str(body.body);
  const iconKey = str(body.iconKey);
  const category = str(body.category);
  const imageUrlRaw = str(body.imageUrl);

  if (!title) return { error: "title is required" };
  if (!summary) return { error: "summary is required" };
  if (!bodyHtml) return { error: "body is required" };
  if (!iconKey) return { error: "iconKey is required" };
  if (!ALLOWED_ICONS.has(iconKey)) {
    return {
      error: `iconKey must be one of: ${[...ALLOWED_ICONS].join(", ")}`,
    };
  }
  if (!category) return { error: "category is required" };
  // Admin-uploaded image is optional; empty string → null so Prisma
  // stores a real NULL rather than the empty string (the rebuild
  // treats "" and null identically, but NULL is cleaner in queries).
  if (imageUrlRaw && !/^https?:\/\//i.test(imageUrlRaw)) {
    return { error: "imageUrl must be an http(s) URL" };
  }

  return {
    title,
    summary,
    body: bodyHtml,
    iconKey,
    imageUrl: imageUrlRaw || null,
    category,
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
