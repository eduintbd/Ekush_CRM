import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { STAFF_ROLES, canApproveRequest } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  
  if (!STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const approvals = await prisma.approvalQueue.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Batch-fetch transaction details instead of N+1
  const transactionIds = approvals
    .filter((a) => a.entityType === "TRANSACTION")
    .map((a) => a.entityId);

  const transactions =
    transactionIds.length > 0
      ? await prisma.transaction.findMany({
          where: { id: { in: transactionIds } },
          include: { fund: true, investor: true },
        })
      : [];

  const txMap = new Map(transactions.map((t) => [t.id, t]));

  const enriched = approvals.map((a) => ({
    ...a,
    details: a.entityType === "TRANSACTION" ? txMap.get(a.entityId) ?? null : null,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  const body = await req.json();
  const { approvalId, action, notes } = body;

  if (!approvalId || !action) {
    return NextResponse.json({ error: "Approval ID and action required" }, { status: 400 });
  }

  const approval = await prisma.approvalQueue.findUnique({ where: { id: approvalId } });
  if (!approval) {
    return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  }

  // Role + maker-checker separation in one check: caller must have
  // APPROVE_REQUEST capability AND must not be the maker (creator).
  const gate = canApproveRequest(role, userId, approval.makerId);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }

  if (action === "approve") {
    // Execute the transaction
    if (approval.entityType === "TRANSACTION") {
      const tx = await prisma.transaction.findUnique({
        where: { id: approval.entityId },
        include: { investor: true, fund: true },
      });

      if (tx) {
        // Parallelize: approval update + transaction update + notification
        await Promise.all([
          prisma.approvalQueue.update({
            where: { id: approvalId },
            data: { status: "APPROVED", checkerId: userId, notes },
          }),
          prisma.transaction.update({
            where: { id: tx.id },
            data: { status: "EXECUTED" },
          }),
          prisma.notification.create({
            data: {
              userId: tx.investor.userId,
              type: "TRANSACTION",
              title: `${tx.direction} Order Executed`,
              message: `Your ${tx.direction.toLowerCase()} order for ${tx.fund.code} has been approved and executed.`,
              link: "/transactions",
            },
          }),
        ]);
      }
    }
  } else if (action === "reject") {
    if (approval.entityType === "TRANSACTION") {
      const tx = await prisma.transaction.findUnique({
        where: { id: approval.entityId },
        include: { investor: true },
      });
      if (tx) {
        // Parallelize: approval update + transaction update + notification
        await Promise.all([
          prisma.approvalQueue.update({
            where: { id: approvalId },
            data: { status: "REJECTED", checkerId: userId, notes },
          }),
          prisma.transaction.update({
            where: { id: tx.id },
            data: { status: "REJECTED" },
          }),
          prisma.notification.create({
            data: {
              userId: tx.investor.userId,
              type: "TRANSACTION",
              title: `${tx.direction} Order Rejected`,
              message: `Your ${tx.direction.toLowerCase()} order has been rejected. ${notes ? `Reason: ${notes}` : ""}`,
              link: "/transactions",
            },
          }),
        ]);
      }
    }
  }

  return NextResponse.json({ success: true });
}
