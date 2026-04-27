import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../knowledge/_guard";
import { parseLearnTopicInput } from "./parsers";

// See videos/route.ts for the two-cache-layer invariant.
//
// Extra twist for this route: the rebuild fetches
// `/api/public/learn-topics?category=basics`, which Vercel's CDN
// caches as a separate entry from the no-query base path.
// revalidatePath only purges exact URLs, so on every write we
// explicitly purge the base path AND every category variant we
// ship today.
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
  purgePublicPaths();
  await flushTag(BASE_TAG);
  await flushTag(tagForCategory(topic.category));
  if (topic.showInPortalBanner) await flushTag(PORTAL_BANNER_TAG);
  return NextResponse.json({ topic });
}
