import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 86400;

export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  const code = params.code.toUpperCase();
  const fund = await prisma.fund.findUnique({ where: { code }, select: { id: true } });
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

  const rows = dividends.map((d) => ({
    accountingYear: d.accountingYear,
    paymentDate: d.paymentDate,
    dividendPerUnit: d._avg.dividendPerUnit ?? 0,
    grossDividend: d._sum.grossDividend ?? 0,
    taxRate: d._avg.taxRate ?? 0,
    netDividend: d._sum.netDividend ?? 0,
  }));

  return NextResponse.json(rows, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" },
  });
}
