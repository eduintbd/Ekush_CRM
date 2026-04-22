import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FACE_VALUE } from "@/lib/constants";

export const revalidate = 86400;

export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  const code = params.code.toUpperCase();
  const fund = await prisma.fund.findUnique({
    where: { code },
    // faceValue is per-fund so we can support future funds launched at a
    // non-10 face; today every fund is 10 and falls through to FACE_VALUE.
    select: { id: true, faceValue: true },
  });
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

  const dividends = await prisma.dividend.groupBy({
    by: ["accountingYear", "paymentDate"],
    where: { fundId: fund.id },
    _sum: {
      totalUnits: true,
      grossDividend: true,
      taxAmount: true,
      netDividend: true,
    },
    _avg: { dividendPerUnit: true, taxRate: true },
    orderBy: { paymentDate: "desc" },
  });

  const face = Number(fund.faceValue || FACE_VALUE) || FACE_VALUE;

  const rows = dividends.map((d) => {
    const dividendPerUnit = d._avg.dividendPerUnit ?? 0;
    return {
      accountingYear: d.accountingYear,
      paymentDate: d.paymentDate,
      dividendPerUnit,
      grossDividend: d._sum.grossDividend ?? 0,
      taxRate: d._avg.taxRate ?? 0,
      netDividend: d._sum.netDividend ?? 0,
      // Consumed by the rebuild's 2-column Dividend History table; lets
      // marketing render "5.80%" without knowing the fund's face value.
      annualDividendPct: face > 0 ? (dividendPerUnit / face) * 100 : 0,
    };
  });

  return NextResponse.json(rows, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" },
  });
}
