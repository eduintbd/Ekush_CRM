import { prisma, withRetry } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVESTOR_TYPE_LABELS } from "@/lib/constants";
import { DeleteInvestorButton } from "@/components/admin/delete-investor-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminInvestorsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const query = (searchParams.q || "").trim();

  // PENDING investors live on the dashboard as "Pending KYC" and are hidden
  // here until an admin approves them and assigns a real investor code.
  const baseFilter = { user: { status: { not: "PENDING" } } };
  const where = query
    ? {
        ...baseFilter,
        OR: [
          { investorCode: { contains: query, mode: "insensitive" as const } },
          { name: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : baseFilter;

  const [investors, total] = await withRetry(() =>
    Promise.all([
      prisma.investor.findMany({
        where,
        include: {
          user: { select: { status: true, email: true, phone: true } },
          holdings: {
            select: {
              id: true,
              fund: { select: { code: true } },
            },
          },
        },
        orderBy: { investorCode: "asc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),
      prisma.investor.count({ where }),
    ])
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Investors</h1>
          <p className="text-[13px] text-text-body">{total} {query ? "matching" : "total"} investors</p>
        </div>
        <form method="GET" className="flex items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search by code or name..."
            className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange w-64"
          />
          <button type="submit" className="px-3 py-2 text-sm bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark transition-colors">
            Search
          </button>
          <a
            href="/api/admin/investors/export"
            className="px-3 py-2 text-sm bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark transition-colors"
          >
            Export to Excel
          </a>
          {query && (
            <Link href="/admin/investors" className="px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Clear</Link>
          )}
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Funds</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investors.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm text-text-dark">{inv.investorCode}</TableCell>
                    <TableCell className="font-medium text-text-dark">{inv.name}</TableCell>
                    <TableCell className="text-sm text-text-body">
                      {INVESTOR_TYPE_LABELS[inv.investorType] || inv.investorType}
                    </TableCell>
                    <TableCell>
                      <Badge variant={inv.user.status === "ACTIVE" ? "active" : "pending"}>
                        {inv.user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {inv.holdings.map((h) => (
                          <Badge key={h.id} variant="outline" className="text-[10px]">
                            {h.fund.code}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-text-body">
                      {inv.user.email || inv.user.phone || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/investors/${inv.id}`}
                          className="text-ekush-orange hover:underline text-sm"
                        >
                          View
                        </Link>
                        <DeleteInvestorButton
                          investorId={inv.id}
                          investorName={inv.name}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-text-body/10">
              <p className="text-[13px] text-text-body">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/investors?page=${page - 1}`}
                    className="px-3 py-1.5 text-[13px] bg-page-bg text-text-dark rounded-[5px] hover:bg-ekush-orange hover:text-white transition-colors"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/investors?page=${page + 1}`}
                    className="px-3 py-1.5 text-[13px] bg-page-bg text-text-dark rounded-[5px] hover:bg-ekush-orange hover:text-white transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
