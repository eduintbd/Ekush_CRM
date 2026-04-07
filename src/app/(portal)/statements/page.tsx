import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { DownloadPortfolioStatement } from "@/components/statements/pdf-buttons";
import {
  PortfolioStatementsTable,
  type HoldingRow,
} from "@/components/statements/portfolio-statements-table";

async function getHoldings(investorId: string) {
  return prisma.fundHolding.findMany({
    where: { investorId },
    include: { fund: { select: { code: true, name: true } } },
  });
}

export default async function StatementsPage() {
  const session = await getServerSession(authOptions);
  const investorId = (session?.user as any)?.investorId;

  if (!investorId) {
    return <p className="text-text-body text-center py-20">Investor profile not found.</p>;
  }

  const holdings = await getHoldings(investorId);

  // Build chart data
  let totalMarketValue = 0;
  const fundsForChart = holdings.map((h) => {
    const mv = Number(h.totalMarketValue);
    totalMarketValue += mv;
    return {
      fundCode: h.fund.code,
      fundName: h.fund.name,
      marketValue: mv,
      weight: 0,
    };
  });
  fundsForChart.forEach((f) => {
    f.weight = totalMarketValue > 0 ? (f.marketValue / totalMarketValue) * 100 : 0;
  });

  // Build expandable row data with computed annualized return
  const now = Date.now();
  const tableRows: HoldingRow[] = holdings.map((h) => {
    const totalCurrentUnits = Number(h.totalCurrentUnits);
    const costValue = Number(h.totalCostValueCurrent);
    const marketValue = Number(h.totalMarketValue);
    const realizedGain = Number(h.totalRealizedGain);
    const unrealizedGain = Number(h.totalUnrealizedGain);
    const grossDividend = Number(h.grossDividend);
    const nav = Number(h.nav);

    // Annualized total return — computed from the aggregate fields the user
    // specified: Total Realized Gain, Total Dividend Income, Current NAV,
    // Total Units Invested. Faithful approximation of the T. History XIRR.
    const computedMarketValue = totalCurrentUnits * nav;
    const totalGain =
      realizedGain + grossDividend + (computedMarketValue - costValue);
    const totalReturn = costValue > 0 ? totalGain / costValue : 0;
    const startDate = h.firstPurchaseDate ?? h.createdAt;
    const yearsHeld = Math.max(
      0.01,
      (now - new Date(startDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    const annualized =
      totalReturn > -1
        ? (Math.pow(1 + totalReturn, 1 / yearsHeld) - 1) * 100
        : 0;

    return {
      id: h.id,
      fundCode: h.fund.code,
      fundName: h.fund.name,
      totalCurrentUnits,
      sipCurrentUnits: Number(h.sipCurrentUnits),
      avgCost: Number(h.avgCost),
      costValue,
      sipMarketValue: Number(h.sipMarketValue),
      nav,
      marketValue,
      grossDividend,
      realizedGain,
      unrealizedGain,
      // Schema doesn't track per-tax-period gain — placeholder until reporting period field exists
      realizedGainTaxPeriod: 0,
      annualizedReturn: annualized,
    };
  });

  return (
    <div className="space-y-8">
      {/* Portfolio Statements (formerly Capital Gain / Loss Report) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px]">Portfolio Statements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PortfolioStatementsTable holdings={tableRows} />
        </CardContent>
      </Card>

      {/* Charts Row — Fund Weight + Portfolio Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[16px]">Fund weight</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationChart funds={fundsForChart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[16px]">Portfolio Performance</CardTitle>
            <DownloadPortfolioStatement />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-text-body text-sm">
              <p>Performance chart based on NAV history</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
