import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBDT, formatDate } from "@/lib/utils";
import { Users, ArrowLeftRight, AlertCircle, TrendingUp, FileText, Bell } from "lucide-react";
import Link from "next/link";
import { CollapsibleCard } from "@/components/admin/collapsible-card";
import { ApprovalsPanel } from "@/components/admin/approvals-panel";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // Defaults in case of Prisma connection errors
  let investorCount = 0;
  let txCount = 0;
  let pendingApprovals = 0;
  let funds: Awaited<ReturnType<typeof prisma.fund.findMany>> = [];
  let recentUsers = 0;
  let openTickets = 0;
  let pendingKyc = 0;
  let activeInvestors = 0;
  let pendingInvestors: Array<{
    id: string;
    investorCode: string;
    name: string;
    investorType: string;
    createdAt: Date;
    // Set when the investor was upgraded from a Tier-1 prospect; the
    // dashboard renders a "Tier1→Tier2" badge in the TYPE column to flag
    // these so admins can spot the conversion path during review.
    linkedProspectId: string | null;
    user: { email: string | null; phone: string | null; status: string };
  }> = [];
  try {
    // Run queries sequentially (more stable with Supabase pooler than 10 in parallel)
    investorCount = await prisma.investor.count();
    txCount = await prisma.transaction.count();
    pendingApprovals = await prisma.approvalQueue.count({ where: { status: "PENDING" } });
    funds = await prisma.fund.findMany();
    recentUsers = await prisma.user.count({ where: { lastLoginAt: { not: null } } });
    openTickets = await prisma.serviceRequest.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } });
    pendingKyc = await prisma.kycRecord.count({ where: { status: "PENDING" } });
    activeInvestors = await prisma.user.count({ where: { status: "ACTIVE" } });
    pendingInvestors = await prisma.investor.findMany({
      where: { user: { status: "PENDING" } },
      include: { user: { select: { email: true, phone: true, status: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch (err) {
    console.error("Admin dashboard query error:", err);
  }

  const totalAum = funds.reduce((s, f) => s + Number(f.totalAum), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Admin Dashboard</h1>

      {/* Pending KYC / New Registrations */}
      <CollapsibleCard
        title={`Pending KYC / New Registrations (${pendingInvestors.length})`}
        subtitle="Review documents & assign investor code to approve"
        defaultOpen={pendingInvestors.length > 0}
      >
        <Table>
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent bg-amber-50">
              <TableHead>Registered</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Temp Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingInvestors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-text-muted py-6">
                  No pending registrations. New sign-ups will appear here.
                </TableCell>
              </TableRow>
            ) : (
              pendingInvestors.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="text-[12px]">{formatDate(inv.createdAt)}</TableCell>
                  <TableCell className="font-medium text-text-dark">{inv.name}</TableCell>
                  <TableCell className="font-mono text-[11px] text-text-body">{inv.investorCode}</TableCell>
                  <TableCell className="text-[12px]">
                    {inv.investorType}
                    {inv.linkedProspectId && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-semibold uppercase tracking-wide border border-amber-200">
                        Tier1→Tier2
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="pending">{inv.user.status}</Badge>
                  </TableCell>
                  <TableCell className="text-[12px] text-text-body">
                    {inv.user.email || inv.user.phone || "—"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/investors/${inv.id}`}
                      className="text-ekush-orange hover:underline text-sm"
                    >
                      Review
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CollapsibleCard>

      {/* Approvals */}
      <CollapsibleCard
        title={`Approvals (${pendingApprovals})`}
        subtitle="Review and approve/reject pending requests (maker-checker)"
        defaultOpen={pendingApprovals > 0}
      >
        <ApprovalsPanel />
      </CollapsibleCard>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-card rounded-[10px]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-page-bg rounded-[10px] flex items-center justify-center"><Users className="w-5 h-5 text-ekush-orange" /></div>
            <div><p className="text-2xl font-semibold font-rajdhani text-text-dark">{investorCount}</p><p className="text-xs text-text-body">Total Investors</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-card rounded-[10px]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-page-bg rounded-[10px] flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-2xl font-semibold font-rajdhani text-text-dark">{formatBDT(totalAum)}</p><p className="text-xs text-text-body">Total AUM</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-card rounded-[10px]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-page-bg rounded-[10px] flex items-center justify-center"><ArrowLeftRight className="w-5 h-5 text-violet-600" /></div>
            <div><p className="text-2xl font-semibold font-rajdhani text-text-dark">{txCount}</p><p className="text-xs text-text-body">Transactions</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-card rounded-[10px]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-page-bg rounded-[10px] flex items-center justify-center"><AlertCircle className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-semibold font-rajdhani text-text-dark">{pendingApprovals}</p><p className="text-xs text-text-body">Pending Approvals</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-card rounded-[10px]"><CardContent className="p-4"><p className="text-xs text-text-body">Active Users</p><p className="text-lg font-semibold font-rajdhani text-text-dark">{activeInvestors}</p></CardContent></Card>
        <Card className="shadow-card rounded-[10px]"><CardContent className="p-4"><p className="text-xs text-text-body">Users Who Logged In</p><p className="text-lg font-semibold font-rajdhani text-text-dark">{recentUsers}</p></CardContent></Card>
        <Card className="shadow-card rounded-[10px]"><CardContent className="p-4"><p className="text-xs text-text-body">Open Tickets</p><p className="text-lg font-semibold font-rajdhani text-amber-600">{openTickets}</p></CardContent></Card>
        <Card className="shadow-card rounded-[10px]"><CardContent className="p-4"><p className="text-xs text-text-body">Pending KYC</p><p className="text-lg font-semibold font-rajdhani text-red-600">{pendingKyc}</p></CardContent></Card>
      </div>

      {/* Fund Summary */}
      <Card className="shadow-card rounded-[10px]">
        <CardHeader><CardTitle className="text-[16px] font-semibold font-rajdhani text-text-dark">Fund Overview</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-text-body">
                <th className="pb-2 font-medium">Fund</th>
                <th className="pb-2 font-medium">Code</th>
                <th className="pb-2 font-medium text-right">Current NAV</th>
                <th className="pb-2 font-medium text-right">Total AUM</th>
                <th className="pb-2 font-medium text-right">Total Units</th>
                <th className="pb-2 font-medium text-right">Face Value</th>
              </tr>
            </thead>
            <tbody>
              {funds.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="py-3 font-medium text-text-dark">{f.name}</td>
                  <td className="py-3 text-text-body">{f.code}</td>
                  <td className="py-3 text-right font-mono text-text-dark">{Number(f.currentNav).toFixed(4)}</td>
                  <td className="py-3 text-right text-text-dark">{formatBDT(Number(f.totalAum))}</td>
                  <td className="py-3 text-right text-text-dark">{Number(f.totalUnits).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  <td className="py-3 text-right text-text-dark">{Number(f.faceValue).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <a href="/admin/tickets" className="block"><Card className="shadow-card rounded-[10px] hover:shadow-md transition-shadow"><CardContent className="p-4 flex items-center gap-3"><FileText className="w-5 h-5 text-ekush-orange" /><span className="text-sm font-medium text-text-dark">Tickets ({openTickets})</span></CardContent></Card></a>
        <a href="/admin/content" className="block"><Card className="shadow-card rounded-[10px] hover:shadow-md transition-shadow"><CardContent className="p-4 flex items-center gap-3"><Bell className="w-5 h-5 text-green-500" /><span className="text-sm font-medium text-text-dark">Content</span></CardContent></Card></a>
        <a href="/admin/audit-log" className="block"><Card className="shadow-card rounded-[10px] hover:shadow-md transition-shadow"><CardContent className="p-4 flex items-center gap-3"><FileText className="w-5 h-5 text-text-body" /><span className="text-sm font-medium text-text-dark">Audit Log</span></CardContent></Card></a>
      </div>
    </div>
  );
}
