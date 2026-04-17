import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPER_ADMIN"];
const DELETE_ROLES = ["ADMIN", "SUPER_ADMIN"];

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
  const { name, email, phone, address, nidNumber, tinNumber, investorType, status, userId, investorCode } = body;

  try {
    // Validate investor code on activation; must be unique and in format letter+5-6 digits
    const currentInvestor = await prisma.investor.findUnique({
      where: { id: params.id },
      select: { investorCode: true, userId: true },
    });
    if (!currentInvestor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    let finalInvestorCode: string | undefined;
    const codeProvided = typeof investorCode === "string" && investorCode.trim().length > 0;
    const codeChanged = codeProvided && investorCode.trim().toUpperCase() !== currentInvestor.investorCode;

    if (status === "ACTIVE" && currentInvestor.investorCode.startsWith("PENDING-")) {
      if (!codeProvided) {
        return NextResponse.json(
          { error: "Investor code is required to activate this account." },
          { status: 400 },
        );
      }
    }

    if (codeChanged) {
      const normalized = investorCode.trim().toUpperCase();
      if (!/^[A-Z]\d{5,6}$/.test(normalized)) {
        return NextResponse.json(
          { error: "Investor code must be one letter followed by 5–6 digits (e.g. A00730)." },
          { status: 400 },
        );
      }
      const codeClash = await prisma.investor.findFirst({
        where: { investorCode: normalized, NOT: { id: params.id } },
        select: { id: true },
      });
      if (codeClash) {
        return NextResponse.json(
          { error: `Investor code ${normalized} is already assigned to another investor.` },
          { status: 400 },
        );
      }
      finalInvestorCode = normalized;
    }

    await prisma.$transaction([
      prisma.investor.update({
        where: { id: params.id },
        data: {
          name,
          address: address || null,
          nidNumber: nidNumber || null,
          tinNumber: tinNumber || null,
          investorType,
          ...(finalInvestorCode ? { investorCode: finalInvestorCode } : {}),
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !DELETE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized — only ADMIN or SUPER_ADMIN can delete investors" }, { status: 401 });
  }

  try {
    const investor = await prisma.investor.findUnique({
      where: { id: params.id },
      select: { userId: true, name: true, investorCode: true },
    });

    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    // Deleting the User cascades to Investor and all its children
    // (holdings, transactions, nominees, documents, bank accounts, etc.)
    await prisma.user.delete({ where: { id: investor.userId } });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "DELETE",
        entity: "Investor",
        entityId: params.id,
        newValue: JSON.stringify({
          name: investor.name,
          investorCode: investor.investorCode,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Admin investor delete error:", err);
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 500 });
  }
}
