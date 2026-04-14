"use client";

import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface Props {
  fundCodes: string[];
  years: string[];
  currentFund?: string;
  currentYear?: string;
}

export function TaxCertFilters({ fundCodes, years, currentFund, currentYear }: Props) {
  return (
    <Card>
      <CardContent className="p-4">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[11px] text-text-body block mb-1">Select Fund</label>
            <select
              name="fund"
              defaultValue={currentFund || ""}
              className="px-3 py-2 text-sm border border-ekush-orange text-ekush-orange rounded-md focus:outline-none bg-white min-w-[160px]"
            >
              <option value="">All Funds</option>
              {fundCodes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-text-body block mb-1">Assessment Year</label>
            <select
              name="year"
              defaultValue={currentYear || ""}
              className="px-3 py-2 text-sm border border-ekush-orange text-ekush-orange rounded-md focus:outline-none bg-white min-w-[160px]"
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y.split(" ")[0]}>{y}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark"
          >
            Filter
          </button>
          {(currentFund || currentYear) && (
            <Link href="/tax-certificate" className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50">
              Clear
            </Link>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
