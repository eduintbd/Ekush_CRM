import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public Fund Fact Sheet — powers the collapsible panel on
 * ekushwml.com/fund/<slug>. Returns the admin-curated asset
 * allocation + top holdings + "data as of" date. Null when the
 * admin hasn't published a fact sheet yet for this fund.
 *
 * No Vercel-edge caching: per-edge regional staleness has bitten
 * us before (see articles/route.ts). The rebuild calls this with
 * cache:'no-store' too.
 */
export const dynamic = "force-dynamic";

const ALLOWED_CODES = new Set(["EFUF", "EGF", "ESRF"]);

export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  const code = params.code.toUpperCase();
  if (!ALLOWED_CODES.has(code)) {
    return NextResponse.json(
      { error: "Unknown fund code" },
      { status: 404 },
    );
  }

  const sheet = await prisma.fundFactSheet.findUnique({
    where: { fundCode: code },
    select: {
      fundCode: true,
      asOfDate: true,
      assetAllocation: true,
      topHoldings: true,
      updatedAt: true,
    },
  });

  if (!sheet) {
    return NextResponse.json(
      { fundCode: code, asOfDate: null, assetAllocation: [], topHoldings: [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return NextResponse.json(
    {
      fundCode: sheet.fundCode,
      asOfDate: sheet.asOfDate.toISOString(),
      assetAllocation: sheet.assetAllocation,
      topHoldings: sheet.topHoldings,
      updatedAt: sheet.updatedAt.toISOString(),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
