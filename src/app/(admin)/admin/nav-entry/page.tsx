import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FUND_CODES, FUND_NAMES, FACE_VALUE } from "@/lib/constants";
import { NavInsertForm } from "@/components/admin/nav-insert-form";
import { NavSheetDownloadButton } from "@/components/admin/nav-sheet-download-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function NavEntryPage({
  searchParams,
}: {
  searchParams: { fund?: string; from?: string; to?: string; page?: string };
}) {
  const fundCode = searchParams.fund || "ALL";
  const from = searchParams.from ? new Date(searchParams.from) : null;
  const to = searchParams.to ? new Date(searchParams.to) : null;
  const page = Math.max(1, parseInt(searchParams.page || "1"));

  const funds = await prisma.fund.findMany({
    where: { code: { in: [...FUND_CODES] } },
    orderBy: { code: "asc" },
  });
  const fundById = new Map(funds.map((f) => [f.id, f]));

  const where: any = {};
  if (fundCode !== "ALL") {
    const f = funds.find((x) => x.code === fundCode);
    if (f) where.fundId = f.id;
  }
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = from;
    if (to) where.date.lte = to;
  }

  const [records, total] = await Promise.all([
    prisma.navRecord.findMany({
      where,
      orderBy: { date: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.navRecord.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build query string for pagination/filter links
  const params = new URLSearchParams();
  if (fundCode !== "ALL") params.set("fund", fundCode);
  if (searchParams.from) params.set("from", searchParams.from);
  if (searchParams.to) params.set("to", searchParams.to);
  const baseQs = params.toString();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">NAV Table</h1>
          <p className="text-[13px] text-text-body">Historical NAV records across all funds</p>
        </div>
      </div>

      {/* Insert new NAV entry */}
      <NavInsertForm
        funds={funds.map((f) => ({
          id: f.id,
          code: f.code,
          name: f.name,
          currentNav: Number(f.currentNav),
          entryLoad: Number(f.entryLoad),
          exitLoad: Number(f.exitLoad),
        }))}
      />

      {/* Filter toolbar */}
      <Card>
        <CardContent className="p-4">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-[11px] text-text-body block mb-1">Fund Type</label>
              <select
                name="fund"
                defaultValue={fundCode}
                className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange bg-white"
              >
                <option value="ALL">All Fund</option>
                {FUND_CODES.map((code) => (
                  <option key={code} value={code}>
                    {FUND_NAMES[code]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text-body block mb-1">From Date</label>
              <input
                type="date"
                name="from"
                defaultValue={searchParams.from || ""}
                className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-body block mb-1">To Date</label>
              <input
                type="date"
                name="to"
                defaultValue={searchParams.to || ""}
                className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark"
            >
              Apply Filter
            </button>
            {(fundCode !== "ALL" || searchParams.from || searchParams.to) && (
              <Link
                href="/admin/nav-entry"
                className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Clear
              </Link>
            )}
            <div className="ml-auto">
              <NavSheetDownloadButton
                fund={fundCode}
                from={searchParams.from}
                to={searchParams.to}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* NAV table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-3 border-b border-gray-100">
            <p className="text-[13px] text-text-body">
              Showing {records.length} of {total} NAV records
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Fund Name</TableHead>
                  <TableHead>NAV as On</TableHead>
                  <TableHead className="text-right">NAV per Unit</TableHead>
                  <TableHead className="text-right">Investor Return</TableHead>
                  <TableHead className="text-right">Buy Unit</TableHead>
                  <TableHead className="text-right">Sell Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-text-muted py-8">
                      No NAV records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => {
                    const fund = fundById.get(r.fundId);
                    const nav = Number(r.nav);
                    const face = Number(fund?.faceValue || FACE_VALUE);
                    const investorReturn = face > 0 ? ((nav - face) / face) * 100 : 0;
                    const entryLoad = Number(fund?.entryLoad || 0);
                    const exitLoad = Number(fund?.exitLoad || 0);
                    // Prefer stored values; fall back to computed values
                    const buyUnit = r.buyUnit != null ? Number(r.buyUnit) : nav * (1 + entryLoad);
                    const sellUnit = r.sellUnit != null ? Number(r.sellUnit) : nav * (1 - exitLoad);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-[13px] font-medium text-text-dark">
                          {fund?.name || "—"}
                        </TableCell>
                        <TableCell className="text-[13px] text-text-body">
                          {r.date.toISOString().split("T")[0]}
                        </TableCell>
                        <TableCell className="text-right text-[13px] font-mono">
                          {nav.toFixed(4)}
                        </TableCell>
                        <TableCell
                          className={`text-right text-[13px] font-mono ${
                            investorReturn >= 0 ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {investorReturn.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right text-[13px] font-mono">
                          {buyUnit.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right text-[13px] font-mono">
                          {sellUnit.toFixed(4)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <p className="text-[12px] text-text-body">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/nav-entry?${baseQs}${baseQs ? "&" : ""}page=${page - 1}`}
                    className="px-3 py-1.5 text-[12px] border rounded hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/nav-entry?${baseQs}${baseQs ? "&" : ""}page=${page + 1}`}
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

    </div>
  );
}
