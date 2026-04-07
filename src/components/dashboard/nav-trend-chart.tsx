"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

interface NavPoint {
  date: string;
  nav: number;
}

interface Props {
  fundCode: string;
  fundName: string;
  currentNav: number;
  data: NavPoint[];
}

const RechartsArea = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        AreaChart,
        Area,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = mod;

      return function ChartInner({ data }: { data: NavPoint[] }) {
        // Compute Y-axis domain with a little padding
        const navs = data.map((d) => d.nav);
        const minNav = Math.floor(Math.min(...navs) * 0.98);
        const maxNav = Math.ceil(Math.max(...navs) * 1.02);

        return (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F27023" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#F27023" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFF1F7" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#828BB2" }}
                tickFormatter={(d: string) => {
                  const dt = new Date(d);
                  return dt.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
                }}
                minTickGap={40}
              />
              <YAxis
                domain={[minNav, maxNav]}
                tick={{ fontSize: 10, fill: "#828BB2" }}
                tickFormatter={(v: number) => v.toFixed(2)}
                width={45}
              />
              <Tooltip
                labelFormatter={(d: any) =>
                  new Date(String(d)).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                }
                formatter={(v: any) => [`${Number(v).toFixed(4)}`, "NAV"]}
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid #e8ecef",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="nav"
                stroke="#F27023"
                strokeWidth={2}
                fill="url(#navFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      };
    }),
  {
    loading: () => <div className="h-[220px] bg-page-bg animate-pulse rounded-[10px]" />,
    ssr: false,
  }
);

export function NavTrendChart({ fundCode, fundName, currentNav, data }: Props) {
  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [data]
  );

  return (
    <div className="bg-white rounded-[10px] shadow-card p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="text-[16px] font-semibold text-text-dark font-rajdhani">
            {fundCode}
          </h3>
          <p className="text-[11px] text-text-body uppercase tracking-wider">{fundName}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-text-body">Current NAV</p>
          <p className="text-[18px] font-semibold text-ekush-orange font-rajdhani">
            {currentNav.toFixed(4)}
          </p>
        </div>
      </div>
      {sorted.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-16">No NAV history available.</p>
      ) : (
        <RechartsArea data={sorted} />
      )}
    </div>
  );
}
