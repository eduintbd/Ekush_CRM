import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { STAFF_ROLES } from "@/lib/roles";
import { flushNavCaches } from "@/lib/marketing-revalidator";


import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  
  if (!STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { date, navValues } = body;

  if (!date || !navValues) {
    return NextResponse.json({ error: "Date and NAV values required" }, { status: 400 });
  }

  const navDate = new Date(date);
  navDate.setHours(0, 0, 0, 0);

  // Batch-fetch all funds at once instead of per-loop queries
  const fundCodes = Object.keys(navValues);
  const funds = await prisma.fund.findMany({
    where: { code: { in: fundCodes } },
  });
  const fundMap = new Map(funds.map((f) => [f.code, f]));

  // Batch-fetch all holdings for these funds
  const fundIds = funds.map((f) => f.id);
  const allHoldings = await prisma.fundHolding.findMany({
    where: { fundId: { in: fundIds } },
  });

  // Group holdings by fundId
  const holdingsByFund = new Map<string, typeof allHoldings>();
  for (const h of allHoldings) {
    if (!holdingsByFund.has(h.fundId)) holdingsByFund.set(h.fundId, []);
    holdingsByFund.get(h.fundId)!.push(h);
  }

  // Build all operations, then execute in parallel
  const operations: Promise<any>[] = [];

  for (const [fundCode, navStr] of Object.entries(navValues)) {
    const nav = parseFloat(navStr as string);
    if (isNaN(nav) || nav <= 0) continue;

    const fund = fundMap.get(fundCode);
    if (!fund) continue;

    // Upsert NAV record
    operations.push(
      prisma.navRecord.upsert({
        where: { fundId_date: { fundId: fund.id, date: navDate } },
        update: { nav },
        create: { fundId: fund.id, date: navDate, nav },
      })
    );

    // Update fund current NAV
    operations.push(
      prisma.fund.update({
        where: { code: fundCode },
        data: { previousNav: fund.currentNav, currentNav: nav },
      })
    );

    // Batch update all holdings for this fund in parallel
    const holdings = holdingsByFund.get(fund.id) || [];
    for (const h of holdings) {
      const currentUnits = Number(h.totalCurrentUnits);
      const newMarketValue = currentUnits * nav;
      const costValue = Number(h.totalCostValueCurrent);
      operations.push(
        prisma.fundHolding.update({
          where: { id: h.id },
          data: {
            nav,
            totalMarketValue: newMarketValue,
            totalUnrealizedGain: newMarketValue - costValue,
            lsMarketValue: Number(h.lsCurrentUnits) * nav,
            sipMarketValue: Number(h.sipCurrentUnits) * nav,
            marketValueSellable: Number(h.totalSellableUnits) * nav,
          },
        })
      );
    }
  }

  // Execute all updates in parallel
  await Promise.all(operations);

  // Recalculate AUM for each fund in parallel
  const aumOps = funds.map(async (fund) => {
    const nav = parseFloat(navValues[fund.code] as string);
    if (isNaN(nav) || nav <= 0) return;
    const aum = await prisma.fundHolding.aggregate({
      where: { fundId: fund.id },
      _sum: { totalMarketValue: true },
    });
    await prisma.fund.update({
      where: { code: fund.code },
      data: { totalAum: aum._sum.totalMarketValue || 0 },
    });
  });
  await Promise.all(aumOps);

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: userId!,
      action: "NAV_UPDATE",
      entity: "NavRecord",
      newValue: JSON.stringify({ date, navValues }),
    },
  });

  // Bulk path can touch all three funds in one request — drop the
  // rebuild's nav-history caches for every fund plus the global
  // performance tag so the website reflects the upload immediately.
  await flushNavCaches();

  return NextResponse.json({ success: true });
}
