import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../../../knowledge/_guard";
import { parseQuickReply } from "../parsers";

const PUBLIC_TAG = "ahona-public";
const PORTAL_TAG = "ahona-portal";
const PUBLIC_PATH = "/api/public/ahona";
const PORTAL_PATH = "/api/portal/ahona";

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

  const parsed = parseQuickReply(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Cycle protection: prevent setting parent to self or any descendant.
  if (parsed.parentId) {
    if (parsed.parentId === params.id) {
      return NextResponse.json(
        { error: "A node cannot be its own parent" },
        { status: 400 },
      );
    }
    if (await isDescendant(params.id, parsed.parentId)) {
      return NextResponse.json(
        { error: "Cannot move a node under one of its descendants" },
        { status: 400 },
      );
    }
  }

  const reply = await prisma.ahonaQuickReply.update({
    where: { id: params.id },
    data: parsed,
  });

  revalidatePath(PUBLIC_PATH);
  revalidatePath(PORTAL_PATH);
  await flushTag(PUBLIC_TAG);
  await flushTag(PORTAL_TAG);

  return NextResponse.json({ reply });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireStaff();
  if (guard) return guard;

  // Cascade is set on the relation, so children disappear with the
  // parent. This is the right behaviour for a menu tree — orphaned
  // children would render as detached top-level buttons otherwise.
  await prisma.ahonaQuickReply.delete({ where: { id: params.id } });

  revalidatePath(PUBLIC_PATH);
  revalidatePath(PORTAL_PATH);
  await flushTag(PUBLIC_TAG);
  await flushTag(PORTAL_TAG);

  return NextResponse.json({ success: true });
}

// Walk up from `candidateParentId` to root; if we hit `selfId` along
// the way, the candidate is a descendant of self → cycle.
async function isDescendant(selfId: string, candidateParentId: string): Promise<boolean> {
  let cursor: string | null = candidateParentId;
  // Cap walks to a reasonable depth so a malformed tree can't loop us.
  for (let i = 0; i < 32 && cursor; i++) {
    if (cursor === selfId) return true;
    const next: { parentId: string | null } | null = await prisma.ahonaQuickReply.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = next?.parentId ?? null;
  }
  return false;
}
