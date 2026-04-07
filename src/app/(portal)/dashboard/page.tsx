import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ActionCard } from "@/components/dashboard/action-card";
import { TrendingUp, Calendar, Coins, PieChart } from "lucide-react";

async function getFunds() {
  return prisma.fund.findMany({ orderBy: { code: "asc" } });
}

export default async function DashboardPage() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    return (
      <div className="text-center py-20 text-text-body">
        <p>Session error. Please <a href="/login" className="text-ekush-orange underline">login again</a>.</p>
      </div>
    );
  }

  const funds = await getFunds();

  return (
    <div className="space-y-8">
      {/* Quick Action Cards — 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActionCard
          href="/transactions/buy"
          label="Buy Units"
          icon={TrendingUp}
          iconColor="#2DAAB8"
          iconBg="#E8F8FA"
        />
        <ActionCard
          href="/transactions/sell"
          label="Sell Units"
          icon={Coins}
          iconColor="#F27023"
          iconBg="#FFF0E6"
        />
        <ActionCard
          href="/sip"
          label="Invest in SIP"
          icon={Calendar}
          iconColor="#E85D5D"
          iconBg="#FDE8E8"
        />
        <ActionCard
          href="/statements"
          label="Your Statement"
          icon={PieChart}
          iconColor="#2DAAB8"
          iconBg="#E8F8FA"
        />
      </div>

      {/* Fund Table */}
      <Card>
        <CardContent className="p-0 pt-5">
          <Table>
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead>Funds</TableHead>
                <TableHead>NAV</TableHead>
                <TableHead>Buy/ Sell Price</TableHead>
                <TableHead className="text-center">Annualized Rtn Fund</TableHead>
                <TableHead className="text-center">Annualized Rtn DSEX</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funds.map((fund) => {
                const nav = Number(fund.currentNav);
                const prevNav = Number(fund.previousNav);
                const returnPct = prevNav > 0 ? ((nav - prevNav) / prevNav) * 100 : 0;

                return (
                  <TableRow key={fund.id}>
                    <TableCell className="font-medium text-text-dark">{fund.name}</TableCell>
                    <TableCell className="font-medium text-text-dark">{nav.toFixed(2)}</TableCell>
                    <TableCell className="font-medium text-text-dark">{nav.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <span className={returnPct >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                        {returnPct >= 0 ? "" : ""}{returnPct.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-red-500 font-medium">—</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
