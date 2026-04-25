import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../../knowledge/_guard";
import { parseQuickReply } from "./parsers";

const PUBLIC_TAG = "ahona-public";
const PORTAL_TAG = "ahona-portal";
const PUBLIC_PATH = "/api/public/ahona";
const PORTAL_PATH = "/api/portal/ahona";

export async function GET() {
  const guard = await requireStaff();
  if (guard) return guard;

  const replies = await prisma.ahonaQuickReply.findMany({
    orderBy: [{ parentId: "asc" }, { displayOrder: "asc" }],
  });
  return NextResponse.json({ replies });
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

  const parsed = parseQuickReply(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Cycle protection: a node can never have itself as an ancestor.
  // POST is create-only so the new id doesn't exist yet — only need
  // to verify the parent exists when one is supplied.
  if (parsed.parentId) {
    const parent = await prisma.ahonaQuickReply.findUnique({
      where: { id: parsed.parentId },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "parentId not found" }, { status: 400 });
    }
  }

  const reply = await prisma.ahonaQuickReply.create({ data: parsed });

  revalidatePath(PUBLIC_PATH);
  revalidatePath(PORTAL_PATH);
  await flushTag(PUBLIC_TAG);
  await flushTag(PORTAL_TAG);

  return NextResponse.json({ reply });
}
