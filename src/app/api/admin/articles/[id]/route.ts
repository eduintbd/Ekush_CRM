import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../../knowledge/_guard";
import { parseArticleInput } from "../route";

const CACHE_TAG = "knowledge-articles";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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

  const article = await prisma.article.update({
    where: { id: params.id },
    data: parsed,
  });
  await flushTag(CACHE_TAG);
  return NextResponse.json({ article });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireStaff();
  if (guard) return guard;

  await prisma.article.delete({ where: { id: params.id } });
  await flushTag(CACHE_TAG);
  return NextResponse.json({ success: true });
}
