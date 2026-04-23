import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/roles";
import { flushTag, fundTag } from "@/lib/marketing-revalidator";

/**
 * Admin endpoints for the annual Dividend History table surfaced on
 * the ekushwml.com rebuild. This is a separate model from the per-
 * investor `Dividend` table — it stores one row per (fund, year) with
 * the headline annual dividend % the business publishes.
 */

// GET: list all entries, optionally filtered by fund
export async function GET(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fundId = req.nextUrl.searchParams.get("fundId");
  const entries = await prisma.dividendHistory.findMany({
    where: fundId ? { fundId } : {},
    include: { fund: { select: { code: true, name: true } } },
    orderBy: [{ fundId: "asc" }, { year: "desc" }],
  });

  return NextResponse.json({ entries });
}

// POST: upsert (admin flow: type year + %, click save — replaces any
// existing row for that fund-year combo rather than creating a duplicate)
export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const fundId = String(body.fundId ?? "").trim();
  const year = Number(body.year);
  const annualDividendPct = Number(body.annualDividendPct);
  const note = body.note ? String(body.note).trim() : null;

  if (!fundId || !Number.isFinite(year) || !Number.isFinite(annualDividendPct)) {
    return NextResponse.json(
      { error: "fundId, year (number), and annualDividendPct (number) are required" },
      { status: 400 },
    );
  }

  const entry = await prisma.dividendHistory.upsert({
    where: { fundId_year: { fundId, year } },
    create: { fundId, year, annualDividendPct, note },
    update: { annualDividendPct, note },
    include: { fund: { select: { code: true } } },
  });

  if (entry.fund?.code) {
    await flushTag(fundTag(entry.fund.code, "dividends"));
  }

  return NextResponse.json({ success: true, entry });
}
