"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

interface Fund {
  fundCode: string;
  fundName: string;
  marketValue: number;
  weight: number;
}

const COLORS = ["#E53935", "#43A047", "#1E88E5", "#FB8C00", "#8E24AA"];

const RechartsChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = mod;

      return function ChartInner({ data }: { data: { name: string; value: number; weight: string }[] }) {
        return (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => `${Number(value).toLocaleString("en-IN")}`}
                contentStyle={{ borderRadius: "10px", border: "1px solid #e8ecef", boxShadow: "0 4px 15px rgba(0,0,0,0.08)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      };
    }),
  {
    loading: () => <div className="h-[200px] bg-page-bg animate-pulse rounded-[10px]" />,
    ssr: false,
  }
);

export function AllocationChart({ funds }: { funds: Fund[] }) {
  const data = useMemo(
    () =>
      funds
        .filter((f) => f.marketValue > 0)
        .map((f) => ({
          name: f.fundCode,
          value: Math.round(f.marketValue),
          weight: f.weight.toFixed(1),
        })),
    [funds]
  );

  if (data.length === 0) {
    return <p className="text-text-muted text-sm text-center py-10">No data available</p>;
  }

  return (
    <div>
      <RechartsChart data={data} />

      {/* Legend */}
      <div className="space-y-2 mt-2">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-text-body">{item.name}</span>
            </div>
            <span className="font-semibold text-text-dark">{item.weight}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
