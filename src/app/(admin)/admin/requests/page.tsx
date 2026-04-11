import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBDT, formatDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: { code?: string; type?: string; status?: string; page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const code = (searchParams.code || "").trim();
  const type = searchParams.type || "ALL"; // ALL | BUY | SELL | SIP
  const status = searchParams.status || "ALL"; // ALL | PENDING | EXECUTED | REJECTED

  // Requests = Transaction rows (BUY/SELL, LS or SIP channel)
  const where: any = {};

  if (code) {
    where.investor = { investorCode: { contains: code, mode: "insensitive" } };
  }
  if (type === "BUY") where.direction = "BUY";
  if (type === "SELL") where.direction = "SELL";
  if (type === "SIP") where.channel = "SIP";
  if (status !== "ALL") where.status = status;

  const [transactions, total, sipPlans] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        investor: { select: { id: true, investorCode: true, name: true } },
        fund: { select: { code: true, name: true } },
      },
      orderBy: { orderDate: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.transaction.count({ where }),
    // Also show active SIP plans separately when type is SIP or ALL
    type === "SIP" || type === "ALL"
      ? prisma.sipPlan.findMany({
          where: code
            ? { investor: { investorCode: { contains: code, mode: "insensitive" } } }
            : {},
          include: {
            investor: { select: { id: true, investorCode: true, name: true } },
            fund: { select: { code: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Investor Requests</h1>
        <p className="text-[13px] text-text-body">View BUY, SELL and SIP requests across all investors</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] text-text-body block mb-1">Investor Code</label>
              <input
                type="text"
                name="code"
                defaultValue={code}
                placeholder="e.g., A00055"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-body block mb-1">Type</label>
              <select name="type" defaultValue={type} className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange">
                <option value="ALL">All Types</option>
                <option value="BUY">Buy Only</option>
                <option value="SELL">Sell Only</option>
                <option value="SIP">SIP Only</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text-body block mb-1">Status</label>
              <select name="status" defaultValue={status} className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange">
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROCESS">In Process</option>
                <option value="EXECUTED">Executed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <button type="submit" className="px-4 py-2 text-sm bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark">
              Filter
            </button>
            {(code || type !== "ALL" || status !== "ALL") && (
              <Link href="/admin/requests" className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Clear</Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-3 border-b border-gray-100">
            <p className="text-[13px] text-text-body">Showing {transactions.length} of {total} requests</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Investor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead>NAV</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-text-muted py-8">No requests found</TableCell></TableRow>
                ) : (
                  transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-[12px] whitespace-nowrap">{formatDate(t.orderDate)}</TableCell>
                      <TableCell className="text-[12px]">
                        <Link href={`/admin/investors/${t.investor.id}`} className="hover:text-ekush-orange">
                          <span className="font-mono">{t.investor.investorCode}</span>
                          <br />
                          <span className="text-text-body text-[11px]">{t.investor.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${t.direction === "BUY" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {t.direction} {t.channel === "SIP" ? "· SIP" : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-[12px] font-medium">{t.fund.code}</TableCell>
                      <TableCell className="text-right text-[12px]">{formatBDT(Number(t.amount))}</TableCell>
                      <TableCell className="text-right text-[12px]">{Number(t.units).toFixed(2)}</TableCell>
                      <TableCell className="text-[12px]">{Number(t.nav).toFixed(4)}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "EXECUTED" ? "active" : t.status === "REJECTED" ? "danger" : "pending"}>
                          {t.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <p className="text-[12px] text-text-body">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/requests?page=${page - 1}&code=${code}&type=${type}&status=${status}`}
                    className="px-3 py-1.5 text-[12px] border rounded hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/requests?page=${page + 1}&code=${code}&type=${type}&status=${status}`}
                    className="px-3 py-1.5 text-[12px] border rounded hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active SIP plans (if applicable) */}
      {sipPlans.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-3 border-b border-gray-100">
              <h2 className="text-[14px] font-semibold text-text-dark">Recent SIP Plans</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Created</TableHead>
                  <TableHead>Investor</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Monthly Amount</TableHead>
                  <TableHead>Debit Day</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sipPlans.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-[12px]">{formatDate(s.createdAt)}</TableCell>
                    <TableCell className="text-[12px]">
                      <Link href={`/admin/investors/${s.investor.id}`} className="hover:text-ekush-orange">
                        <span className="font-mono">{s.investor.investorCode}</span> · {s.investor.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[12px] font-medium">{s.fund.code}</TableCell>
                    <TableCell className="text-right text-[12px]">{formatBDT(Number(s.amount))}</TableCell>
                    <TableCell className="text-[12px]">{s.debitDay}</TableCell>
                    <TableCell className="text-[12px]">{formatDate(s.startDate)}</TableCell>
                    <TableCell><Badge variant={s.status === "ACTIVE" ? "active" : "pending"}>{s.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
