import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, cacheHeaders, resolveFund } from "../_helpers";

// Surfaces the Financial Statement PDFs uploaded in /admin/fund-reports
// (reportType = FINANCIAL_STATEMENT) to the ekushwml.com Financial
// History tab. `isAudited` best-effort sniffed from the title; admin
// can always override by editing the title (e.g. "… (Audited)").
export const revalidate = 86400;

function sniffAudited(title: string): boolean {
  const t = title.toLowerCase();
  if (t.includes("un-audited") || t.includes("unaudited")) return false;
  return t.includes("audited");
}

export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  const lookup = await resolveFund(params.code);
  if ("notFound" in lookup) return lookup.notFound;

  const reports = await prisma.fundReport.findMany({
    where: { fundId: lookup.fund.id, reportType: "FINANCIAL_STATEMENT" },
    select: { title: true, fileName: true, filePath: true, reportDate: true },
    orderBy: { reportDate: "desc" },
  });

  const rows = reports.map((r) => {
    const title = r.title || r.fileName;
    return {
      title,
      url: absoluteUrl(r.filePath),
      date: r.reportDate,
      isAudited: sniffAudited(title),
    };
  });

  return NextResponse.json(rows, { headers: cacheHeaders });
}
