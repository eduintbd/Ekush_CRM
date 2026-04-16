import { getSession } from "@/lib/auth";


import { prisma } from "@/lib/prisma";
import { formatNumber, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import type { Prisma } from "@prisma/client";

// Years to populate the year dropdown — current year and previous 4
const YEARS = (() => {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2, y - 3, y - 4];
})();

interface SearchParams {
  fund?: string;
  type?: string;
  year?: string;
  from?: string;
  to?: string;
}

function buildDateRange(year?: string): { gte?: Date; lt?: Date } | undefined {
  if (!year) return undefined;
  const y = parseInt(year);
  if (isNaN(y)) return undefined;
  // Bangladesh fiscal year: July of `year` → June of `year + 1`
  return { gte: new Date(y, 6, 1), lt: new Date(y + 1, 6, 1) };
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;

  if (!investorId) {
    return <p className="text-text-body text-center py-20">Investor profile not found.</p>;
  }

  // Resolve filters
  const funds = await prisma.fund.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
  const fundByCode = new Map(funds.map((f) => [f.code, f]));

  const where: Prisma.TransactionWhereInput = { investorId };
  if (searchParams.fund) {
    const f = fundByCode.get(searchParams.fund);
    if (f) where.fundId = f.id;
  }
  if (searchParams.type === "BUY" || searchParams.type === "SELL") {
    where.direction = searchParams.type;
  }
  // Date filtering: explicit from/to takes priority over fiscal year
  if (searchParams.from || searchParams.to) {
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (searchParams.from) dateFilter.gte = new Date(searchParams.from);
    if (searchParams.to) {
      const toDate = new Date(searchParams.to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }
    where.orderDate = dateFilter;
  } else {
    const dateRange = buildDateRange(searchParams.year);
    if (dateRange) {
      where.orderDate = dateRange;
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { fund: { select: { code: true, name: true } } },
    orderBy: { orderDate: "asc" },
  });

  const lumpsum = transactions.filter((t) => t.channel === "LS");
  const sip = transactions.filter((t) => t.channel === "SIP");

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">All Transactions</h1>

      <TransactionFilters funds={funds} years={YEARS} />

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <p className="text-text-body text-sm text-center py-8">No transactions found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <TransactionSection title="Lumpsum History" rows={lumpsum} />
          <TransactionSection title="SIP History" rows={sip} />
        </>
      )}
    </div>
  );
}

function TransactionSection({
  title,
  rows,
}: {
  title: string;
  rows: {
    id: string;
    orderDate: Date;
    direction: string;
    units: number;
    nav: number;
    amount: number;
    fund: { code: string };
  }[];
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-text-dark font-rajdhani">{title}</h2>
        </div>
        {rows.length === 0 ? (
          <p className="text-text-body text-sm text-center py-6">No {title.toLowerCase()} in this range.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead>No.</TableHead>
                <TableHead>Txn date</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead>Txn type</TableHead>
                <TableHead className="text-right">No. of units</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((tx, idx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-text-dark">{idx + 1}</TableCell>
                  <TableCell className="whitespace-nowrap text-text-dark">{formatDate(tx.orderDate)}</TableCell>
                  <TableCell className="text-text-dark">{tx.fund.code}</TableCell>
                  <TableCell>
                    <span className={tx.direction === "SELL" ? "text-ekush-orange font-medium" : "text-text-dark font-medium"}>
                      {tx.direction === "BUY" ? "Buy" : "Sell"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-text-dark">
                    {formatNumber(Number(tx.units), 0)}
                  </TableCell>
                  <TableCell className="text-right text-text-dark">
                    {Number(tx.nav).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-text-dark">
                    {formatNumber(Number(tx.amount), 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
