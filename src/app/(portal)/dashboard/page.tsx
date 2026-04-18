import { getSession } from "@/lib/auth";
import { ActionCard } from "@/components/dashboard/action-card";
import { InvestmentGrowth } from "@/components/dashboard/investment-growth";
import { PerformanceComparison } from "@/components/dashboard/performance-comparison";
import { FloatingServicesMenu } from "@/components/dashboard/floating-services-menu";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  TrendingUp,
  Calendar,
  Coins,
  Target,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();

  // Only show the pending-verification banner for self-registered accounts that
  // still hold a placeholder investor code (PENDING-XXXXX). Real investors
  // imported from the Excel files may also have a PENDING user status but
  // carry a real code like "A00055" — they should not see this banner.
  const investorCode = session?.user?.investorCode ?? "";
  const isPending = session?.user?.status === "PENDING" && investorCode.startsWith("PENDING-");

  return (
    <div className="space-y-8">
      {isPending && (
        <div className="rounded-[10px] border border-amber-300 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 mt-[6px] shrink-0" />
          <div>
            <p className="text-[14px] font-semibold text-amber-900 font-rajdhani">Pending verification</p>
            <p className="text-[13px] text-amber-800">
              Your registration has been received. Our team will review your documents and approve your account shortly after you complete the investment. To do so{" "}
              <a href="/transactions/buy" className="text-ekush-orange font-semibold hover:underline">click here (Buy Units)</a>.
            </p>
          </div>
        </div>
      )}

      {/* Quick Action Cards — top row above the charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ActionCard
          href="/transactions/buy"
          label="Buy Units"
          icon={TrendingUp}
          iconColor="#2DAAB8"
          iconBg="#E8F8FA"
        />
        <ActionCard
          href="/sip"
          label="Start SIP"
          icon={Calendar}
          iconColor="#E85D5D"
          iconBg="#FDE8E8"
        />
        <ActionCard
          href="/goals"
          label="Progress Report"
          icon={Target}
          iconColor="#EA580C"
          iconBg="#FFF7ED"
        />
        <ActionCard
          href="/transactions/sell"
          label="Sell Units"
          icon={Coins}
          iconColor="#F27023"
          iconBg="#FFF0E6"
        />
      </div>

      {/* Performance charts — NAV carousel + peer comparison */}
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ErrorBoundary fallback={<div className="bg-white rounded-[10px] shadow-card p-6 text-center text-text-muted text-sm">Chart unavailable</div>}>
            <InvestmentGrowth />
          </ErrorBoundary>
          <ErrorBoundary fallback={<div className="bg-white rounded-[10px] shadow-card p-6 text-center text-text-muted text-sm">Chart unavailable</div>}>
            <PerformanceComparison />
          </ErrorBoundary>
        </div>
      </div>

      <FloatingServicesMenu />
    </div>
  );
}
