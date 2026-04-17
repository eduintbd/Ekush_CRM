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

interface FundBlock {
  code: string;
  name: string;
  inceptionDate: string | null;
  returns: Partial<Record<PeriodId, number>>;
  series: Array<{ date: string; investorReturn: number }>;
}

interface IndexBlock {
  code: string;
  returns: Partial<Record<PeriodId, number>>;
  series: Array<{ date: string; price: number }>;
}

interface ApiResponse {
  asOf: string;
  periods: PeriodId[];
  funds: FundBlock[];
  indices: IndexBlock[];
}

// Recharts is heavy — load on the client only and code-split it.
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });

const FUND_COLOR = "#F27023";
const DSEX_COLOR = "#1e3a5f";
const DS30_COLOR = "#16a34a";

function formatPct(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "-";
  return `${n >= 0 ? "" : ""}${n.toFixed(2)}%`;
}

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

// For a sorted-asc series, return the element whose date is on-or-before
// the target. Used to anchor each line at 0% on the period-start date.
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
  const [chartPeriod, setChartPeriod] = useState<PeriodId>("3Y");

  useEffect(() => {
    let alive = true;
    fetch("/api/performance-comparison")
      .then((r) => r.json())
      .then((d: ApiResponse) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Load failed"); });
    return () => { alive = false; };
  }, []);

  const chartSeries = useMemo(() => {
    if (!data) return { rows: [] as Array<Record<string, unknown>>, windowStartLabel: "", windowEndLabel: "" };
    const fund = data.funds.find((f) => f.code === chartFund);
    const dsex = data.indices.find((i) => i.code === "DSEX");
    const ds30 = data.indices.find((i) => i.code === "DS30");
    if (!fund || !dsex || !ds30) return { rows: [], windowStartLabel: "", windowEndLabel: "" };

    const asOf = new Date(data.asOf);
    const inception = fund.inceptionDate ? new Date(fund.inceptionDate) : null;
    const start = pickPeriodStart(asOf, chartPeriod, inception);
    if (!start) return { rows: [], windowStartLabel: "", windowEndLabel: "" };

    // Anchor every line to 0 at the period start.
    const fundAnchor = findAnchor(fund.series, start);
    const dsexAnchor = findAnchor(dsex.series, start);
    const ds30Anchor = findAnchor(ds30.series, start);

    const fundBase = fundAnchor?.investorReturn ?? 0;
    const dsexBase = dsexAnchor?.price ?? 0;
    const ds30Base = ds30Anchor?.price ?? 0;

    const inWindow = (d: string) => {
      const t = new Date(d).getTime();
      return t >= start.getTime() && t <= asOf.getTime();
    };

    // Union of all dates in the window across the three series, so every
    // x-tick shows whatever data is available on that date.
    const dateSet = new Set<string>();
    for (const r of fund.series) if (inWindow(r.date)) dateSet.add(r.date.slice(0, 10));
    for (const r of dsex.series) if (inWindow(r.date)) dateSet.add(r.date.slice(0, 10));
    for (const r of ds30.series) if (inWindow(r.date)) dateSet.add(r.date.slice(0, 10));
    const dates = Array.from(dateSet).sort();

    const fundByDate = new Map(fund.series.map((r) => [r.date.slice(0, 10), r.investorReturn]));
    const dsexByDate = new Map(dsex.series.map((r) => [r.date.slice(0, 10), r.price]));
    const ds30ByDate = new Map(ds30.series.map((r) => [r.date.slice(0, 10), r.price]));

    const rows = dates.map((d) => {
      const fv = fundByDate.get(d);
      const dv = dsexByDate.get(d);
      const d30v = ds30ByDate.get(d);
      return {
        date: d,
        [chartFund]: fv != null ? fv - fundBase : null,
        DSEX: dv != null && dsexBase > 0 ? ((dv - dsexBase) / dsexBase) * 100 : null,
        DS30: d30v != null && ds30Base > 0 ? ((d30v - ds30Base) / ds30Base) * 100 : null,
      } as Record<string, unknown>;
    });

    const fmtLabel = (d: Date) => d.toISOString().slice(0, 10);
    return { rows, windowStartLabel: fmtLabel(start), windowEndLabel: fmtLabel(asOf) };
  }, [data, chartFund, chartPeriod]);

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

  const tableRows: Array<{ label: string; code: string; returns: Partial<Record<PeriodId, number>> }> = [
    ...data.funds.map((f) => ({ label: f.name, code: f.code, returns: f.returns })),
    ...data.indices.map((i) => ({ label: i.code, code: i.code, returns: i.returns })),
  ];

  return (
    <div className="bg-white rounded-[10px] shadow-card p-6 h-full flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-[16px] font-semibold text-text-dark font-rajdhani">Performance Comparison</h3>
          <p className="text-[11px] text-text-body mt-0.5">
            As of {new Date(data.asOf).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            {" "}· Ekush funds vs DSEX &amp; DS30
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="bg-ekush-orange text-white">
              <th className="text-left px-3 py-2 font-semibold">Strategy Name</th>
              {PERIOD_LABELS.map((p) => (
                <th key={p.id} className="text-right px-3 py-2 font-semibold">{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, i) => (
              <tr key={row.code} className={i % 2 === 1 ? "bg-page-bg/60" : ""}>
                <td className="text-left px-3 py-2 text-text-dark">{row.label}</td>
                {PERIOD_LABELS.map((p) => {
                  const v = row.returns[p.id];
                  return (
                    <td
                      key={p.id}
                      className={`text-right px-3 py-2 font-mono ${
                        v == null ? "text-text-muted" : v >= 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {formatPct(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chart controls */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <div>
          <label className="text-[11px] text-text-body block mb-1">Fund</label>
          <select
            value={chartFund}
            onChange={(e) => setChartFund(e.target.value as "EFUF" | "EGF")}
            className="h-8 px-2 text-[12px] border border-gray-200 rounded-md bg-white focus:outline-none focus:border-ekush-orange"
          >
            {data.funds.map((f) => (
              <option key={f.code} value={f.code}>{f.name}</option>
            ))}
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
        <p className="text-[11px] text-text-body ml-auto">
          Cumulative return (%) anchored at 0 on {chartSeries.windowStartLabel || "—"}
        </p>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[260px]">
        {chartSeries.rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[12px] text-text-muted">
            No data for the selected period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartSeries.rows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                minTickGap={40}
                tickFormatter={(v: string) => v.slice(2)}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              />
              <Tooltip
                formatter={(v: unknown) =>
                  typeof v === "number" ? `${v.toFixed(2)}%` : "—"
                }
                labelFormatter={(l: unknown) => (typeof l === "string" ? l : String(l))}
                contentStyle={{ fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey={chartFund}
                stroke={FUND_COLOR}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="DSEX"
                stroke={DSEX_COLOR}
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="DS30"
                stroke={DS30_COLOR}
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
