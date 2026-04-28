import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBDT, formatDate } from "@/lib/utils";
import { StatementDownloadBar } from "@/components/admin/statement-download-bar";
import {
  PortfolioStatementsTable,
  type HoldingRow,
} from "@/components/statements/portfolio-statements-table";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminStatementsPage({
  searchParams,
}: {
  searchParams: { investorId?: string; code?: string; tab?: string };
}) {
  const tab = searchParams.tab || "portfolio";
  const code = (searchParams.code || "").trim();

  // Resolve investor by id or code
  let investor: any = null;
  if (searchParams.investorId) {
    investor = await prisma.investor.findUnique({
      where: { id: searchParams.investorId },
      include: {
        user: { select: { email: true, phone: true, status: true } },
        holdings: { include: { fund: true } },
        transactions: { include: { fund: true }, orderBy: { orderDate: "desc" } },
        dividends: { include: { fund: true }, orderBy: { paymentDate: "desc" } },
        taxCertificates: { include: { fund: true }, orderBy: { periodEnd: "desc" } },
      },
    });
  } else if (code) {
    investor = await prisma.investor.findFirst({
      where: { investorCode: { equals: code, mode: "insensitive" as const } },
      include: {
        user: { select: { email: true, phone: true, status: true } },
        holdings: { include: { fund: true } },
        transactions: { include: { fund: true }, orderBy: { orderDate: "desc" } },
        dividends: { include: { fund: true }, orderBy: { paymentDate: "desc" } },
        taxCertificates: { include: { fund: true }, orderBy: { periodEnd: "desc" } },
      },
    });
  }

  const tabs = [
    { key: "portfolio", label: "Portfolio" },
    { key: "transactions", label: "Transactions" },
    { key: "dividends", label: "Dividends" },
    { key: "tax", label: "Tax Certificates" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Investor Statements</h1>
        <p className="text-[13px] text-text-body">Search by investor code to view and download statements</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <form method="GET" className="flex items-end gap-3">
            <div className="flex-1 max-w-md">
              <label className="text-[11px] text-text-body block mb-1">Investor Code</label>
              <input
                type="text"
                name="code"
                defaultValue={code || investor?.investorCode || ""}
                placeholder="e.g., A00055"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange"
              />
            </div>
            <button type="submit" className="px-4 py-2 text-sm bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark">
              Load
            </button>
          </form>
        </CardContent>
      </Card>

      {!investor && (code || searchParams.investorId) && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-text-muted text-sm">No investor found with that code.</p>
          </CardContent>
        </Card>
      )}

      {investor && (
        <>
          {/* Investor summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-text-dark">{investor.name}</p>
                  <p className="text-[12px] text-text-body">
                    <span className="font-mono">{investor.investorCode}</span>
                    {investor.user.email && ` · ${investor.user.email}`}
                    {investor.user.phone && ` · ${investor.user.phone}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={investor.user.status === "ACTIVE" ? "active" : "pending"}>{investor.user.status}</Badge>
                  <Link
                    href={`/admin/investors/${investor.id}`}
                    className="px-3 py-1.5 text-[12px] bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark"
                  >
                    Full Profile
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`/admin/statements?investorId=${investor.id}&tab=${t.key}`}
                className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.key
                    ? "border-ekush-orange text-ekush-orange"
                    : "border-transparent text-text-body hover:text-text-dark"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {/* Portfolio tab — same expandable table the investor sees
              on the portal: each fund row reveals No of Units, Total
              Cost Value, CIP Units, CIP Unit Value, Unit Cost, NAV,
              Total Market Value, Dividend, Unrealized Gain, Realized
              Gain (tax period), and Annualized Return, and exposes a
              per-fund "Investment Update" PDF link that hits the same
              /forms/investment-update print page the portal uses
              (with investorId so the print page renders THIS
              investor's data, not the admin's). */}
          {tab === "portfolio" && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <CardTitle className="text-[14px]">Portfolio Holdings</CardTitle>
                  <StatementDownloadBar investorId={investor.id} type="portfolio" showDateFilter={false} />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {investor.holdings.length === 0 ? (
                  <div className="px-4 py-6 text-center text-text-muted text-sm">No holdings</div>
                ) : (
                  <PortfolioStatementsTable
                    investorId={investor.id}
                    holdings={investor.holdings.map((h: any): HoldingRow => {
                      const totalCurrentUnits = Number(h.totalCurrentUnits);
                      const costValue = Number(h.totalCostValueCurrent);
                      const nav = Number(h.nav) || Number(h.fund.currentNav);
                      const marketValue = Number(h.totalMarketValue) || totalCurrentUnits * nav;
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
                        grossDividend: Number(h.grossDividend),
                        realizedGain: Number(h.totalRealizedGain),
                        unrealizedGain: Number(h.totalUnrealizedGain),
                        // FundHolding doesn't track per-tax-period
                        // realized gain — schema parity with the portal
                        // page, which also shows 0 here until that
                        // reporting period field exists.
                        realizedGainTaxPeriod: 0,
                        annualizedReturn: Number(h.annualizedReturn) || 0,
                      };
                    })}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Transactions tab */}
          {tab === "transactions" && (
            <Card>
              <CardHeader>
                <div className="space-y-3">
                  <CardTitle className="text-[14px]">Transaction History</CardTitle>
                  <StatementDownloadBar investorId={investor.id} type="transactions" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-0 hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead>NAV</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investor.transactions.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-text-muted">No transactions</TableCell></TableRow>
                    ) : (
                      investor.transactions.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-[12px]">{formatDate(t.orderDate)}</TableCell>
                          <TableCell className="text-[12px] font-medium">{t.fund.code}</TableCell>
                          <TableCell className="text-[12px]">{t.direction}{t.channel === "SIP" ? " (SIP)" : ""}</TableCell>
                          <TableCell className="text-right text-[12px]">{formatBDT(Number(t.amount))}</TableCell>
                          <TableCell className="text-right text-[12px]">{Number(t.units).toFixed(2)}</TableCell>
                          <TableCell className="text-[12px]">{Number(t.nav).toFixed(4)}</TableCell>
                          <TableCell><Badge variant={t.status === "EXECUTED" ? "active" : t.status === "REJECTED" ? "danger" : "pending"}>{t.status}</Badge></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Dividends tab */}
          {tab === "dividends" && (
            <Card>
              <CardHeader>
                <div className="space-y-3">
                  <CardTitle className="text-[14px]">Dividend History</CardTitle>
                  <StatementDownloadBar investorId={investor.id} type="dividends" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-0 hover:bg-transparent">
                      <TableHead>Year</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">DPU</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Option</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investor.dividends.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center text-text-muted">No dividends</TableCell></TableRow>
                    ) : (
                      investor.dividends.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-[12px]">{d.accountingYear}</TableCell>
                          <TableCell className="text-[12px] font-medium">{d.fund.code}</TableCell>
                          <TableCell className="text-[12px]">{d.paymentDate ? formatDate(d.paymentDate) : "—"}</TableCell>
                          <TableCell className="text-right text-[12px]">{Number(d.totalUnits).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-[12px]">{Number(d.dividendPerUnit).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-[12px]">{formatBDT(Number(d.grossDividend))}</TableCell>
                          <TableCell className="text-right text-[12px] text-red-500">-{formatBDT(Number(d.taxAmount))}</TableCell>
                          <TableCell className="text-right text-[12px] text-green-600 font-medium">{formatBDT(Number(d.netDividend))}</TableCell>
                          <TableCell className="text-[12px]">{d.dividendOption}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Tax tab */}
          {tab === "tax" && (
            <Card>
              <CardHeader>
                <div className="space-y-3">
                  <CardTitle className="text-[14px]">Tax Certificates</CardTitle>
                  <StatementDownloadBar investorId={investor.id} type="tax" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-0 hover:bg-transparent">
                      <TableHead>Period</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead className="text-right">Net Investment</TableHead>
                      <TableHead className="text-right">Realized Gain</TableHead>
                      <TableHead className="text-right">Gross Dividend</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investor.taxCertificates.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-text-muted">No tax certificates</TableCell></TableRow>
                    ) : (
                      investor.taxCertificates.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-[12px]">{c.periodStart ? formatDate(c.periodStart) : "—"} – {c.periodEnd ? formatDate(c.periodEnd) : "—"}</TableCell>
                          <TableCell className="text-[12px] font-medium">{c.fund.code}</TableCell>
                          <TableCell className="text-right text-[12px]">{formatBDT(Number(c.netInvestment))}</TableCell>
                          <TableCell className="text-right text-[12px]">{formatBDT(Number(c.totalRealizedGain))}</TableCell>
                          <TableCell className="text-right text-[12px]">{formatBDT(Number(c.totalGrossDividend))}</TableCell>
                          <TableCell className="text-right text-[12px] text-red-500">{formatBDT(Number(c.totalTax))}</TableCell>
                          <TableCell>
                            <a
                              href={`/api/statements/tax-certificate?id=${c.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-ekush-orange hover:underline text-[12px]"
                            >
                              View
                            </a>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
