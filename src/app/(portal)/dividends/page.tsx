import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBDT, formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DividendFilters } from "@/components/statements/dividend-filters";

export default async function DividendsPage({
  searchParams,
}: {
  searchParams: { fund?: string; year?: string };
}) {
  const session = await getSession();
  let investorId = (session?.user as any)?.investorId;
  if (!investorId && session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { investor: { select: { id: true } } } });
    investorId = user?.investor?.id;
  }
  if (!investorId) return <p className="text-text-body text-center py-20">Investor profile not found.</p>;

  const where: any = { investorId };
  if (searchParams.fund) {
    const fund = await prisma.fund.findUnique({ where: { code: searchParams.fund } });
    if (fund) where.fundId = fund.id;
  }
  if (searchParams.year) {
    where.accountingYear = searchParams.year;
  }

  const dividends = await prisma.dividend.findMany({
    where,
    include: { fund: { select: { code: true, name: true } } },
    orderBy: { paymentDate: "desc" },
  });

  // Get all dividends for filter options (unfiltered)
  const allDividends = await prisma.dividend.findMany({
    where: { investorId },
    select: { fund: { select: { code: true } }, accountingYear: true },
  });
  const fundCodes = [...new Set(allDividends.map((d) => d.fund.code))];
  const years = [...new Set(allDividends.map((d) => d.accountingYear).filter(Boolean))] as string[];

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Dividend Statement</h1>

      <DividendFilters
        fundCodes={fundCodes}
        years={years.sort().reverse()}
        currentFund={searchParams.fund}
        currentYear={searchParams.year}
        investorId={investorId}
      />

      <Card>
        <CardContent className="p-0">
          {dividends.length === 0 ? (
            <p className="text-text-body text-sm text-center py-10">No dividend records match the selected filters.</p>
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
                    <TableCell className="text-text-dark font-medium">{d.fund.code}</TableCell>
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
