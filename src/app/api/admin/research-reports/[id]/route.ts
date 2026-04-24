import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../../knowledge/_guard";
import { parseResearchReportInput } from "../parsers";

const CACHE_TAG = "knowledge-research-reports";
const PUBLIC_PATH = "/api/public/research-reports";

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

  const parsed = parseResearchReportInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const report = await prisma.researchReport.update({
    where: { id: params.id },
    data: parsed,
  });
  revalidatePath(PUBLIC_PATH);
  await flushTag(CACHE_TAG);
  return NextResponse.json({ report });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireStaff();
  if (guard) return guard;

  await prisma.researchReport.delete({ where: { id: params.id } });
  revalidatePath(PUBLIC_PATH);
  await flushTag(CACHE_TAG);
  return NextResponse.json({ success: true });
}
