"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

type PeriodId = "YTD" | "3Y" | "5Y";
type FundCode = "EFUF" | "EGF" | "ESRF";

interface FundBlock {
  code: string;
  name: string;
  inceptionDate: string | null;
  returns: Record<string, number | undefined>;
  series: Array<{ date: string; investorReturn: number }>;
}

interface ApiResponse {
  asOf: string;
  funds: FundBlock[];
}

const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then((m) => m.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((m) => m.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });

const PERIOD_OPTIONS: Array<{ id: PeriodId; label: string }> = [
  { id: "YTD", label: "YTD" },
  { id: "3Y", label: "3Y" },
  { id: "5Y", label: "5Y" },
];

function fmtBdt(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function periodStart(asOf: Date, period: PeriodId): Date {
  const n = new Date(asOf);
  switch (period) {
    case "YTD": return new Date(Date.UTC(n.getUTCFullYear(), 0, 1));
    case "3Y": return new Date(Date.UTC(n.getUTCFullYear() - 3, n.getUTCMonth(), n.getUTCDate()));
    case "5Y": return new Date(Date.UTC(n.getUTCFullYear() - 5, n.getUTCMonth(), n.getUTCDate()));
  }
}

function findAnchor<T extends { date: string }>(series: T[], target: Date): T | null {
  let best: T | null = null;
  for (const r of series) {
    if (new Date(r.date).getTime() <= target.getTime()) best = r;
    else break;
  }
  return best ?? (series.length > 0 ? series[0] : null);
}

export function InvestmentGrowth() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const amount = 100_000;
  const [fund, setFund] = useState<FundCode>("EFUF");
  const [period, setPeriod] = useState<PeriodId>("3Y");

  useEffect(() => {
    let alive = true;
    fetch("/api/performance-comparison")
      .then((r) => r.json())
      .then((d: ApiResponse) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Load failed"); });
    return () => { alive = false; };
  }, []);

  const chart = useMemo(() => {
    if (!data) return { rows: [], startLabel: "", endValue: null as number | null };
    const f = data.funds.find((x) => x.code === fund);
    if (!f) return { rows: [], startLabel: "", endValue: null };

    const asOf = new Date(data.asOf);
    const start = periodStart(asOf, period);
    const anchor = findAnchor(f.series, start);
    if (!anchor) return { rows: [], startLabel: "", endValue: null };
    const baseIR = anchor.investorReturn;

    // User spec: apply the investor-return difference as a simple factor,
    // consistent with the Performance Comparison table math.
    const points = f.series
      .filter((p) => {
        const t = new Date(p.date).getTime();
        return t >= start.getTime() && t <= asOf.getTime();
      })
      .map((p) => ({
        date: p.date.slice(0, 10),
        value: amount * (1 + (p.investorReturn - baseIR) / 100),
      }));

    // Seed the very first point at the initial amount so the chart
    // always starts exactly at the dropdown value.
    if (points.length === 0 || new Date(points[0].date).getTime() > start.getTime()) {
      points.unshift({ date: start.toISOString().slice(0, 10), value: amount });
    }

    const endValue = points.length > 0 ? points[points.length - 1].value : amount;
    return { rows: points, startLabel: start.toISOString().slice(0, 10), endValue };
  }, [data, amount, fund, period]);

  if (error) {
    return (
      <div className="bg-white rounded-[10px] shadow-card p-6">
        <p className="text-sm text-red-500">Growth data failed to load: {error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="bg-white rounded-[10px] shadow-card p-6">
        <p className="text-sm text-text-body">Loading growth…</p>
      </div>
    );
  }

  const fundBlock = data.funds.find((f) => f.code === fund);

  return (
    <div className="bg-white rounded-[10px] shadow-card p-6 h-full flex flex-col">
      {/* Fixed 130px header so this card's chart area starts at the
          exact same y as the PerformanceComparison sibling — the
          x-axis baselines align across both cards in the row. */}
      <div className="h-[130px] flex flex-col">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-[16px] font-semibold text-text-dark font-rajdhani">
            Growth of 1 lac taka
          </h3>
          {chart.endValue != null && (
            <div className="text-right shrink-0">
              <p className="text-[11px] text-text-body">Current value</p>
              <p className="text-[18px] font-semibold font-rajdhani text-ekush-orange">
                {fmtBdt(chart.endValue)}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-[11px] text-text-body block mb-1">Fund</label>
            <select
              value={fund}
              onChange={(e) => setFund(e.target.value as FundCode)}
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
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodId)}
              className="h-8 px-2 text-[12px] border border-gray-200 rounded-md bg-white focus:outline-none focus:border-ekush-orange"
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chart — shared margins with PerformanceComparison so the plot
          rectangles (and therefore the x-axis tick row) line up to
          the pixel. */}
      <div className="flex-1 min-h-[280px]">
        {chart.rows.length < 2 ? (
          <div className="h-full flex items-center justify-center text-[12px] text-text-muted">
            Not enough NAV history for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart.rows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F27023" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#F27023" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} interval="preserveStartEnd" tickFormatter={(v: string) => v.slice(2)} />
              <YAxis
                domain={[80_000, "auto"]}
                allowDataOverflow={false}
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => (v >= 10_000_000 ? `${(v / 10_000_000).toFixed(1)}Cr` : v >= 100_000 ? `${(v / 100_000).toFixed(1)}L` : v.toFixed(0))}
              />
              <Tooltip
                formatter={(v: unknown) => (typeof v === "number" ? fmtBdt(v) : "—")}
                labelFormatter={(l: unknown) => (typeof l === "string" ? l : String(l))}
                contentStyle={{ fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#F27023"
                strokeWidth={2}
                fill="url(#growthFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-[8px] text-text-body mt-3 leading-relaxed">
        This chart shows the result if you were invested in {fundBlock?.name ?? fund} from{" "}
        {chart.startLabel
          ? new Date(chart.startLabel).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—"}{" "}
        to{" "}
        {new Date(data.asOf).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}.
        Past performance does not guarantee future results.
      </p>
    </div>
  );
}
