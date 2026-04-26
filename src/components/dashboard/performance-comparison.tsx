"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const PERIOD_LABELS: Array<{ id: PeriodId; label: string }> = [
  { id: "sinceInception", label: "Since Inception" },
  { id: "5Y", label: "5Y" },
  { id: "3Y", label: "3Y" },
  { id: "1Y", label: "1Y" },
  { id: "6M", label: "6M" },
  { id: "3M", label: "3M" },
  { id: "YTD", label: "YTD" },
];

type PeriodId = "sinceInception" | "5Y" | "3Y" | "1Y" | "6M" | "3M" | "YTD";
type IndexCode = "DSEX" | "DS30";

interface FundBlock {
  code: string;
  name: string;
  inceptionDate: string | null;
  returns: Partial<Record<PeriodId, number>>;
  series: Array<{ date: string; investorReturn: number }>;
}

interface IndexBlock {
  code: string;
  returnType?: "price-return" | "total-return";
  returns: Partial<Record<PeriodId, number>>;
  series: Array<{ date: string; price: number }>;
}

interface ApiResponse {
  asOf: string;
  periods: PeriodId[];
  funds: FundBlock[];
  indices: IndexBlock[];
}

const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });

const FUND_COLOR = "#F27023";
const INDEX_COLOR = "#1e3a5f";

function pickPeriodStart(asOf: Date, period: PeriodId, inception: Date | null): Date | null {
  const n = new Date(asOf);
  switch (period) {
    case "sinceInception": return inception;
    case "5Y": return new Date(Date.UTC(n.getUTCFullYear() - 5, n.getUTCMonth(), n.getUTCDate()));
    case "3Y": return new Date(Date.UTC(n.getUTCFullYear() - 3, n.getUTCMonth(), n.getUTCDate()));
    case "1Y": return new Date(Date.UTC(n.getUTCFullYear() - 1, n.getUTCMonth(), n.getUTCDate()));
    case "6M": return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 6, n.getUTCDate()));
    case "3M": return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 3, n.getUTCDate()));
    case "YTD": return new Date(Date.UTC(n.getUTCFullYear(), 0, 1));
  }
}

// Pick the most recent point whose date is on-or-before target.
function findAnchor<T extends { date: string }>(series: T[], target: Date): T | null {
  let best: T | null = null;
  for (const r of series) {
    if (new Date(r.date).getTime() <= target.getTime()) best = r;
    else break;
  }
  return best ?? (series.length > 0 ? series[0] : null);
}

