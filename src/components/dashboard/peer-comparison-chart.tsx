"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Data sourced from UCB Weekly Mutual Fund Review (April 9, 2026)    */
/* ------------------------------------------------------------------ */

interface FundReturn {
  name: string;
  short: string;
  oneYear: number;
  twoYear: number;
  isEkush: boolean;
}

const PEER_DATA: FundReturn[] = [
  // Ekush funds (highlighted)
  { name: "Ekush First Unit Fund", short: "Ekush EFUF", oneYear: 20.5, twoYear: 33.8, isEkush: true },
  { name: "Ekush Growth Fund", short: "Ekush EGF", oneYear: 21.8, twoYear: 35.6, isEkush: true },
  { name: "Ekush Stable Return Fund", short: "Ekush ESRF", oneYear: 14.9, twoYear: 30.6, isEkush: true },
  // Top competitors
  { name: "EDGE Bangladesh Mutual Fund", short: "EDGE BD", oneYear: 24.5, twoYear: 36.0, isEkush: false },
  { name: "EDGE AMC Growth Fund", short: "EDGE Growth", oneYear: 24.1, twoYear: 35.8, isEkush: false },
  { name: "CWT Emerging BD FGF", short: "CWT Emerging", oneYear: 18.8, twoYear: 29.1, isEkush: false },
  { name: "UCB Income Plus Fund", short: "UCB Income+", oneYear: 19.2, twoYear: 32.7, isEkush: false },
  { name: "VIPB Balanced Fund", short: "VIPB Balanced", oneYear: 18.1, twoYear: 31.8, isEkush: false },
  { name: "IDLC Growth Fund", short: "IDLC Growth", oneYear: 16.4, twoYear: 27.0, isEkush: false },
  { name: "VIPB Accelerated Income", short: "VIPB Accel", oneYear: 17.6, twoYear: 28.8, isEkush: false },
];

const EKUSH_COLOR = "#2ecc71"; // emerald green
const PEER_COLOR = "#34495e"; // slate blue

const RechartsChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        BarChart,
        Bar,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
        Cell,
      } = mod;

      return function ChartInner({
        data,
        dataKey,
      }: {
        data: FundReturn[];
        dataKey: "oneYear" | "twoYear";
      }) {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 10, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EFF1F7" vertical={false} />
              <XAxis
                dataKey="short"
                tick={{ fontSize: 10, fill: "#828BB2" }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#828BB2" }}
                tickFormatter={(v: number) => `${v}%`}
                label={{
                  value: "Return (%)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "#828BB2" },
                }}
              />
              <Tooltip
                cursor={{ fill: "rgba(46, 204, 113, 0.08)" }}
                formatter={(v: any) => [`${Number(v).toFixed(1)}%`, dataKey === "oneYear" ? "1-Year Return" : "2-Year Return"]}
                labelFormatter={(label: any, payload: any) => {
                  const fund = payload?.[0]?.payload;
                  return fund?.name ?? label;
                }}
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid #e8ecef",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={entry.isEkush ? EKUSH_COLOR : PEER_COLOR}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  {
    loading: () => <div className="h-[300px] bg-page-bg animate-pulse rounded-[10px]" />,
    ssr: false,
  }
);

export function PeerComparisonChart() {
  const [period, setPeriod] = useState<"oneYear" | "twoYear">("oneYear");

  return (
    <div className="bg-white rounded-[10px] shadow-card p-6 h-full flex flex-col">
      {/* Title + toggle */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div>
          <h3 className="text-[14px] font-semibold text-text-dark font-rajdhani leading-tight">
            Comparative Performance
          </h3>
          <p className="text-[11px] text-text-body mt-0.5">
            Ekush vs Market Peers (April 2026)
          </p>
        </div>

        {/* Period toggle */}
        <div className="flex rounded-lg bg-gray-100 p-0.5 shrink-0">
          <button
            onClick={() => setPeriod("oneYear")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
              period === "oneYear"
                ? "bg-white text-[#2ecc71] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            1 Year
          </button>
          <button
            onClick={() => setPeriod("twoYear")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
              period === "twoYear"
                ? "bg-white text-[#2ecc71] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            2 Year
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-[11px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: EKUSH_COLOR }} />
          <span className="text-gray-600 font-medium">Ekush Funds</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PEER_COLOR }} />
          <span className="text-gray-600">Market Peers</span>
        </div>
      </div>

      <div className="flex-1">
        <RechartsChart data={PEER_DATA} dataKey={period} />
      </div>

      <p className="text-[9px] text-text-muted mt-2 text-center">
        Source: UCB Weekly Mutual Fund Review, April 9, 2026
      </p>
    </div>
  );
}
