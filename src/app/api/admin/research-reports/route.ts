import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../knowledge/_guard";
import { parseResearchReportInput } from "./parsers";

// Two caches sit in front of the public research-reports list:
//   1. Our own Vercel edge cache (s-maxage on /api/public/research-reports).
//   2. The rebuild's ISR tag `knowledge-research-reports`.
// Every write purges both — the endpoint has no query string so
// revalidatePath is sufficient for the edge (no per-query-variant
// plumbing needed, unlike learn-topics).
const CACHE_TAG = "knowledge-research-reports";
const PUBLIC_PATH = "/api/public/research-reports";

export async function GET() {
  const guard = await requireStaff();
  if (guard) return guard;

  const reports = await prisma.researchReport.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ reports });
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

  const parsed = parseResearchReportInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const report = await prisma.researchReport.create({ data: parsed });
  revalidatePath(PUBLIC_PATH);
  await flushTag(CACHE_TAG);
  return NextResponse.json({ report });
}
