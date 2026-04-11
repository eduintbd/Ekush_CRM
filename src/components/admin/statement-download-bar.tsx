"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

interface Props {
  investorId: string;
  type: "portfolio" | "transactions" | "dividends" | "tax";
  showDateFilter?: boolean;
}

export function StatementDownloadBar({ investorId, type, showDateFilter = true }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const buildUrl = (format: "csv" | "pdf") => {
    const params = new URLSearchParams({
      investorId,
      type,
      format,
    });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/admin/statements/download?${params.toString()}`;
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      {showDateFilter && (
        <>
          <div>
            <label className="text-[11px] text-text-body block mb-1">Beginning Date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange"
            />
          </div>
          <div>
            <label className="text-[11px] text-text-body block mb-1">Ending Date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange"
            />
          </div>
        </>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <a
          href={buildUrl("csv")}
          className="flex items-center gap-1 px-3 py-2 text-[12px] border border-ekush-orange text-ekush-orange rounded-md hover:bg-ekush-orange hover:text-white transition-colors"
        >
          <Download className="w-3 h-3" /> CSV
        </a>
        <a
          href={buildUrl("pdf")}
          className="flex items-center gap-1 px-3 py-2 text-[12px] bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark"
        >
          <FileText className="w-3 h-3" /> PDF
        </a>
      </div>
    </div>
  );
}
