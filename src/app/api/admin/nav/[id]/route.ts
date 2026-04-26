import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/roles";

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
    // Log + echo the id so we can see exactly what the route received
    // when a 404 happens — useful when the ID coming from the page
    // looks valid but findUnique still returns null (e.g. stale render
    // pointing at a row that was deleted, or a Vercel build/runtime
    // mismatch).
    console.error("[nav/delete] record not found for id:", JSON.stringify(id));
    return NextResponse.json(
      { error: `NAV record not found (id: ${id})` },
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

    // Re-snapshot every holding in this fund to the new currentNav —
    // mirrors /api/admin/nav's bulk-upsert holding-update block. Skip
    // when no rows remain rather than zero everything out.
    if (remaining.length > 0) {
      const holdings = await prisma.fundHolding.findMany({
        where: { fundId: record.fundId },
      });
      await Promise.all(
        holdings.map((h) => {
          const units = Number(h.totalCurrentUnits);
          const newMv = units * newCurrent;
          const costValue = Number(h.totalCostValueCurrent);
          return prisma.fundHolding.update({
            where: { id: h.id },
            data: {
              nav: newCurrent,
              totalMarketValue: newMv,
              totalUnrealizedGain: newMv - costValue,
              lsMarketValue: Number(h.lsCurrentUnits) * newCurrent,
              sipMarketValue: Number(h.sipCurrentUnits) * newCurrent,
              marketValueSellable: Number(h.totalSellableUnits) * newCurrent,
            },
          });
        }),
      );

      // Recalculate AUM from the freshly-snapshotted market values.
      const aum = await prisma.fundHolding.aggregate({
        where: { fundId: record.fundId },
        _sum: { totalMarketValue: true },
      });
      await prisma.fund.update({
        where: { id: record.fundId },
        data: { totalAum: aum._sum.totalMarketValue || 0 },
      });
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

  return NextResponse.json({ success: true, wasLatest });
}
