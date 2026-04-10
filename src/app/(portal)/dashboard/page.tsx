import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActionCard } from "@/components/dashboard/action-card";
import { NavTrendChart } from "@/components/dashboard/nav-trend-chart";
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

  return (
    <div className="space-y-8">
      {/* NAV trend charts — one per fund */}
      <div>
        <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-4">
          Performance of Ekush Managed Funds
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {funds.map((fund) => (
            <NavTrendChart
              key={fund.id}
              fundCode={fund.code}
              fundName={fund.name}
              currentNav={Number(fund.currentNav)}
              data={navByFund.get(fund.id) ?? []}
            />
          ))}
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
          label="Invest in SIP"
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
