import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../../knowledge/_guard";
import { parseLearnTopicInput } from "../parsers";

const BASE_TAG = "knowledge-learn-topics";
const PUBLIC_PATH = "/api/public/learn-topics";
const tagForCategory = (cat: string) => `${BASE_TAG}-${cat}`;

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

  const parsed = parseLearnTopicInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const previous = await prisma.learnTopic.findUnique({
    where: { id: params.id },
    select: { category: true },
  });
  const topic = await prisma.learnTopic.update({
    where: { id: params.id },
    data: parsed,
  });

  // Flush both the old + new category in case admin moved the topic
  // across categories (e.g. basics → faq once we migrate those).
  revalidatePath(PUBLIC_PATH);
  await flushTag(BASE_TAG);
  if (previous && previous.category !== topic.category) {
    await flushTag(tagForCategory(previous.category));
  }
  await flushTag(tagForCategory(topic.category));

  return NextResponse.json({ topic });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireStaff();
  if (guard) return guard;

  const existing = await prisma.learnTopic.findUnique({
    where: { id: params.id },
    select: { category: true },
  });
  await prisma.learnTopic.delete({ where: { id: params.id } });

  revalidatePath(PUBLIC_PATH);
  await flushTag(BASE_TAG);
  if (existing) await flushTag(tagForCategory(existing.category));

  return NextResponse.json({ success: true });
}
