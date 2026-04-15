import { getSession } from "@/lib/auth";


import { prisma, withRetry } from "@/lib/prisma";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { Download } from "lucide-react";
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

async function getGoals(investorId: string) {
  return prisma.investmentGoal.findMany({
    where: { investorId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
}

export default async function StatementsPage() {
  let session;
  try { session = await getSession(); } catch { return <p className="text-text-body text-center py-20">Could not load. Please refresh.</p>; }
  let investorId = (session?.user as any)?.investorId;

  if (!investorId && session?.user?.id) {
    try {
      const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { investor: { select: { id: true } } } });
      investorId = u?.investor?.id;
    } catch {}
  }

  if (!investorId) {
    return <p className="text-text-body text-center py-20">Investor profile not found. Please log out and log back in.</p>;
  }

  let holdings: Awaited<ReturnType<typeof getHoldings>> = [];
  let goals: Awaited<ReturnType<typeof getGoals>> = [];
  try {
    [holdings, goals] = await withRetry(() =>
      Promise.all([getHoldings(investorId), getGoals(investorId)])
    );
  } catch (err) {
    console.error("Statements fetch error:", err);
    return <p className="text-text-body text-center py-20">Could not load statements. Please refresh the page.</p>;
  }

  // Build chart data
  let totalMarketValue = 0;
  let totalCostValue = 0;
  const fundsForChart = holdings.map((h) => {
    const mv = Number(h.totalMarketValue);
    totalMarketValue += mv;
    totalCostValue += Number(h.totalCostValueCurrent);
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[16px]">Portfolio Statements</CardTitle>
          <a
            href="/forms/portfolio-statement"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-[13px] bg-ekush-orange text-white rounded-[5px] hover:bg-ekush-orange-dark"
          >
            <Download className="w-4 h-4" /> Download PDF
          </a>
        </CardHeader>
        <CardContent className="p-0">
          <PortfolioStatementsTable holdings={tableRows} />
        </CardContent>
      </Card>

      {/* Fund Allocation + Goals side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px]">Fund Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <AllocationChart funds={fundsForChart} />
        </CardContent>
      </Card>

      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[16px] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" /> My Goals — Progress Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-page-bg rounded-[10px] p-4 mb-6">
              <p className="text-[13px] text-text-body">
                Your current portfolio value:{" "}
                <span className="font-bold text-text-dark">
                  BDT {Math.round(totalMarketValue).toLocaleString("en-IN")}
                </span>
                <span className="text-text-muted ml-2">
                  (Cost: BDT {Math.round(totalCostValue).toLocaleString("en-IN")})
                </span>
              </p>
            </div>

            <div className="space-y-4">
              {goals.map((goal) => {
                const progress = goal.targetAmount > 0
                  ? Math.min(100, (totalMarketValue / goal.targetAmount) * 100)
                  : 0;
                const remaining = Math.max(0, goal.targetAmount - totalMarketValue);
                const deadlineDate = new Date(goal.deadline);
                const nowDate = new Date();
                const monthsLeft = Math.max(0, (deadlineDate.getFullYear() - nowDate.getFullYear()) * 12 + (deadlineDate.getMonth() - nowDate.getMonth()));
                const onTrack = remaining <= 0 || (goal.monthlySip * monthsLeft >= remaining * 0.5);

                return (
                  <div key={goal.id} className="bg-page-bg rounded-[10px] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-[15px] font-semibold text-text-dark">{goal.name}</h3>
                        <p className="text-[12px] text-text-body mt-0.5">
                          Target: BDT {Math.round(goal.targetAmount).toLocaleString("en-IN")} | SIP: BDT {Math.round(goal.monthlySip).toLocaleString("en-IN")}/mo |{" "}
                          {goal.timePeriodYears}yr @ {goal.expectedReturn}% | Deadline: {deadlineDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        remaining <= 0
                          ? "bg-green-100 text-green-700"
                          : onTrack
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {remaining <= 0 ? "Achieved" : onTrack ? "On Track" : "Needs Attention"}
                      </span>
                    </div>

                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          remaining <= 0 ? "bg-green-500" : onTrack ? "bg-ekush-orange" : "bg-amber-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[12px] text-text-body">
                      <span>
                        Current: BDT {Math.round(totalMarketValue).toLocaleString("en-IN")} ({progress.toFixed(1)}%)
                      </span>
                      <span>
                        {remaining > 0
                          ? `Remaining: BDT ${Math.round(remaining).toLocaleString("en-IN")} | ${monthsLeft} months left`
                          : "Goal achieved!"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-center">
              <Link href="/goals" className="text-[13px] text-ekush-orange hover:underline font-medium">
                Manage Goals
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
