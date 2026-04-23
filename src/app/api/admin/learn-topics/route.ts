import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../knowledge/_guard";

const BASE_TAG = "knowledge-learn-topics";
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
  await flushTag(BASE_TAG);
  await flushTag(tagForCategory(topic.category));
  return NextResponse.json({ topic });
}

// --- shared parser --------------------------------------------------
type LearnTopicInput = {
  title: string;
  summary: string;
  body: string;
  iconKey: string;
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

  if (!title) return { error: "title is required" };
  if (!summary) return { error: "summary is required" };
  if (!bodyHtml) return { error: "body is required" };
  if (!iconKey) return { error: "iconKey is required" };
  if (!ALLOWED_ICONS.has(iconKey)) {
    return { error: `iconKey must be one of: ${[...ALLOWED_ICONS].join(", ")}` };
  }
  if (!category) return { error: "category is required" };

  return {
    title,
    summary,
    body: bodyHtml,
    iconKey,
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