export function PerformanceComparison() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartFund, setChartFund] = useState<"EFUF" | "EGF">("EFUF");
  const [chartIndex, setChartIndex] = useState<IndexCode>("DSEX");
  const [chartPeriod, setChartPeriod] = useState<PeriodId>("3Y");

  useEffect(() => {
    let alive = true;
    fetch("/api/performance-comparison")
      .then((r) => r.json())
      .then((d: ApiResponse) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Load failed"); });
    return () => { alive = false; };
  }, []);

  const chart = useMemo(() => {
    if (!data) return { rows: [] as Array<Record<string, unknown>>, windowStartLabel: "", fundReturn: null as number | null, indexReturn: null as number | null };
    const fund = data.funds.find((f) => f.code === chartFund);
    const idx = data.indices.find((i) => i.code === chartIndex);
    if (!fund || !idx) return { rows: [], windowStartLabel: "", fundReturn: null, indexReturn: null };

    const asOf = new Date(data.asOf);
    const inception = fund.inceptionDate ? new Date(fund.inceptionDate) : null;
    const start = pickPeriodStart(asOf, chartPeriod, inception);
    if (!start) return { rows: [], windowStartLabel: "", fundReturn: null, indexReturn: null };

    const fundAnchor = findAnchor(fund.series, start);
    const idxAnchor = findAnchor(idx.series, start);
    const fundBase = fundAnchor?.investorReturn ?? 0;
    const idxBase = idxAnchor?.price ?? 0;

    const inWindow = (d: string) => {
      const t = new Date(d).getTime();
      return t >= start.getTime() && t <= asOf.getTime();
    };

    const dateSet = new Set<string>();
    for (const r of fund.series) if (inWindow(r.date)) dateSet.add(r.date.slice(0, 10));
    for (const r of idx.series) if (inWindow(r.date)) dateSet.add(r.date.slice(0, 10));
    const dates = Array.from(dateSet).sort();

    const fundByDate = new Map(fund.series.map((r) => [r.date.slice(0, 10), r.investorReturn]));
    const idxByDate = new Map(idx.series.map((r) => [r.date.slice(0, 10), r.price]));

    const rows = dates.map((d) => {
      const fv = fundByDate.get(d);
      const iv = idxByDate.get(d);
      return {
        date: d,
        [chartFund]: fv != null ? fv - fundBase : null,
        [chartIndex]: iv != null && idxBase > 0 ? ((iv - idxBase) / idxBase) * 100 : null,
      } as Record<string, unknown>;
    });

    const fundReturn = fund.returns[chartPeriod] ?? null;
    const indexReturn = idx.returns[chartPeriod] ?? null;

    return { rows, windowStartLabel: start.toISOString().slice(0, 10), fundReturn, indexReturn };
  }, [data, chartFund, chartIndex, chartPeriod]);

  if (error) {
    return (
      <div className="bg-white rounded-[10px] shadow-card p-6">
        <p className="text-sm text-red-500">Comparison data failed to load: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-[10px] shadow-card p-6">
        <p className="text-sm text-text-body">Loading comparison…</p>
      </div>
    );
  }

  const fmtPct = (v: number | null) => (v == null ? "—" : `${v.toFixed(2)}%`);

  return (
    <div className="bg-white rounded-[10px] shadow-card p-6 h-full flex flex-col">
      {/* Fixed 130px header — same as InvestmentGrowth so the chart
          area below starts at the same y in both cards. */}
      <div className="h-[130px] flex flex-col">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-[16px] font-semibold text-text-dark font-rajdhani">Performance Comparison</h3>
            <p className="text-[11px] text-text-body mt-0.5">
              As of {new Date(data.asOf).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              {" "}· Ekush fund vs market index
            </p>
          </div>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-[11px] text-text-body block mb-1">Fund</label>
            <select
              value={chartFund}
              onChange={(e) => setChartFund(e.target.value as "EFUF" | "EGF")}
              className="h-8 px-2 text-[12px] border border-gray-200 rounded-md bg-white focus:outline-none focus:border-ekush-orange"
            >
              {data.funds
                .filter((f) => f.code === "EFUF" || f.code === "EGF")
                .map((f) => (
                  <option key={f.code} value={f.code}>{f.name}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-text-body block mb-1">Index</label>
            <select
              value={chartIndex}
              onChange={(e) => setChartIndex(e.target.value as IndexCode)}
              className="h-8 px-2 text-[12px] border border-gray-200 rounded-md bg-white focus:outline-none focus:border-ekush-orange"
            >
              <option value="DSEX">DSEX</option>
              <option value="DS30">DS30</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-text-body block mb-1">Period</label>
            <select
              value={chartPeriod}
              onChange={(e) => setChartPeriod(e.target.value as PeriodId)}
              className="h-8 px-2 text-[12px] border border-gray-200 rounded-md bg-white focus:outline-none focus:border-ekush-orange"
            >
              {PERIOD_LABELS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend row — pulled up with -mt to occupy zero net layout
          space so the chart still starts exactly at the 130px mark.
          Sits visually inside the spare bottom band of the header. */}
      <div className="-mt-7 h-7 flex items-center gap-4 text-[12px]">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: FUND_COLOR }} />
          <span className="text-text-body">{chartFund}</span>
          <span className={`font-mono font-semibold ${chart.fundReturn != null && chart.fundReturn >= 0 ? "text-green-600" : "text-red-500"}`}>
            {fmtPct(chart.fundReturn)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: INDEX_COLOR }} />
          <span className="text-text-body">{chartIndex}</span>
          <span className={`font-mono font-semibold ${chart.indexReturn != null && chart.indexReturn >= 0 ? "text-green-600" : "text-red-500"}`}>
            {fmtPct(chart.indexReturn)}
          </span>
        </div>
      </div>

      {/* Chart — shared margins with InvestmentGrowth so plot rectangles
          (and therefore x-axis tick rows) line up to the pixel. */}
      <div className="flex-1 min-h-[280px]">
        {chart.rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[12px] text-text-muted">
            No data for the selected period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart.rows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} interval="preserveStartEnd" tickFormatter={(v: string) => v.slice(2)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
              <Tooltip
                formatter={(v: unknown) => (typeof v === "number" ? `${v.toFixed(2)}%` : "—")}
                labelFormatter={(l: unknown) => (typeof l === "string" ? l : String(l))}
                contentStyle={{ fontSize: 11 }}
              />
              <Line type="monotone" dataKey={chartFund} stroke={FUND_COLOR} strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey={chartIndex} stroke={INDEX_COLOR} strokeWidth={1.5} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-[8px] text-text-body mt-3 leading-relaxed">
        Ekush managed fund returns are total-return (dividend-adjusted) sourced. DSEX and DS30 are
        price-return indices. this is illustration purpose only and may not be directly comparable.
      </p>
    </div>
  );
}
