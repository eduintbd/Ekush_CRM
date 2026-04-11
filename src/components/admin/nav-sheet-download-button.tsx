"use client";

import { Download } from "lucide-react";

interface Props {
  fund?: string;
  from?: string;
  to?: string;
}

export function NavSheetDownloadButton({ fund, from, to }: Props) {
  const params = new URLSearchParams();
  if (fund && fund !== "ALL") params.set("fund", fund);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const href = `/api/admin/nav/download${qs ? "?" + qs : ""}`;

  return (
    <a
      href={href}
      className="flex items-center gap-1.5 px-3 py-2 text-sm bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark transition-colors"
    >
      <Download className="w-4 h-4" /> Download NAV Sheet
    </a>
  );
}
