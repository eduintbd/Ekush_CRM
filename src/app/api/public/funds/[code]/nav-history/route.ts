import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { navCacheHeaders, resolveFund } from "../_helpers";

// Paginated NAV rows + optional date range for the rebuild's NAV History
// table and the layout-level Notice Board. Force-dynamic (no CRM ISR)
// so admin inserts/deletes are immediately visible to the rebuild
// fetcher — the rebuild's own data cache is the only layer left,
// and admin write paths flush its tag via flushTag('fund-<code>-
// nav-history') on every save.
export const dynamic = "force-dynamic";

const MAX_PER_PAGE = 100;
const DEFAULT_PER_PAGE = 10;

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(
  req: Request,
  { params }: { params: { code: string } },
) {
  const lookup = await resolveFund(params.code);
  if ("notFound" in lookup) return lookup.notFound;

  const { searchParams } = new URL(req.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(1, parseInt(searchParams.get("perPage") ?? String(DEFAULT_PER_PAGE), 10) || DEFAULT_PER_PAGE),
  );

  const where = {
    fundId: lookup.fund.id,
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [total, records] = await Promise.all([
    prisma.navRecord.count({ where }),
    prisma.navRecord.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        date: true,
        nav: true,
        investorReturn: true,
        buyUnit: true,
        sellUnit: true,
      },
    }),
  ]);

  const rows = records.map((r) => ({
    navAsOn: r.date.toISOString(),
    navPerUnit: Number(r.nav),
    investorReturn: r.investorReturn === null ? null : Number(r.investorReturn),
    buyUnit: r.buyUnit === null ? 0 : Number(r.buyUnit),
    sellUnit: r.sellUnit === null ? 0 : Number(r.sellUnit),
  }));

  return NextResponse.json(
    { rows, page, perPage, total },
    { headers: navCacheHeaders },
  );
}
