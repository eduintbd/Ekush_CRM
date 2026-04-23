import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, cacheHeaders, resolveFund } from "../_helpers";

// Surfaces BSEC Certificate / Prospectus / Trust Deed / Custodian
// Agreement / IMA PDFs uploaded in /admin/fund-reports (reportType =
// FORMATION_DOCUMENT) to the ekushwml.com Formation Docs tab.
export const revalidate = 86400;

export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  const lookup = await resolveFund(params.code);
  if ("notFound" in lookup) return lookup.notFound;

  const reports = await prisma.fundReport.findMany({
    where: { fundId: lookup.fund.id, reportType: "FORMATION_DOCUMENT" },
    select: { title: true, fileName: true, filePath: true, reportDate: true },
    orderBy: { reportDate: "desc" },
  });

  const rows = reports.map((r) => ({
    title: r.title || r.fileName,
    url: absoluteUrl(r.filePath),
    date: r.reportDate,
  }));

  return NextResponse.json(rows, { headers: cacheHeaders });
}
