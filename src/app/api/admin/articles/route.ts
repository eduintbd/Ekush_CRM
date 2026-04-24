import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../knowledge/_guard";
import { parseArticleInput } from "./parsers";

// See videos/route.ts for the two-cache-layer invariant: revalidatePath
// purges our Vercel edge cache; flushTag purges the rebuild's ISR.
const CACHE_TAG = "knowledge-articles";
const PUBLIC_PATH = "/api/public/articles";

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
  revalidatePath(PUBLIC_PATH);
  await flushTag(CACHE_TAG);
  return NextResponse.json({ article });
}
