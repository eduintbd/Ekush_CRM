import { getSession } from "@/lib/auth";
import { QuickActions } from "@/components/QuickActions";
import TaxRebateBanner from "@/components/TaxRebateBanner";
import { InvestmentGrowth } from "@/components/dashboard/investment-growth";
import { PerformanceComparison } from "@/components/dashboard/performance-comparison";
import { ErrorBoundary } from "@/components/error-boundary";

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

      {/* Quick Actions — Prime Bank + Gold Kinen hybrid */}
      {/* !mt-4 overrides parent space-y-8 (32px → 16px); -mb-4 collapses with the next sibling's mt-8 to ~16px. */}
      <div className="!mt-4 -mb-4">
        <QuickActions />
      </div>

      {/* Promotional banner — centered feature card sized to ~90% of the desktop viewport */}
      <div className="!mt-5 !mb-4 w-[92%] md:w-[88%] lg:w-[90%] lg:max-w-[1100px] mx-auto">
        <TaxRebateBanner />
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
    </div>
  );
}
