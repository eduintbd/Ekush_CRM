import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../knowledge/_guard";
import { parseLearnTopicInput } from "./parsers";

// See videos/route.ts for the two-cache-layer invariant.
const BASE_TAG = "knowledge-learn-topics";
const PUBLIC_PATH = "/api/public/learn-topics";
const tagForCategory = (cat: string) => `${BASE_TAG}-${cat}`;

export async function GET(req: NextRequest) {
  const guard = await requireStaff();
  if (guard) return guard;

  const category = req.nextUrl.searchParams.get("category");
  const topics = await prisma.learnTopic.findMany({
    where: category ? { category } : {},
    orderBy: [{ category: "asc" }, { displayOrder: "asc" }],
  });
  return NextResponse.json({ topics });
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

  const parsed = parseLearnTopicInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const topic = await prisma.learnTopic.create({ data: parsed });
  revalidatePath(PUBLIC_PATH);
  await flushTag(BASE_TAG);
  await flushTag(tagForCategory(topic.category));
  return NextResponse.json({ topic });
}
