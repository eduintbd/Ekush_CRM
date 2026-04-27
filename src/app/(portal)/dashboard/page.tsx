import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuickActions } from "@/components/QuickActions";
import TaxRebateBanner from "@/components/TaxRebateBanner";
import {
  PortalBannerCarousel,
  type PortalBannerItem,
} from "@/components/dashboard/portal-banner-carousel";
import { InvestmentGrowth } from "@/components/dashboard/investment-growth";
import { PerformanceComparison } from "@/components/dashboard/performance-comparison";
import { ServiceShortcuts } from "@/components/dashboard/service-shortcuts";
import { ErrorBoundary } from "@/components/error-boundary";

// Server-side fetcher for the rotating banner. Reads admin-curated
// LearnTopics with showInPortalBanner=true via a direct Prisma call
// (same DB the public route would query) — saves the round-trip to
// /api/public/portal-banner since we're already inside the CRM. The
// list is small + cached at the page level by Next's RSC dedupe.
//
// Each image on a flagged topic becomes its own slide — a topic with
// three images contributes three carousel slides (in array order).
// portalBannerOrder controls the topic-level position; within a topic
// images appear in the array order set on the admin form.
async function loadPortalBannerItems(): Promise<PortalBannerItem[]> {
  try {
    const rows = await prisma.learnTopic.findMany({
      where: { isPublished: true, showInPortalBanner: true },
      orderBy: [
        { portalBannerOrder: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        images: true,
        imageUrl: true,
        ctaUrl: true,
      },
    });

    const items: PortalBannerItem[] = [];
    for (const r of rows) {
      // Coalesce legacy single imageUrl into the array shape so old
      // rows that only have the deprecated column still surface.
      const urls =
        Array.isArray(r.images) && r.images.length > 0
          ? r.images
          : r.imageUrl
            ? [r.imageUrl]
            : [];
      urls.forEach((url, idx) => {
        items.push({
          key: `${r.id}:${idx}`,
          imageUrl: url,
          ctaUrl: r.ctaUrl,
          alt: r.title,
        });
      });
    }
    return items;
  } catch {
    // Worst-case: DB hiccup. Empty array makes the dashboard fall
    // back to the static TaxRebateBanner — never a broken layout.
    return [];
  }
}

export default async function DashboardPage() {
  const [session, bannerItems] = await Promise.all([
    getSession(),
    loadPortalBannerItems(),
  ]);

  // Only show the pending-verification banner for self-registered accounts that
  // still hold a placeholder investor code (PENDING-XXXXX). Real investors
  // imported from the Excel files may also have a PENDING user status but
  // carry a real code like "A00055" — they should not see this banner.
  const investorCode = session?.user?.investorCode ?? "";
  const isPending = session?.user?.status === "PENDING" && investorCode.startsWith("PENDING-");

  return (
    // group/actions covers the dashboard's two action surfaces
    // (QuickActions up top + ServiceShortcuts at the bottom). Hovering
    // any tile in either surface demotes the active tile in the other —
    // see the [data-shortcut]:hover gating in those components — so
    // exactly one tile reads navy at any moment regardless of which row
    // it lives in. The TaxRebateBanner CTA between them isn't tagged
    // with data-shortcut, so it doesn't trigger the demotion.
    <div className="group/actions space-y-8">
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

      {/* Promotional banner — full container width so its left/right
          edges line up exactly with the chart row below. (Both are
          direct children of the same max-w-7xl px-8 layout shell.)
          When admin has flagged ≥1 LearnTopic for the portal banner,
          the carousel renders those slides; otherwise the static
          TaxRebateBanner stays in place as the fallback. */}
      <div className="!mt-5 !mb-4">
        {bannerItems.length > 0 ? (
          <PortalBannerCarousel items={bannerItems} />
        ) : (
          <TaxRebateBanner />
        )}
      </div>

      {/* Performance charts — peer comparison on the left, NAV carousel
          on the right (positions swapped from the previous layout). */}
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ErrorBoundary fallback={<div className="bg-white rounded-[10px] shadow-card p-6 text-center text-text-muted text-sm">Chart unavailable</div>}>
            <PerformanceComparison />
          </ErrorBoundary>
          <ErrorBoundary fallback={<div className="bg-white rounded-[10px] shadow-card p-6 text-center text-text-muted text-sm">Chart unavailable</div>}>
            <InvestmentGrowth />
          </ErrorBoundary>
        </div>
      </div>

      {/* Records & reports — same navy/gold tile style as the
          QuickActions banner up top, so the dashboard reads as one
          coherent action surface. */}
      <ServiceShortcuts />
    </div>
  );
}
