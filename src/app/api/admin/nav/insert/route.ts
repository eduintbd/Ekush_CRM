import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPPORT", "SUPER_ADMIN"];

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { fundId, date, nav, buyUnit, sellUnit } = body;

  if (!fundId || !date || nav === undefined || nav === null) {
    return NextResponse.json(
      { error: "fundId, date, and nav are required" },
      { status: 400 }
    );
  }

  const navNum = parseFloat(String(nav));
  if (isNaN(navNum) || navNum <= 0) {
    return NextResponse.json({ error: "Invalid NAV value" }, { status: 400 });
  }

  const buyNum = buyUnit !== undefined && buyUnit !== null && buyUnit !== ""
    ? parseFloat(String(buyUnit))
    : null;
  const sellNum = sellUnit !== undefined && sellUnit !== null && sellUnit !== ""
    ? parseFloat(String(sellUnit))
    : null;

  if (buyNum !== null && (isNaN(buyNum) || buyNum <= 0)) {
    return NextResponse.json({ error: "Invalid Buy Unit value" }, { status: 400 });
  }
  if (sellNum !== null && (isNaN(sellNum) || sellNum <= 0)) {
    return NextResponse.json({ error: "Invalid Sell Unit value" }, { status: 400 });
  }

  const navDate = new Date(date);
  navDate.setHours(0, 0, 0, 0);

  const fund = await prisma.fund.findUnique({ where: { id: fundId } });
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

  // Upsert NAV record with buy/sell unit values
  const record = await prisma.navRecord.upsert({
    where: { fundId_date: { fundId: fund.id, date: navDate } },
    update: { nav: navNum, buyUnit: buyNum, sellUnit: sellNum },
    create: {
      fundId: fund.id,
      date: navDate,
      nav: navNum,
      buyUnit: buyNum,
      sellUnit: sellNum,
    },
  });

  // Update the fund's current NAV only if this is the most recent record
  const latest = await prisma.navRecord.findFirst({
    where: { fundId: fund.id },
    orderBy: { date: "desc" },
  });

  if (latest && latest.id === record.id) {
    await prisma.fund.update({
      where: { id: fund.id },
      data: { previousNav: fund.currentNav, currentNav: navNum },
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: "NAV_INSERT",
      entity: "NavRecord",
      entityId: record.id,
      newValue: JSON.stringify({
        fundCode: fund.code,
        date: navDate.toISOString().split("T")[0],
        nav: navNum,
        buyUnit: buyNum,
        sellUnit: sellNum,
      }),
    },
  });

  return NextResponse.json({ success: true, record });
}
