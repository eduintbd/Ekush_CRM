import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../knowledge/_guard";

const CACHE_TAG = "knowledge-articles";

export async function GET() {
  const guard = await requireStaff();
  if (guard) return guard;

  const articles = await prisma.article.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ articles });
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

  const parsed = parseArticleInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const article = await prisma.article.create({ data: parsed });
  await flushTag(CACHE_TAG);
  return NextResponse.json({ article });
}

// --- shared parser --------------------------------------------------
type ArticleInput = {
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
