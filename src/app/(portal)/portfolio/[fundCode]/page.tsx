import { getSession } from "@/lib/auth";


import { prisma } from "@/lib/prisma";
import { formatBDT, formatNumber, formatPercent } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FUND_DESCRIPTIONS } from "@/lib/constants";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

export default async function FundDetailPage({ params }: { params: { fundCode: string } }) {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;
  const { fundCode } = params;

  if (!investorId) {
    return <p className="text-gray-500 text-center py-20">Investor profile not found.</p>;
  }

  const fund = await prisma.fund.findUnique({ where: { code: fundCode.toUpperCase() } });
  if (!fund) {
    return <p className="text-gray-500 text-center py-20">Fund not found.</p>;
  }

  const holding = await prisma.fundHolding.findFirst({
    where: { investorId, fundId: fund.id },
  });

  const transactions = await prisma.transaction.findMany({
    where: { investorId, fundId: fund.id, status: "EXECUTED" },
    orderBy: { orderDate: "desc" },
    take: 20,
  });

  const navRecords = await prisma.navRecord.findMany({
    where: { fundId: fund.id },
    orderBy: { date: "desc" },
    take: 30,
  });

  const marketValue = Number(holding?.totalMarketValue || 0);
  const costValue = Number(holding?.totalCostValueCurrent || 0);
  const gain = marketValue - costValue;
  const gainPct = costValue > 0 ? (gain / costValue) * 100 : 0;
  const isPositive = gain >= 0;

  return (
    <div className="space-y-6">
      <Link href="/portfolio" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Portfolio
      </Link>

      {/* Fund Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{fund.name}</h1>
              <p className="text-sm text-gray-500">{fund.code} | {fund.fundType}</p>
              <p className="text-sm text-gray-600 mt-1">{FUND_DESCRIPTIONS[fund.code as keyof typeof FUND_DESCRIPTIONS] || fund.description}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Current NAV</p>
              <p className="text-3xl font-bold text-gray-800">{Number(fund.currentNav).toFixed(4)}</p>
              <p className="text-xs text-gray-400">Face Value: {Number(fund.faceValue).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings Summary */}
      {holding ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Current Units</p>
            <p className="text-lg font-bold">{formatNumber(Number(holding.totalCurrentUnits), 4)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Avg Cost</p>
            <p className="text-lg font-bold">{Number(holding.avgCost).toFixed(4)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Cost Value</p>
            <p className="text-lg font-bold">{formatBDT(costValue)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Market Value</p>
            <p className="text-lg font-bold">{formatBDT(marketValue)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Gain/Loss</p>
            <p className={`text-lg font-bold flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {formatPercent(gainPct)}
            </p>
          </CardContent></Card>
        </div>
      ) : (
        <Card><CardContent className="p-6 text-center text-gray-500">You don&apos;t have holdings in this fund.</CardContent></Card>
      )}

      {/* LS vs SIP Breakdown */}
      {holding && (
        <Card>
          <CardHeader><CardTitle className="text-base">Channel Breakdown</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Units Bought</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Current Units</TableHead>
                  <TableHead className="text-right">Cost Value</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell><Badge>Lump Sum</Badge></TableCell>
                  <TableCell className="text-right">{formatNumber(Number(holding.lsUnitsBought), 4)}</TableCell>
                  <TableCell className="text-right">{formatNumber(Number(holding.lsUnitsSold), 4)}</TableCell>
                  <TableCell className="text-right">{formatNumber(Number(holding.lsCurrentUnits), 4)}</TableCell>
                  <TableCell className="text-right">{formatBDT(Number(holding.lsCostValueCurrent))}</TableCell>
                  <TableCell className="text-right">{formatBDT(Number(holding.lsMarketValue))}</TableCell>
                  <TableCell className="text-right">{Number(holding.lsAvgCost).toFixed(4)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Badge variant="success">SIP</Badge></TableCell>
                  <TableCell className="text-right">{formatNumber(Number(holding.sipUnitsBought), 4)}</TableCell>
                  <TableCell className="text-right">{formatNumber(Number(holding.sipUnitsSold), 4)}</TableCell>
                  <TableCell className="text-right">{formatNumber(Number(holding.sipCurrentUnits), 4)}</TableCell>
                  <TableCell className="text-right">{formatBDT(Number(holding.sipCostValueCurrent))}</TableCell>
                  <TableCell className="text-right">{formatBDT(Number(holding.sipMarketValue))}</TableCell>
                  <TableCell className="text-right">{Number(holding.sipAvgCost).toFixed(4)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions in this fund */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Transactions in {fund.code}</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No transactions in this fund.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">NAV</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.orderDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                    <TableCell><Badge variant={tx.channel === "SIP" ? "success" : "default"}>{tx.channel}</Badge></TableCell>
                    <TableCell><Badge variant={tx.direction === "BUY" ? "success" : "danger"}>{tx.direction}</Badge></TableCell>
                    <TableCell className="text-right">{formatBDT(Number(tx.amount))}</TableCell>
                    <TableCell className="text-right">{Number(tx.nav).toFixed(4)}</TableCell>
                    <TableCell className="text-right">{formatNumber(Number(tx.units), 4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
