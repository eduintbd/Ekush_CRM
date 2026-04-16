import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActionCard } from "@/components/dashboard/action-card";
import { NavCarousel } from "@/components/dashboard/nav-carousel";
import { PeerComparisonChart } from "@/components/dashboard/peer-comparison-chart";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  TrendingUp,
  Calendar,
  Coins,
  PieChart,
  FileText,
  UserPen,
  Award,
  Gift,
  Target,
} from "lucide-react";

async function getFunds() {
  return prisma.fund.findMany({ orderBy: { code: "asc" } });
}

async function getNavHistoryByFund() {
  const records = await prisma.navRecord.findMany({
    select: { fundId: true, date: true, nav: true },
    orderBy: { date: "asc" },
  });
  const map = new Map<string, { date: string; nav: number }[]>();
  for (const r of records) {
    if (!map.has(r.fundId)) map.set(r.fundId, []);
    map.get(r.fundId)!.push({ date: r.date.toISOString(), nav: r.nav });
  }
  return map;
}

export default async function DashboardPage() {
  const session = await getSession();

  let funds: Awaited<ReturnType<typeof getFunds>> = [];
  let navByFund = new Map<string, { date: string; nav: number }[]>();

  try {
    [funds, navByFund] = await Promise.all([getFunds(), getNavHistoryByFund()]);
  } catch (err) {
    console.error("Dashboard data fetch error:", err);
  }

  const isPending = session?.user?.status === "PENDING";

  return (
    <div className="space-y-8">
      {isPending && (
        <div className="rounded-[10px] border border-amber-300 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 mt-[6px] shrink-0" />
          <div>
            <p className="text-[14px] font-semibold text-amber-900 font-rajdhani">Pending verification</p>
            <p className="text-[13px] text-amber-800">
              Your registration has been received. Our team will review your documents and approve your account shortly.
              You can browse the portal in the meantime, but some features will be unavailable until approval.
            </p>
          </div>
        </div>
      )}

      {/* Performance charts — NAV carousel + peer comparison */}
      <div>
        <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-4">
          Performance of Ekush Managed Funds
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ErrorBoundary fallback={<div className="bg-white rounded-[10px] shadow-card p-6 text-center text-text-muted text-sm">Chart unavailable</div>}>
            <NavCarousel
              funds={funds.map((f) => ({
                id: f.id,
                code: f.code,
                name: f.name,
                currentNav: Number(f.currentNav),
                data: navByFund.get(f.id) ?? [],
              }))}
            />
          </ErrorBoundary>
          <ErrorBoundary fallback={<div className="bg-white rounded-[10px] shadow-card p-6 text-center text-text-muted text-sm">Chart unavailable</div>}>
            <PeerComparisonChart />
          </ErrorBoundary>
        </div>
      </div>

      {/* Quick Action Cards — 4x2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ActionCard
          href="/goals"
          label="Set My Goals"
          icon={Target}
          iconColor="#EA580C"
          iconBg="#FFF7ED"
        />
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
          label="Start SIP"
          icon={Calendar}
          iconColor="#E85D5D"
          iconBg="#FDE8E8"
        />
        <ActionCard
          href="/statements"
          label="Investment Summary"
          icon={PieChart}
          iconColor="#2DAAB8"
          iconBg="#E8F8FA"
        />
        <ActionCard
          href="/transactions"
          label="Transaction History"
          icon={FileText}
          iconColor="#7C3AED"
          iconBg="#F3EFFE"
        />
        <ActionCard
          href="/profile"
          label="Profile Management"
          icon={UserPen}
          iconColor="#0EA5E9"
          iconBg="#E0F2FE"
        />
        <ActionCard
          href="/tax-certificate"
          label="Tax Certificate"
          icon={Award}
          iconColor="#16A34A"
          iconBg="#DCFCE7"
        />
        <ActionCard
          href="/dividends"
          label="Dividend Statement"
          icon={Gift}
          iconColor="#DB2777"
          iconBg="#FCE7F3"
        />
      </div>
    </div>
  );
}
