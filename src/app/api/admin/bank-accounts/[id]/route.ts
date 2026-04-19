import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/roles";


export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, bankName, accountNumber, branchName, routingNumber, rejectionNote } = body;

  const current = await prisma.bankAccount.findUnique({ where: { id: params.id } });
  if (!current) {
    return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
  }

  // Reject an awaiting-review account
  if (action === "reject") {
    await prisma.bankAccount.update({
      where: { id: params.id },
      data: { status: "REJECTED" },
    });
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "REJECT_BANK",
        entity: "BankAccount",
        entityId: params.id,
        newValue: JSON.stringify({ rejectionNote: rejectionNote || null }),
      },
    });
    return NextResponse.json({ success: true });
  }

  // Approve (and optionally update details)
  if (action === "approve") {
    const finalBankName = (bankName || current.bankName || "").trim();
    const finalAccountNumber = (accountNumber || current.accountNumber || "").trim();
    if (
      !finalBankName ||
      finalBankName === "Pending Review" ||
      !finalAccountNumber ||
      finalAccountNumber === "Pending Review"
    ) {
      return NextResponse.json(
        { error: "Bank name and account number are required before approving." },
        { status: 400 },
      );
    }
    await prisma.bankAccount.update({
      where: { id: params.id },
      data: {
        bankName: finalBankName,
        branchName: branchName ?? current.branchName,
        accountNumber: finalAccountNumber,
        routingNumber: routingNumber ?? current.routingNumber,
        status: "ACTIVE",
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "APPROVE_BANK",
        entity: "BankAccount",
        entityId: params.id,
        newValue: JSON.stringify({
          bankName: finalBankName,
          accountNumber: finalAccountNumber,
        }),
      },
    });
    return NextResponse.json({ success: true });
  }

  // Legacy: direct-edit (kept for backwards compatibility)
  if (!bankName || !accountNumber) {
    return NextResponse.json({ error: "Bank name and account number required" }, { status: 400 });
  }
  await prisma.bankAccount.update({
    where: { id: params.id },
    data: {
      bankName,
      accountNumber,
      branchName: branchName || null,
      routingNumber: routingNumber || null,
    },
  });
  return NextResponse.json({ success: true });
}
