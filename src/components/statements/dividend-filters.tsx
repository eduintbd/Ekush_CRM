"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import Link from "next/link";

interface Props {
  fundCodes: string[];
  years: string[];
  currentFund?: string;
  currentYear?: string;
  investorId: string;
}

export function DividendFilters({ fundCodes, years, currentFund, currentYear, investorId }: Props) {
  const pdfParams = new URLSearchParams({ investorId, type: "dividends", format: "pdf" });
  if (currentFund) pdfParams.set("fund", currentFund);
  if (currentYear) pdfParams.set("year", currentYear);

  return (
    <Card>
      <CardContent className="p-4">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[11px] text-text-body block mb-1">Select a fund</label>
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
            <label className="text-[11px] text-text-body block mb-1">Select a year</label>
            <select
              name="year"
              defaultValue={currentYear || ""}
              className="px-3 py-2 text-sm border border-ekush-orange text-ekush-orange rounded-md focus:outline-none bg-white min-w-[160px]"
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
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
            <Link href="/dividends" className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50">
              Clear
            </Link>
          )}
          <a
            href={`/api/admin/statements/download?${pdfParams.toString()}`}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark"
          >
            <Download className="w-4 h-4" /> Download PDF
          </a>
        </form>
      </CardContent>
    </Card>
  );
}
