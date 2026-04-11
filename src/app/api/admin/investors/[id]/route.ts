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
  const { name, email, phone, address, nidNumber, tinNumber, investorType, status, userId } = body;

  try {
    await prisma.$transaction([
      prisma.investor.update({
        where: { id: params.id },
        data: {
          name,
          address: address || null,
          nidNumber: nidNumber || null,
          tinNumber: tinNumber || null,
          investorType,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          email: email || null,
          phone: phone || null,
          status,
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "UPDATE",
        entity: "Investor",
        entityId: params.id,
        newValue: JSON.stringify({ name, email, phone, status, investorType }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Admin investor update error:", err);
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
  }
}
