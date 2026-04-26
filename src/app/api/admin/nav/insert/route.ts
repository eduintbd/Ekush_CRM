import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/roles";
import { flushNavCaches } from "@/lib/marketing-revalidator";


export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { fundId, date, nav, investorReturn, buyUnit, sellUnit, dsex, ds30 } = body;

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

  const parseOptionalPositive = (raw: unknown, label: string): number | null | { error: string } => {
    if (raw === undefined || raw === null || raw === "") return null;
    const n = parseFloat(String(raw));
    if (isNaN(n) || n <= 0) return { error: `Invalid ${label} value` };
    return n;
  };
  // Investor Return is admin-entered cumulative dividend-adjusted total
  // return %. Can legitimately be negative (loss period) or zero (period
  // start anchor), so it can't go through parseOptionalPositive.
  const parseOptionalFinite = (raw: unknown, label: string): number | null | { error: string } => {
    if (raw === undefined || raw === null || raw === "") return null;
    const n = parseFloat(String(raw));
    if (!Number.isFinite(n)) return { error: `Invalid ${label} value` };
    return n;
  };

  const buyParsed = parseOptionalPositive(buyUnit, "Buy Unit");
  const sellParsed = parseOptionalPositive(sellUnit, "Sell Unit");
  const dsexParsed = parseOptionalPositive(dsex, "DSEX");
  const ds30Parsed = parseOptionalPositive(ds30, "DS30");
  const irParsed = parseOptionalFinite(investorReturn, "Investor Return");
  for (const p of [buyParsed, sellParsed, dsexParsed, ds30Parsed, irParsed]) {
    if (p && typeof p === "object" && "error" in p) {
      return NextResponse.json({ error: p.error }, { status: 400 });
    }
  }
  const buyNum = buyParsed as number | null;
  const sellNum = sellParsed as number | null;
  const dsexNum = dsexParsed as number | null;
  const ds30Num = ds30Parsed as number | null;
  const irNum = irParsed as number | null;

  const navDate = new Date(date);
  navDate.setHours(0, 0, 0, 0);

  const fund = await prisma.fund.findUnique({ where: { id: fundId } });
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

  const record = await prisma.navRecord.upsert({
    where: { fundId_date: { fundId: fund.id, date: navDate } },
    update: {
      nav: navNum,
      investorReturn: irNum,
      buyUnit: buyNum,
      sellUnit: sellNum,
      dsex: dsexNum,
      ds30: ds30Num,
    },
    create: {
      fundId: fund.id,
      date: navDate,
      nav: navNum,
      investorReturn: irNum,
      buyUnit: buyNum,
      sellUnit: sellNum,
      dsex: dsexNum,
      ds30: ds30Num,
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
        investorReturn: irNum,
        buyUnit: buyNum,
        sellUnit: sellNum,
        dsex: dsexNum,
        ds30: ds30Num,
      }),
    },
  });

  // Flush rebuild caches so the Notice Board, NAV history table, and
  // performance/growth charts pick up this row immediately. flushNavCaches
  // is fire-and-forget — never throws.
  await flushNavCaches(fund.code);

  return NextResponse.json({ success: true, record });
}
