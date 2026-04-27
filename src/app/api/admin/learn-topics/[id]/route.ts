import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../../knowledge/_guard";
import { parseLearnTopicInput } from "../parsers";

// See ../route.ts for why we purge every category variant explicitly.
const BASE_TAG = "knowledge-learn-topics";
const PORTAL_BANNER_TAG = "portal-banner";
const PUBLIC_BASE_PATH = "/api/public/learn-topics";
const PUBLIC_PORTAL_BANNER_PATH = "/api/public/portal-banner";
const PUBLIC_CATEGORY_PATHS = [
  `${PUBLIC_BASE_PATH}?category=basics`,
  `${PUBLIC_BASE_PATH}?category=faq`,
  `${PUBLIC_BASE_PATH}?category=myth_buster`,
];
const tagForCategory = (cat: string) => `${BASE_TAG}-${cat}`;

function purgePublicPaths() {
  revalidatePath(PUBLIC_BASE_PATH);
  revalidatePath(PUBLIC_PORTAL_BANNER_PATH);
  for (const p of PUBLIC_CATEGORY_PATHS) revalidatePath(p);
}

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
    select: { category: true, showInPortalBanner: true },
  });
  const topic = await prisma.learnTopic.update({
    where: { id: params.id },
    data: parsed,
  });

  // Flush both the old + new category in case admin moved the topic
  // across categories (e.g. basics → faq once we migrate those).
  purgePublicPaths();
  await flushTag(BASE_TAG);
  if (previous && previous.category !== topic.category) {
    await flushTag(tagForCategory(previous.category));
  }
  await flushTag(tagForCategory(topic.category));
  // Flush the portal-banner tag whenever the flag was on either side
  // of the edit — covers all four state transitions (off→on, on→off,
  // on→on with content edits, off→off-but-content-edits-on-others).
  if (topic.showInPortalBanner || previous?.showInPortalBanner) {
    await flushTag(PORTAL_BANNER_TAG);
  }

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
    select: { category: true, showInPortalBanner: true },
  });
  await prisma.learnTopic.delete({ where: { id: params.id } });

  purgePublicPaths();
  await flushTag(BASE_TAG);
  if (existing) await flushTag(tagForCategory(existing.category));
  if (existing?.showInPortalBanner) await flushTag(PORTAL_BANNER_TAG);

  return NextResponse.json({ success: true });
}
