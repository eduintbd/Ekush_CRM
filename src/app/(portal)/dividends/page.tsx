import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBDT, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

async function getDividends(investorId: string) {
  return prisma.dividend.findMany({
    where: { investorId },
    include: { fund: { select: { code: true, name: true } } },
    orderBy: { paymentDate: "desc" },
  });
}

export default async function DividendsPage() {
  const session = await getServerSession(authOptions);
  const investorId = (session?.user as any)?.investorId;

  if (!investorId) {
    return <p className="text-text-body text-center py-20">Investor profile not found.</p>;
  }

  const dividends = await getDividends(investorId);

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Dividend Statement</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-[16px]">Dividend History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {dividends.length === 0 ? (
            <p className="text-text-body text-sm text-center py-10">No dividend records available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Fund</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">DPS</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Option</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dividends.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-text-dark">{d.fund.code}</TableCell>
                    <TableCell>{d.accountingYear || "N/A"}</TableCell>
                    <TableCell className="text-right">{formatNumber(Number(d.totalUnits), 4)}</TableCell>
                    <TableCell className="text-right">{Number(d.dividendPerUnit).toFixed(4)}</TableCell>
                    <TableCell className="text-right">{formatBDT(Number(d.grossDividend))}</TableCell>
                    <TableCell className="text-right">{formatBDT(Number(d.taxAmount))}</TableCell>
                    <TableCell className="text-right font-medium text-text-dark">{formatBDT(Number(d.netDividend))}</TableCell>
                    <TableCell>
                      <Badge variant={d.dividendOption === "CIP" ? "default" : "outline"}>
                        {d.dividendOption}
                      </Badge>
                    </TableCell>
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
