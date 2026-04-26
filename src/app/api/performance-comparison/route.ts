import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FACE_VALUE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Periods the comparison table / chart surface. "7Y" / "10Y" explicitly
// excluded per product spec.
const PERIOD_IDS = [
  "sinceInception",
  "5Y",
  "3Y",
  "1Y",
  "6M",
  "3M",
  "YTD",
] as const;
type PeriodId = (typeof PERIOD_IDS)[number];

const FUND_CODES = ["EFUF", "EGF", "ESRF"] as const;

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

// Pick the record whose date is closest to the target. Since the series
// is sorted ascending, this runs in O(log n) via a simple linear scan
// — we only have ~2k rows so no binary search needed yet.
function nearestByDate<T extends { date: Date }>(series: T[], target: Date): T | null {
  if (series.length === 0) return null;
  let best: T | null = null;
  let bestDiff = Infinity;
  for (const r of series) {
    const diff = daysBetween(r.date, target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = r;
    } else if (r.date.getTime() > target.getTime() && bestDiff < Infinity) {
      // Series is sorted asc; once we cross target and start getting worse, stop.
      break;
    }
  }
  return best;
}

function periodStart(now: Date, period: PeriodId, inception: Date | null): Date | null {
  const n = new Date(now);
  switch (period) {
    case "sinceInception":
      return inception;
    case "5Y": return new Date(n.getUTCFullYear() - 5, n.getUTCMonth(), n.getUTCDate());
    case "3Y": return new Date(n.getUTCFullYear() - 3, n.getUTCMonth(), n.getUTCDate());
    case "1Y": return new Date(n.getUTCFullYear() - 1, n.getUTCMonth(), n.getUTCDate());
    case "6M": return new Date(n.getUTCFullYear(), n.getUTCMonth() - 6, n.getUTCDate());
    case "3M": return new Date(n.getUTCFullYear(), n.getUTCMonth() - 3, n.getUTCDate());
    case "YTD": return new Date(Date.UTC(n.getUTCFullYear(), 0, 1));
  }
}

