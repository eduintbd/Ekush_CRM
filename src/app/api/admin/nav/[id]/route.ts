import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/roles";
import { flushNavCaches } from "@/lib/marketing-revalidator";

// Vercel default function timeout is 10s, which the per-row holdings
// re-snapshot blew past for funds with hundreds of investors — the
// first observed delete returned 500 at 18.27s but the navRecord
// itself had already been deleted by then, leaving the cascade
// half-applied. 60s gives the bulk-SQL cascade ample headroom even
// for the largest fund.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Delete a single NAV record.
 *
 * Mirror of /api/admin/nav/insert's "if this is the latest row, sync
 * Fund.currentNav + holdings" logic — applied in reverse on delete:
 * if the deleted row was the latest for its fund, the fund and every
 * holding in it get re-snapshotted to the new latest NAV. Without
 * this, deleting today's row would leave Fund.currentNav pinned to
 * a price that no longer has a backing record, and every consumer
 * of currentNav (portal dashboard, fund pages, certificates) would
 * silently show a stale value.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Record id required" }, { status: 400 });
  }

  const record = await prisma.navRecord.findUnique({
    where: { id },
    include: { fund: true },
  });
  if (!record) {
    // Diagnostic: confirm we're connected to the right DB and surface
    // a few real ids so we can compare against what the page rendered.
    // Helps tell apart "id is invalid" vs "page render used stale/
    // cached data that doesn't match the live DB".
    const totalCount = await prisma.navRecord.count();
    const sampleIds = await prisma.navRecord.findMany({
      take: 3,
      orderBy: { date: "desc" },
      select: { id: true, date: true },
    });
    console.error("[nav/delete] not found", {
      receivedId: id,
      totalRecords: totalCount,
      latestIds: sampleIds.map((r) => `${r.id} (${r.date.toISOString().slice(0, 10)})`),
    });
    return NextResponse.json(
      {
        error: `NAV record not found (id: ${id})`,
        debug: {
          receivedId: id,
          totalRecords: totalCount,
          latestIds: sampleIds.map((r) => ({
            id: r.id,
            date: r.date.toISOString().slice(0, 10),
          })),
        },
      },
      { status: 404 },
    );
  }

  // Snapshot for the audit log before we delete.
  const snapshot = {
    fundCode: record.fund.code,
    date: record.date.toISOString().split("T")[0],
    nav: Number(record.nav),
    investorReturn: record.investorReturn != null ? Number(record.investorReturn) : null,
    buyUnit: record.buyUnit != null ? Number(record.buyUnit) : null,
    sellUnit: record.sellUnit != null ? Number(record.sellUnit) : null,
    dsex: record.dsex != null ? Number(record.dsex) : null,
    ds30: record.ds30 != null ? Number(record.ds30) : null,
  };

  // Find the current latest row before delete so we can tell whether
  // the deletion will displace Fund.currentNav.
  const previousLatest = await prisma.navRecord.findFirst({
    where: { fundId: record.fundId },
    orderBy: { date: "desc" },
    select: { id: true },
  });
  const wasLatest = previousLatest?.id === record.id;

  await prisma.navRecord.delete({ where: { id } });

  if (wasLatest) {
    // Re-derive currentNav from the new latest, and previousNav from
    // the one before that. If the deleted row was the only one left,
    // both fall back to face value to avoid pinning to a value that
    // no longer has a record.
    const remaining = await prisma.navRecord.findMany({
      where: { fundId: record.fundId },
      orderBy: { date: "desc" },
      take: 2,
      select: { nav: true },
    });
    const face = Number(record.fund.faceValue);
    const newCurrent = remaining[0] ? Number(remaining[0].nav) : face;
    const newPrevious = remaining[1] ? Number(remaining[1].nav) : newCurrent;

    await prisma.fund.update({
      where: { id: record.fundId },
      data: { currentNav: newCurrent, previousNav: newPrevious },
    });

    // Re-snapshot every holding in this fund as ONE bulk UPDATE
    // instead of N per-row Prisma updates. The previous per-row loop
    // serialized through pgbouncer's connection_limit=1 and easily
    // exceeded the function timeout for funds with hundreds of
    // investors (the first reported delete failed at 18.27s with the
    // navRecord itself already gone). Single round-trip stays under
    // a second even for thousands of rows.
    if (remaining.length > 0) {
      await prisma.$executeRaw`
        UPDATE fund_holdings
        SET
          "nav" = ${newCurrent},
          "totalMarketValue" = "totalCurrentUnits" * ${newCurrent},
          "totalUnrealizedGain" = ("totalCurrentUnits" * ${newCurrent}) - "totalCostValueCurrent",
          "lsMarketValue" = "lsCurrentUnits" * ${newCurrent},
          "sipMarketValue" = "sipCurrentUnits" * ${newCurrent},
          "marketValueSellable" = "totalSellableUnits" * ${newCurrent}
        WHERE "fundId" = ${record.fundId}
      `;

      // AUM as a single SQL aggregate-and-update.
      await prisma.$executeRaw`
        UPDATE funds
        SET "totalAum" = COALESCE(
          (SELECT SUM("totalMarketValue") FROM fund_holdings WHERE "fundId" = ${record.fundId}),
          0
        )
        WHERE "id" = ${record.fundId}
      `;
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: "NAV_DELETE",
      entity: "NavRecord",
      entityId: id,
      oldValue: JSON.stringify(snapshot),
    },
  });

  // Drop the rebuild's cached nav-history + performance responses for
  // this fund so the Notice Board, NAV history table, and growth /
  // comparison charts reflect the deletion immediately.
  await flushNavCaches(record.fund.code);

  return NextResponse.json({ success: true, wasLatest });
}
