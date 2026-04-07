import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INVESTOR_TYPE_LABELS } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

function buildDateRange(year?: string | null): { gte?: Date; lt?: Date } | null {
  if (!year) return null;
  const y = parseInt(year);
  if (isNaN(y)) return null;
  // Bangladesh fiscal year: July of `year` → June of `year + 1`
  return { gte: new Date(y, 6, 1), lt: new Date(y + 1, 6, 1) };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const investorId = (session?.user as any)?.investorId;

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const fundCode = url.searchParams.get("fund");
  const direction = url.searchParams.get("type"); // BUY | SELL
  const year = url.searchParams.get("year");

  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    select: { name: true, investorCode: true, investorType: true },
  });
  if (!investor) {
    return NextResponse.json({ error: "Investor not found" }, { status: 404 });
  }

  const where: Prisma.TransactionWhereInput = { investorId };

  let fundLabel = "All funds";
  if (fundCode) {
    const fund = await prisma.fund.findUnique({
      where: { code: fundCode },
      select: { id: true, code: true, name: true },
    });
    if (fund) {
      where.fundId = fund.id;
      fundLabel = `${fund.code} — ${fund.name}`;
    }
  }

  if (direction === "BUY" || direction === "SELL") {
    where.direction = direction;
  }

  const dateRange = buildDateRange(year);
  if (dateRange) where.orderDate = dateRange;

  const transactions = await prisma.transaction.findMany({
    where,
    include: { fund: { select: { code: true, name: true } } },
    orderBy: { orderDate: "desc" },
  });

  const now = new Date();
  return NextResponse.json({
    investorName: investor.name,
    investorCode: investor.investorCode,
    investorType: INVESTOR_TYPE_LABELS[investor.investorType] || investor.investorType,
    generatedDate: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    filters: {
      fund: fundLabel,
      year: year ? `FY ${year}` : "All years",
      type: direction || "All types",
    },
    transactions: transactions.map((tx) => ({
      id: tx.id,
      orderDate: tx.orderDate.toISOString(),
      fundCode: tx.fund.code,
      direction: tx.direction,
      units: Number(tx.units),
      nav: Number(tx.nav),
      amount: Number(tx.amount),
    })),
  });
}
