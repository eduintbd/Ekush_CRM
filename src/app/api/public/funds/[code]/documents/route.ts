import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 86400;

// Subset of FundReport reportType values surfaced on the public site.
const PUBLIC_TYPES = new Set([
  "PROSPECTUS",
  "TRUST_DEED",
  "APPLICATION_FORM",
  "REDEMPTION_FORM",
  "FIN_STATS",
  "PORTFOLIO",
]);

export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  const code = params.code.toUpperCase();
  const fund = await prisma.fund.findUnique({ where: { code }, select: { id: true } });
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

  const reports = await prisma.fundReport.findMany({
    where: {
      fundId: fund.id,
      reportType: { in: Array.from(PUBLIC_TYPES) },
    },
    select: {
      id: true,
      reportType: true,
      title: true,
      fileName: true,
      filePath: true,
      reportDate: true,
    },
    orderBy: { reportDate: "desc" },
  });

  // Filepaths in this CRM are relative to /public — expose them as absolute
  // URLs so the cross-origin marketing site can link to them directly.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const rows = reports.map((r) => ({
    type: r.reportType,
    title: r.title || r.fileName,
    url: r.filePath.startsWith("http") ? r.filePath : `${base}${r.filePath}`,
    date: r.reportDate,
  }));

  return NextResponse.json(rows, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" },
  });
}
