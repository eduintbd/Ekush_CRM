import { getSession } from "@/lib/auth";
import { prisma, withRetry } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

const FUND_CODES = ["EFUF", "EGF", "ESRF"] as const;
type FundCode = (typeof FUND_CODES)[number];

export default async function UnitCertificatePage({
  searchParams,
}: {
  searchParams: { fund?: string };
}) {
  const session = await getSession();
  let investorId = (session?.user as any)?.investorId;
  if (!investorId && session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { investor: { select: { id: true } } },
    });
    investorId = user?.investor?.id;
  }
  if (!investorId) {
    return <p className="text-text-body text-center py-20">Investor profile not found.</p>;
  }

  const activeFund: FundCode = (FUND_CODES as readonly string[]).includes(
    searchParams.fund ?? "",
  )
    ? (searchParams.fund as FundCode)
    : "EFUF";

  const funds = await withRetry(() =>
    prisma.fund.findMany({
      where: { code: { in: [...FUND_CODES] } },
      select: { id: true, code: true, name: true, currentNav: true },
    }),
  );

  const holdings = await withRetry(() =>
    prisma.fundHolding.findMany({
      where: { investorId, fundId: { in: funds.map((f) => f.id) } },
      select: {
        fundId: true,
        totalCurrentUnits: true,
        totalCostValueCurrent: true,
        avgCost: true,
      },
    }),
  );

  const activeFundRecord = funds.find((f) => f.code === activeFund);
  const activeHolding = activeFundRecord
    ? holdings.find((h) => h.fundId === activeFundRecord.id)
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">
          Unit Certificate
        </h1>
        <p className="text-[13px] text-text-body mt-1">
          View and download your unit allotment certificates for each fund.
        </p>
      </div>

      {/* Tabs (query-string driven — keeps the page a server component) */}
      <div className="flex gap-2 border-b border-gray-200">
        {FUND_CODES.map((code) => {
          const isActive = code === activeFund;
          return (
            <Link
              key={code}
              href={`/unit-certificate?fund=${code}`}
              className={
                "px-4 py-2 text-[13px] font-medium rounded-t-md transition-colors " +
                (isActive
                  ? "bg-white text-ekush-orange border border-b-0 border-gray-200 -mb-px"
                  : "text-text-body hover:text-text-dark")
              }
            >
              {code}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-6">
          <TabBody fund={activeFundRecord} holding={activeHolding} />
        </CardContent>
      </Card>
    </div>
  );
}

function TabBody({
  fund,
  holding,
}: {
  fund?: { id: string; code: string; name: string; currentNav: number };
  holding?: { totalCurrentUnits: number; totalCostValueCurrent: number; avgCost: number };
}) {
  if (!fund) {
    return (
      <p className="text-text-body text-sm text-center py-8">
        Fund not found.
      </p>
    );
  }

  if (!fund.currentNav || fund.currentNav <= 0) {
    return (
      <p className="text-text-body text-sm text-center py-8">
        Certificate is not available for this fund at the moment. Market value
        has not been published yet.
      </p>
    );
  }

  if (!holding || holding.totalCurrentUnits <= 0) {
    return (
      <p className="text-text-body text-sm text-center py-8">
        You do not currently hold any units in this fund.
      </p>
    );
  }

  const units = holding.totalCurrentUnits;
  const costValue = holding.totalCostValueCurrent;
  const avgCost = holding.avgCost || (units > 0 ? costValue / units : 0);
  // Market value is units × current NAV. Cost value reflects what was
  // paid; market value reflects what the units are worth right now.
  const marketValue = units * fund.currentNav;
  const nf = new Intl.NumberFormat("en-IN");
  const nf2 = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Units Held" value={nf.format(units)} />
        <Metric label="Avg. Cost / Unit" value={`BDT ${nf2.format(avgCost)}`} />
        <Metric label="Total Cost Value" value={`BDT ${nf2.format(costValue)}`} />
        <Metric label="Total Market Value" value={`BDT ${nf2.format(marketValue)}`} />
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <p className="text-[12px] text-text-muted">
          Certificate reflects your current unit balance in{" "}
          <span className="font-medium text-text-dark">{fund.name}</span>.
        </p>
        <Link
          href={`/forms/unit-certificate?fund=${fund.code}`}
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-ekush-orange text-white text-[13px] font-semibold rounded-md hover:bg-ekush-orange-dark transition-colors"
        >
          Download Certificate
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-page-bg px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
        {label}
      </p>
      <p className="text-[16px] font-semibold text-text-dark mt-1">{value}</p>
    </div>
  );
}
