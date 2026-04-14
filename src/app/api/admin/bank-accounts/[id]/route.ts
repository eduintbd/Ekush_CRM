import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPER_ADMIN"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { bankName, accountNumber, branchName, routingNumber } = body;

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
