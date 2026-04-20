import { NextResponse } from "next/server";

// Portfolio composition (asset-class breakdown) for the marketing site.
// The CRM currently has no `PortfolioAllocation` table — investor-level
// holdings exist but nothing captures fund-level asset class splits.
// Returns an empty array until a CMS surface is added; the marketing
// site renders "Data unavailable" for this section in that case.
export const revalidate = 86400;

export async function GET(
  _req: Request,
  _ctx: { params: { code: string } },
) {
  return NextResponse.json([], {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" },
  });
}
