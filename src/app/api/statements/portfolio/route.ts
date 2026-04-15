import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { INVESTOR_TYPE_LABELS } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const session = await getSession();
  let investorId = (session?.user as any)?.investorId;

  if (!investorId && session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { investor: { select: { id: true } } },
    });
    investorId = user?.investor?.id;
  }

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    include: {
      holdings: { include: { fund: true } },
    },
  });

  if (!investor) {
    return NextResponse.json({ error: "Investor not found" }, { status: 404 });
  }

  const now = new Date();
  const holdings = investor.holdings.map((h) => {
    const costValue = Number(h.totalCostValueCurrent);
    const marketValue = Number(h.totalMarketValue);
    const gain = marketValue - costValue;
    return {
      fundCode: h.fund.code,
      fundName: h.fund.name,
      totalUnits: Number(h.totalCurrentUnits),
      avgCost: Number(h.avgCost),
      nav: Number(h.nav),
      costValue,
      marketValue,
      gain,
      gainPercent: costValue > 0 ? (gain / costValue) * 100 : 0,
    };
  });

  const totalCost = holdings.reduce((s, h) => s + h.costValue, 0);
  const totalMarket = holdings.reduce((s, h) => s + h.marketValue, 0);

  return NextResponse.json({
    investorName: investor.name,
    investorCode: investor.investorCode,
    investorType: INVESTOR_TYPE_LABELS[investor.investorType] || investor.investorType,
    generatedDate: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    dateRange: {
      from: "01 Jan 2020",
      to: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    },
    holdings,
    totalCost,
    totalMarket,
    totalGain: totalMarket - totalCost,
  });
}
