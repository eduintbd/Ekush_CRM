import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVESTOR_TYPE_LABELS } from "@/lib/constants";
import { formatBDT, formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminEditInvestorForm } from "@/components/admin/edit-investor-form";
import { AdminRegistrationPreview } from "@/components/admin/admin-registration-preview";

export const dynamic = "force-dynamic";

export default async function AdminInvestorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const investor = await prisma.investor.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      holdings: { include: { fund: true } },
      transactions: {
        include: { fund: true },
        orderBy: { orderDate: "desc" },
        take: 20,
      },
      sipPlans: { include: { fund: true }, orderBy: { createdAt: "desc" } },
      dividends: { include: { fund: true }, orderBy: { paymentDate: "desc" }, take: 10 },
      taxCertificates: { include: { fund: true }, orderBy: { periodEnd: "desc" }, take: 10 },
      bankAccounts: true,
      nominees: true,
      documents: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!investor) notFound();

  const totalMarketValue = investor.holdings.reduce(
    (sum, h) => sum + Number(h.totalCurrentUnits) * Number(h.fund.currentNav),
    0
  );
  const totalCost = investor.holdings.reduce(
    (sum, h) => sum + Number(h.totalCostValueCurrent),
    0
  );
  const unrealizedGain = totalMarketValue - totalCost;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/investors" className="text-[12px] text-text-body hover:text-ekush-orange flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3 h-3" /> Back to investors
          </Link>
          <h1 className="text-[22px] font-semibold text-text-dark font-rajdhani">{investor.name}</h1>
          <p className="text-[13px] text-text-body">
            <span className="font-mono">{investor.investorCode}</span> · {INVESTOR_TYPE_LABELS[investor.investorType] || investor.investorType}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={investor.user.status === "ACTIVE" ? "active" : "pending"}>{investor.user.status}</Badge>
          <Link
            href={`/admin/statements?investorId=${investor.id}`}
            className="px-3 py-1.5 text-[12px] bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark"
          >
            View Statements
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-text-body uppercase">Total Cost</p>
            <p className="text-[18px] font-semibold text-text-dark font-rajdhani">{formatBDT(totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-text-body uppercase">Market Value</p>
            <p className="text-[18px] font-semibold text-text-dark font-rajdhani">{formatBDT(totalMarketValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-text-body uppercase">Unrealized Gain</p>
            <p className={`text-[18px] font-semibold font-rajdhani ${unrealizedGain >= 0 ? "text-green-600" : "text-red-500"}`}>
              {formatBDT(unrealizedGain)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-text-body uppercase">Active SIPs</p>
            <p className="text-[18px] font-semibold text-text-dark font-rajdhani">
              {investor.sipPlans.filter((s) => s.status === "ACTIVE").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profile edit */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[14px]">Profile (Admin Edit)</CardTitle>
          <AdminRegistrationPreview investorId={investor.id} />
        </CardHeader>
        <CardContent>
          <AdminEditInvestorForm
            investorId={investor.id}
            userId={investor.userId}
            initial={{
              name: investor.name,
              email: investor.user.email || "",
              phone: investor.user.phone || "",
              address: investor.address || "",
              nidNumber: investor.nidNumber || "",
              tinNumber: investor.tinNumber || "",
              investorType: investor.investorType,
              status: investor.user.status,
              investorCode: investor.investorCode,
              dividendOption: investor.dividendOption,
              welcomeEmailSentAt: investor.welcomeEmailSentAt
                ? investor.welcomeEmailSentAt.toISOString()
                : null,
            }}
          />
        </CardContent>
      </Card>

      {/* Holdings — Only show if investor is not pending */}
      {investor.user.status !== "PENDING" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[14px]">Fund Holdings</CardTitle>
          </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead>Fund</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">Current NAV</TableHead>
                <TableHead className="text-right">Cost Value</TableHead>
                <TableHead className="text-right">Market Value</TableHead>
                <TableHead className="text-right">Gain/Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investor.holdings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-text-muted">No holdings</TableCell>
                </TableRow>
              ) : (
                investor.holdings.map((h) => {
                  const mv = Number(h.totalCurrentUnits) * Number(h.fund.currentNav);
                  const gain = mv - Number(h.totalCostValueCurrent);
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.fund.code}</TableCell>
                      <TableCell className="text-right">{Number(h.totalCurrentUnits).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{Number(h.avgCost).toFixed(4)}</TableCell>
                      <TableCell className="text-right">{Number(h.fund.currentNav).toFixed(4)}</TableCell>
                      <TableCell className="text-right">{formatBDT(Number(h.totalCostValueCurrent))}</TableCell>
                      <TableCell className="text-right">{formatBDT(mv)}</TableCell>
                      <TableCell className={`text-right ${gain >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {formatBDT(gain)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      {/* Recent Transactions — Only show if investor is not pending */}
      {investor.user.status !== "PENDING" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[14px]">Recent Transactions (last 20)</CardTitle>
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
                investor.transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-[12px]">{formatDate(t.orderDate)}</TableCell>
                    <TableCell className="font-medium text-[12px]">{t.fund.code}</TableCell>
                    <TableCell className="text-[12px]">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${t.direction === "BUY" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {t.direction} {t.channel === "SIP" ? "(SIP)" : ""}
                      </span>
                    </TableCell>
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

      {/* SIP Plans + Dividends — Only show if investor is not pending */}
      {investor.user.status !== "PENDING" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[14px]">SIP Plans</CardTitle>
            </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Fund</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investor.sipPlans.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-text-muted">No SIPs</TableCell></TableRow>
                ) : (
                  investor.sipPlans.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-[12px] font-medium">{s.fund.code}</TableCell>
                      <TableCell className="text-[12px]">{formatBDT(Number(s.amount))}</TableCell>
                      <TableCell className="text-[12px]">{formatDate(s.startDate)}</TableCell>
                      <TableCell><Badge variant={s.status === "ACTIVE" ? "active" : "pending"}>{s.status}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[14px]">Recent Dividends</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Year</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investor.dividends.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-text-muted">No dividends</TableCell></TableRow>
                ) : (
                  investor.dividends.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-[12px]">{d.accountingYear}</TableCell>
                      <TableCell className="text-[12px] font-medium">{d.fund.code}</TableCell>
                      <TableCell className="text-right text-[12px]">{formatBDT(Number(d.grossDividend))}</TableCell>
                      <TableCell className="text-right text-[12px] text-green-600">{formatBDT(Number(d.netDividend))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Bank accounts + Nominees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[14px]">Bank Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {investor.bankAccounts.length === 0 ? (
              <p className="text-[12px] text-text-muted">No bank accounts</p>
            ) : (
              investor.bankAccounts.map((b) => {
                const chequeDoc = investor.documents.find((d) => d.type === "CHEQUE_LEAF_PHOTO");
                const chequeUrl = b.chequeLeafUrl || chequeDoc?.filePath;
                return (
                  <div key={b.id} className="flex items-center gap-3 p-2 bg-page-bg rounded-md">
                    {chequeUrl && (
                      <a href={chequeUrl} target="_blank" rel="noopener noreferrer">
                        <img src={chequeUrl} alt="Cheque" className="w-14 h-10 object-cover rounded border" />
                      </a>
                    )}
                    <div className="flex-1">
                      <p className="text-[12px] font-medium">{b.bankName}</p>
                      <p className="text-[11px] text-text-body">A/C: {b.accountNumber}{b.branchName ? ` · ${b.branchName}` : ""}</p>
                    </div>
                    {chequeUrl && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <a href={chequeUrl} target="_blank" rel="noopener noreferrer" className="text-ekush-orange hover:underline">View</a>
                        <a href={chequeUrl} download className="text-blue-600 hover:underline">Download</a>
                      </div>
                    )}
                    {b.isPrimary && <Badge variant="active">Primary</Badge>}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[14px]">Nominees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {investor.nominees.length === 0 ? (
              <p className="text-[12px] text-text-muted">No nominees</p>
            ) : (
              investor.nominees.map((n) => {
                const nomineeDocs = investor.documents.filter((d) =>
                  d.type.startsWith("NOMINEE_")
                );
                return (
                  <div key={n.id} className="p-2 bg-page-bg rounded-md space-y-2">
                    <div>
                      <p className="text-[12px] font-medium">
                        {n.name || "(name not set)"}{" "}
                        <span className="text-text-body text-[11px]">({n.relationship || "—"})</span>
                      </p>
                      <p className="text-[11px] text-text-body">
                        Share: {Number(n.share)}%{n.nidNumber ? ` · NID: ${n.nidNumber}` : ""}
                      </p>
                    </div>
                    {nomineeDocs.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {nomineeDocs.map((d) => (
                          <div key={d.id} className="text-[11px] bg-white border border-input-border rounded px-2 py-1 flex items-center gap-2">
                            <span className="text-text-body">{d.type.replace("NOMINEE_", "").replace(/_/g, " ")}</span>
                            <a href={d.filePath} target="_blank" rel="noopener noreferrer" className="text-ekush-orange hover:underline">View</a>
                            <a href={d.filePath} download={d.fileName} className="text-blue-600 hover:underline">Download</a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[14px]">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {investor.documents.length === 0 ? (
            <p className="text-[12px] text-text-muted">No documents</p>
          ) : (
            <div className="space-y-1">
              {investor.documents.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-2 bg-page-bg rounded-md text-[12px]">
                  <div>
                    <span className="font-medium">{d.fileName}</span>
                    <span className="text-text-body ml-2">({d.type})</span>
                    <span className="text-text-muted ml-2">{formatDate(d.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={d.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ekush-orange hover:underline"
                    >
                      View
                    </a>
                    <a
                      href={d.filePath}
                      download={d.fileName}
                      className="text-blue-600 hover:underline"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
