import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBDT } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { DownloadPortfolioStatement } from "@/components/statements/pdf-buttons";

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

  // Chart data
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

  // Capital gains
  const capitalGains = holdings.map((h) => ({
    fundCode: h.fund.code,
    fundName: h.fund.name,
    realizedGain: Number(h.totalRealizedGain),
    unrealizedGain: Number(h.totalUnrealizedGain),
    costValue: Number(h.totalCostValueCurrent),
    marketValue: Number(h.totalMarketValue),
  }));
  const totalRealized = capitalGains.reduce((s, h) => s + h.realizedGain, 0);
  const totalUnrealized = capitalGains.reduce((s, h) => s + h.unrealizedGain, 0);
  const totalCost = capitalGains.reduce((s, h) => s + h.costValue, 0);
  const totalMv = capitalGains.reduce((s, h) => s + h.marketValue, 0);

  return (
    <div className="space-y-8">
      {/* Portfolio Statements (formerly Capital Gain / Loss Report) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px]">Portfolio Statements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead>Fund</TableHead>
                <TableHead className="text-right">Cost Value</TableHead>
                <TableHead className="text-right">Market Value</TableHead>
                <TableHead className="text-right">Realized Gain</TableHead>
                <TableHead className="text-right">Unrealized Gain</TableHead>
                <TableHead className="text-right">Total Gain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {capitalGains.map((cg) => (
                <TableRow key={cg.fundCode}>
                  <TableCell className="font-medium text-text-dark">{cg.fundCode}</TableCell>
                  <TableCell className="text-right">{formatBDT(cg.costValue)}</TableCell>
                  <TableCell className="text-right">{formatBDT(cg.marketValue)}</TableCell>
                  <TableCell className={`text-right ${cg.realizedGain >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {formatBDT(cg.realizedGain)}
                  </TableCell>
                  <TableCell className={`text-right ${cg.unrealizedGain >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {formatBDT(cg.unrealizedGain)}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${(cg.realizedGain + cg.unrealizedGain) >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {formatBDT(cg.realizedGain + cg.unrealizedGain)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-page-bg">
                <TableCell className="font-semibold text-text-dark">Total</TableCell>
                <TableCell className="text-right font-semibold">{formatBDT(totalCost)}</TableCell>
                <TableCell className="text-right font-semibold">{formatBDT(totalMv)}</TableCell>
                <TableCell className={`text-right font-semibold ${totalRealized >= 0 ? "text-green-500" : "text-red-500"}`}>{formatBDT(totalRealized)}</TableCell>
                <TableCell className={`text-right font-semibold ${totalUnrealized >= 0 ? "text-green-500" : "text-red-500"}`}>{formatBDT(totalUnrealized)}</TableCell>
                <TableCell className={`text-right font-semibold ${(totalRealized + totalUnrealized) >= 0 ? "text-green-500" : "text-red-500"}`}>{formatBDT(totalRealized + totalUnrealized)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
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
