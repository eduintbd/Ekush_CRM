import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Home-page KPIs for the marketing site. Publicly readable — no auth, safe
// cross-origin. Revalidate hourly so we're not hammering the DB every
// pageview; stale-while-revalidate keeps traffic unaffected by rebuilds.
export const revalidate = 3600;

const toBdtMn = (n: number | null | undefined) => Math.round(((n ?? 0) / 1_000_000) * 10) / 10;

export async function GET() {
  try {
    const [investorCounts, fundAum, dividendTotal, withdrawalsTotal] =
      await Promise.all([
        // Exclude PENDING investors (self-registrations awaiting approval).
        prisma.investor.groupBy({
          by: ["investorType"],
          where: { user: { status: { not: "PENDING" } } },
          _count: true,
        }),
        prisma.fund.aggregate({ _sum: { totalAum: true } }),
        prisma.dividend.aggregate({ _sum: { grossDividend: true } }),
        prisma.transaction.aggregate({
          where: { direction: "SELL", status: "EXECUTED" },
          _sum: { amount: true },
        }),
      ]);

    const individual =
      investorCounts.find((c) => c.investorType === "INDIVIDUAL")?._count ?? 0;
    const total = investorCounts.reduce((s, c) => s + c._count, 0);
    // Corporate = every non-INDIVIDUAL bucket (companies, MFs, provident &
    // gratuity funds). Split once product confirms the taxonomy.
    const corporate = total - individual;

    return NextResponse.json(
      {
        happyClients: { total, individual, corporate },
        aumBdtMn: toBdtMn(fundAum._sum.totalAum),
        valueGeneratedBdtMn: toBdtMn(dividendTotal._sum.grossDividend),
        withdrawalsBdtMn: toBdtMn(withdrawalsTotal._sum.amount),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "stats aggregation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
