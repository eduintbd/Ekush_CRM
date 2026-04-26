import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  MessageCircle,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProspectProfileSection } from "@/components/prospect/profile-section";

// Server component: pulls everything in one round-trip and hands the
// interactive bits (profile edit / delete) to a small client island.
//
// Auth + tier gate is enforced by /prospect/layout.tsx; we re-check
// here only to keep the type narrow and so the page works when imported
// independently in a future test harness.

export const dynamic = "force-dynamic";

export default async function ProspectDashboardPage() {
  const session = await getSession();
  if (!session?.user || session.user.tier !== "PROSPECT") {
    redirect("/login");
  }
  const prospectId = session.user.prospectId;
  if (!prospectId) redirect("/login");

  const [prospect, funds] = await Promise.all([
    prisma.prospect.findUnique({
      where: { id: prospectId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        marketingConsent: true,
        kycSubmitted: true,
        createdAt: true,
      },
    }),
    prisma.fund.findMany({
      where: {
        // Only public-facing, currently-active funds. We intentionally
        // include funds with currentNav>0 to avoid showing unlaunched
        // ones; existing public APIs use the same filter implicitly.
        currentNav: { gt: 0 },
      },
      select: {
        code: true,
        name: true,
        currentNav: true,
        previousNav: true,
        inceptionDate: true,
      },
      orderBy: { inceptionDate: "asc" },
      take: 3,
    }),
  ]);

  if (!prospect) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-dark font-rajdhani">
        Welcome back, {prospect.name.split(" ")[0]}
      </h1>

      <WelcomeCard prospect={prospect} />
      <UpgradeBanner kycSubmitted={prospect.kycSubmitted} />
      <FundCardsRow funds={funds} />

      <div className="grid lg:grid-cols-2 gap-6">
        <ResourcesCard funds={funds} />
        <AdvisorCard />
      </div>

      <ProspectProfileSection
        initial={{
          phone: prospect.phone,
          email: prospect.email,
          marketingConsent: prospect.marketingConsent,
        }}
      />
    </div>
  );
}

function WelcomeCard({
  prospect,
}: {
  prospect: { name: string; phone: string; createdAt: Date };
}) {
  return (
    <div className="bg-white rounded-card shadow-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <p className="text-sm text-text-body">Logged in as</p>
          <span className="inline-flex items-center gap-1 bg-ekush-orange/10 text-ekush-orange text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Prospect
          </span>
        </div>
        <p className="text-lg font-semibold text-text-dark">{prospect.name}</p>
        <p className="text-[13px] text-text-body mt-1">
          +880 {formatPhone(prospect.phone)} &middot; Joined{" "}
          {new Date(prospect.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

function UpgradeBanner({ kycSubmitted }: { kycSubmitted: boolean }) {
  if (kycSubmitted) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-900">
            Your KYC is in review.
          </p>
          <p className="text-[13px] text-blue-800/80 mt-0.5">
            Our team will email you once your investor code is issued.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-amber-900">
          Ready to invest?
        </p>
        <p className="text-[13px] text-amber-800/80 mt-0.5">
          Complete KYC. Investor code issued after admin approval.
        </p>
      </div>
      <Link
        href="/register"
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-[5px] text-sm font-semibold transition-colors"
      >
        Upgrade <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function FundCardsRow({
  funds,
}: {
  funds: {
    code: string;
    name: string;
    currentNav: number;
    previousNav: number;
    inceptionDate: Date | null;
  }[];
}) {
  if (funds.length === 0) return null;

  return (
    <div>
      <h2 className="text-[15px] font-bold text-text-dark font-rajdhani mb-3">
        Our Funds
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {funds.map((f) => {
          const change =
            f.previousNav > 0
              ? ((f.currentNav - f.previousNav) / f.previousNav) * 100
              : 0;
          const positive = change >= 0;
          return (
            <div
              key={f.code}
              className="bg-white rounded-card shadow-card p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-ekush-orange bg-ekush-orange/10 px-2 py-0.5 rounded-full">
                  {f.code}
                </span>
                {f.previousNav > 0 ? (
                  <span
                    className={`text-[11px] font-semibold ${
                      positive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {change.toFixed(2)}%
                  </span>
                ) : null}
              </div>
              <h3 className="text-[14px] font-bold text-text-dark font-rajdhani mb-2 line-clamp-1">
                {f.name}
              </h3>
              <div className="flex items-baseline justify-between text-text-body">
                <span className="text-[12px]">NAV</span>
                <span className="text-[18px] font-bold text-text-dark">
                  {f.currentNav.toFixed(4)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResourcesCard({
  funds,
}: {
  funds: { code: string; name: string }[];
}) {
  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-ekush-orange" />
        <h2 className="text-[15px] font-bold text-text-dark font-rajdhani">
          Fund Factsheets &amp; Reports
        </h2>
      </div>
      <p className="text-[13px] text-text-body mb-4">
        Open the public profile for any fund to download the factsheet,
        portfolio statement, and financial reports.
      </p>
      <ul className="space-y-2 text-[13px]">
        {funds.map((f) => (
          <li key={f.code}>
            <a
              href={`https://ekushwml.com/fund/${f.code.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ekush-orange hover:underline inline-flex items-center gap-1"
            >
              {f.name} <ArrowUpRight className="w-3 h-3" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdvisorCard() {
  // Hardcoded for v1 — pulls from a settings table in a future phase.
  // Number is the company line; matches the WhatsApp float on the
  // marketing site so brand identity stays consistent.
  const phone = "8801713086101";
  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-ekush-orange" />
        <h2 className="text-[15px] font-bold text-text-dark font-rajdhani">
          Talk to an Advisor
        </h2>
      </div>
      <p className="text-[13px] text-text-body mb-4">
        Have a question about which fund fits you? Our advisor team is on
        WhatsApp during business hours.
      </p>
      <a
        href={`https://wa.me/${phone}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1FAE54] text-white px-5 py-2.5 rounded-[5px] text-sm font-semibold transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        Chat on WhatsApp
      </a>
    </div>
  );
}

function formatPhone(p: string): string {
  // 11-digit BD national → "1712 345678"
  const digits = p.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(1, 5)} ${digits.slice(5)}`;
  if (digits.length === 10) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return digits;
}
