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
  images: string[];
  // Kept so legacy topics that still have imageUrl in the DB round-trip
  // through PATCH without clearing the field. New writes should prefer
  // `images`. The public API merges the two on read.
  imageUrl: string | null;
  category: string;
  displayOrder: number;
  isPublished: boolean;
  // What's New side-tab opt-in. The public /api/public/whats-new
  // endpoint filters on showInWhatsNew && isPublished, sorted by
  // whatsNewOrder ASC NULLS LAST, then createdAt DESC.
  showInWhatsNew: boolean;
  whatsNewOrder: number | null;
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
  if (imageUrlRaw && !/^https?:\/\//i.test(imageUrlRaw)) {
    return { error: "imageUrl must be an http(s) URL" };
  }

  // Array of image URLs. Accept both an incoming `images: string[]` and
  // the legacy single `imageUrl` (the UI will shortly stop sending the
  // latter). Trim each, drop empties, validate scheme. Cap at 10 to
  // avoid runaway admin input.
  const rawImages = Array.isArray(body.images) ? body.images : [];
  const images: string[] = [];
  for (const v of rawImages) {
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) continue;
    if (!/^https?:\/\//i.test(s)) {
      return { error: `images entries must be http(s) URLs (got "${s}")` };
    }
    images.push(s);
    if (images.length >= 10) break;
  }

  // whatsNewOrder accepts an explicit integer or null/undefined/empty
  // string for "unordered". The form sends "" when the input is blank.
  const whatsNewOrderRaw = body.whatsNewOrder;
  let whatsNewOrder: number | null = null;
  if (whatsNewOrderRaw !== null && whatsNewOrderRaw !== undefined && whatsNewOrderRaw !== "") {
    const n = Number(whatsNewOrderRaw);
    if (!Number.isFinite(n)) {
      return { error: "whatsNewOrder must be an integer or null" };
    }
    whatsNewOrder = Math.trunc(n);
  }

  return {
    title,
    summary,
    body: bodyHtml,
    iconKey,
    images,
    imageUrl: imageUrlRaw || null,
    category,
    displayOrder: intOrZero(body.displayOrder),
    isPublished: !!body.isPublished,
    showInWhatsNew: !!body.showInWhatsNew,
    whatsNewOrder,
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function intOrZero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
