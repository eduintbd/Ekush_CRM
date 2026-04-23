import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 86400;

/**
 * Annual Dividend History surfaced on the ekushwml.com marketing site's
 * 2-column table (Year | Annual Dividend %).
 *
 * Reads from DividendHistory (admin-entered: one row per fund/year with
 * the headline percentage), NOT the per-investor Dividend table —
 * aggregating the latter doesn't reliably match the business's published
 * figure. See web/CRM_CHANGES.md and the admin panel at
 * /admin/fund-reports for the data-entry surface.
 *
 * Response shape matches the rebuild's FundDividendRow type; fields the
 * marketing site doesn't render are kept as zero/null so older
 * consumers (if any) don't break.
 */
export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  const code = params.code.toUpperCase();
  const fund = await prisma.fund.findUnique({
    where: { code },
    select: { id: true },
  });
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

  const entries = await prisma.dividendHistory.findMany({
    where: { fundId: fund.id },
    orderBy: { year: "desc" },
    select: { year: true, annualDividendPct: true },
  });

  const rows = entries.map((e) => ({
    accountingYear: String(e.year),
    paymentDate: null,
    dividendPerUnit: 0,
    grossDividend: 0,
    taxRate: 0,
    netDividend: 0,
    annualDividendPct: e.annualDividendPct,
  }));

  return NextResponse.json(rows, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
    },
  });
}
