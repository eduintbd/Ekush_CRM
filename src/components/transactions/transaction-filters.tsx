"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { DownloadTransactionReport } from "@/components/statements/pdf-buttons";

interface Fund {
  code: string;
  name: string;
}

interface Props {
  funds: Fund[];
  years: number[];
}

export function TransactionFilters({ funds, years }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      // Reset pagination when filters change
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router]
  );

  const baseClass =
    "h-[42px] px-4 bg-input-bg border border-input-border rounded-[5px] text-[13px] text-text-body min-w-[180px] focus:outline-none focus:border-ekush-orange";

  return (
    <div className="flex flex-wrap gap-4">
      <select
        className={baseClass}
        value={params.get("fund") ?? ""}
        onChange={(e) => setParam("fund", e.target.value)}
      >
        <option value="">Select a fund</option>
        {funds.map((f) => (
          <option key={f.code} value={f.code}>
            {f.code} — {f.name}
          </option>
        ))}
      </select>

      <select
        className={baseClass}
        value={params.get("year") ?? ""}
        onChange={(e) => setParam("year", e.target.value)}
      >
        <option value="">Select a year</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select
        className={baseClass}
        value={params.get("type") ?? ""}
        onChange={(e) => setParam("type", e.target.value)}
      >
        <option value="">Select txn type</option>
        <option value="BUY">Buy</option>
        <option value="SELL">Sell</option>
      </select>

      <DownloadTransactionReport
        fund={params.get("fund") ?? undefined}
        year={params.get("year") ?? undefined}
        type={params.get("type") ?? undefined}
      />
    </div>
  );
}
