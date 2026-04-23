import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/roles";
import { flushTag, fundTag } from "@/lib/marketing-revalidator";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Grab the fund code before deleting so we can flush the right cache tag.
  const existing = await prisma.dividendHistory.findUnique({
    where: { id: params.id },
    select: { fund: { select: { code: true } } },
  });

  await prisma.dividendHistory.delete({ where: { id: params.id } });

  if (existing?.fund?.code) {
    await flushTag(fundTag(existing.fund.code, "dividends"));
  }

  return NextResponse.json({ success: true });
}
