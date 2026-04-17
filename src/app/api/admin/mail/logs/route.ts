import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPER_ADMIN"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // SENT | FAILED | OPENED
  const where: { status?: string } = {};
  if (status) where.status = status;

  const logs = await prisma.mailLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      investor: { select: { name: true, investorCode: true } },
    },
  });

  const counts = await prisma.mailLog.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return NextResponse.json({
    logs,
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
  });
}