export async function GET() {
  const funds = await prisma.fund.findMany({
    where: { code: { in: [...FUND_CODES] } },
    select: { id: true, code: true, name: true, inceptionDate: true, faceValue: true },
  });
  if (funds.length === 0) {
    return NextResponse.json({ error: "No funds found" }, { status: 404 });
  }

  // Pull every NAV record in one query; we derive both per-fund return series
  // and the two index price series from this single dataset.
  const rawRecords = await prisma.navRecord.findMany({
    where: { fundId: { in: funds.map((f) => f.id) } },
    orderBy: { date: "asc" },
    select: {
      fundId: true,
      date: true,
      nav: true,
      investorReturn: true,
      dsex: true,
      ds30: true,
    },
  });

  // Per-fund series. investorReturn comes from the upstream xlsx (dividend-
  // adjusted total return %). For rows missing the stored value we fall
  // back to the price-only NAV computation so legacy rows still render —
  // but the stored value is authoritative when present.
  interface FundPoint { date: Date; nav: number; investorReturn: number }
  const fundSeries = new Map<string, FundPoint[]>();
  for (const f of funds) fundSeries.set(f.code, []);

  // DSEX / DS30 series keyed by date — multiple funds share the same date
  // so dedupe. We take the first non-null value we see for each.
  const dsexByDate = new Map<number, { date: Date; price: number }>();
  const ds30ByDate = new Map<number, { date: Date; price: number }>();

  for (const r of rawRecords) {
    const fund = funds.find((f) => f.id === r.fundId);
    if (!fund) continue;
    const face = Number(fund.faceValue || FACE_VALUE);
    const nav = Number(r.nav);
    const investorReturn = r.investorReturn != null
      ? Number(r.investorReturn)
      : (face > 0 ? ((nav - face) / face) * 100 : 0);
    fundSeries.get(fund.code)!.push({ date: r.date, nav, investorReturn });

    const k = startOfDayUtc(r.date).getTime();
    if (r.dsex != null && !dsexByDate.has(k)) {
      dsexByDate.set(k, { date: r.date, price: Number(r.dsex) });
    }
    if (r.ds30 != null && !ds30ByDate.has(k)) {
      ds30ByDate.set(k, { date: r.date, price: Number(r.ds30) });
    }
  }

  const dsexSeries = Array.from(dsexByDate.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const ds30Series = Array.from(ds30ByDate.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  // As-of date is the most recent NAV record overall.
  const asOf = rawRecords.length > 0
    ? rawRecords[rawRecords.length - 1].date
    : new Date();

  // Per-fund cumulative return at `asOf`, used as the denominator for period
  // slices. We express the chart's y-axis as "investor return at date" so
  // lines all start from 0 at the period start.
  type ReturnMap = Partial<Record<PeriodId, number>>;

  function fundReturns(code: string): { returns: ReturnMap; inception: Date | null } {
    const fund = funds.find((f) => f.code === code)!;
    const series = fundSeries.get(code) ?? [];
    const inception = fund.inceptionDate ?? (series.length ? series[0].date : null);
    if (series.length === 0) return { returns: {}, inception };
    const end = series[series.length - 1];
    const returns: ReturnMap = {};
    for (const p of PERIOD_IDS) {
      // Since-Inception is just the latest IR — no period math.
      if (p === "sinceInception") {
        returns[p] = end.investorReturn;
        continue;
      }
      const ps = periodStart(asOf, p, inception);
      if (!ps) continue;
      const start = nearestByDate(series, ps);
      if (!start || start.date > end.date) continue;
      if (start.date.getTime() > ps.getTime() + 90 * 86400_000) {
        // Too far from the requested period-start to be meaningful (>90d gap)
        continue;
      }
      // Period return is the absolute change in the cumulative investor-
      // return column: IR_end − IR_start. This matches the convention
      // used by the Growth-of-1-lac chart (which plots
      // 100,000 × (1 + (IR_t − IR_start)/100)) so the two surfaces show
      // consistent numbers — pre-fix the legend used a compound formula
      // ((1+IR_end/100)/(1+IR_start/100)−1)×100 which diverged from the
      // growth chart for longer periods. Index returns below stay on
      // the relative formula since DSEX/DS30 are price-return series.
      returns[p] = end.investorReturn - start.investorReturn;
    }
    return { returns, inception };
  }

  function indexReturns(series: { date: Date; price: number }[]): ReturnMap {
    if (series.length === 0) return {};
    const end = series[series.length - 1];
    const inception = series[0].date;
    const returns: ReturnMap = {};
    for (const p of PERIOD_IDS) {
      const ps = periodStart(asOf, p, inception);
      if (!ps) continue;
      const start = nearestByDate(series, ps);
      if (!start || !start.price || start.date > end.date) continue;
      if (p !== "sinceInception" && start.date.getTime() > ps.getTime() + 90 * 86400_000) continue;
      returns[p] = ((end.price - start.price) / start.price) * 100;
    }
    return returns;
  }

  const fundBlocks = funds.map((f) => {
    const { returns, inception } = fundReturns(f.code);
    const series = fundSeries.get(f.code) ?? [];
    return {
      code: f.code,
      name: f.name,
      inceptionDate: inception ? inception.toISOString() : null,
      returns,
      series: series.map((p) => ({
        date: p.date.toISOString(),
        investorReturn: p.investorReturn,
        // NAV per unit at this point in time. Exposed so the rebuild's
        // /fund/<slug> NAV chart can plot the full series in one fetch
        // — the dedicated /nav-history endpoint caps perPage at 100,
        // which would force the chart to paginate or silently truncate.
        nav: p.nav,
      })),
    };
  });

  // DSEX and DS30 are price-return indices (no dividend reinvestment in the
  // published series), whereas Ekush fund returns are total-return (dividend-
  // adjusted via the upstream "Investor Return" column). Flagging here so the
  // UI can render a methodology footnote and reviewers don't mix the two.
  const indexBlocks = [
    {
      code: "DSEX",
      // `name` is consumed by the rebuild's Historical Performance table
      // — without it the row just renders "DSEX" from `code` which is
      // fine, but naming explicitly is cleaner for any future UI that
      // wants the friendly label.
      name: "DSEX",
      returnType: "price-return" as const,
      returns: indexReturns(dsexSeries),
      series: dsexSeries.map((p) => ({ date: p.date.toISOString(), price: p.price })),
    },
    {
      code: "DS30",
      name: "DS30",
      returnType: "price-return" as const,
      returns: indexReturns(ds30Series),
      series: ds30Series.map((p) => ({ date: p.date.toISOString(), price: p.price })),
    },
  ];

  return NextResponse.json({
    asOf: asOf.toISOString(),
    periods: PERIOD_IDS,
    funds: fundBlocks,
    fundReturnType: "total-return",
    indices: indexBlocks,
  });
}
