import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Submits a one-time Buy via Direct Debit Instruction. Creates a Transaction
// (matching the Manual-payment shape) plus a DdiInstruction snapshot plus an
// ApprovalQueue entry. Admin processes the debit out of band.
export async function POST(req: NextRequest) {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;
  const userId = (session?.user as any)?.id;

  if (!investorId || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { fundCode, amount, termsAccepted } = body as {
    fundCode?: string;
    amount?: number;
    termsAccepted?: boolean;
  };

  if (!fundCode || !amount || amount <= 0) {
    return NextResponse.json({ error: "Fund and positive amount required" }, { status: 400 });
  }
  if (!termsAccepted) {
    return NextResponse.json(
      { error: "You must accept the DDI terms before submitting" },
      { status: 400 },
    );
  }

  const [fund, investor] = await Promise.all([
    prisma.fund.findUnique({ where: { code: fundCode } }),
    prisma.investor.findUnique({
      where: { id: investorId },
      select: { signatureUrl: true, bankAccounts: { where: { isPrimary: true }, take: 1 } },
    }),
  ]);

  if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  if (!investor) return NextResponse.json({ error: "Investor not found" }, { status: 404 });

  const nav = Number(fund.currentNav);
  if (nav <= 0) return NextResponse.json({ error: "NAV not available" }, { status: 400 });

  if (investor.bankAccounts.length === 0) {
    return NextResponse.json(
      { error: "No registered bank account on file. Please add one via Profile Management." },
      { status: 400 },
    );
  }

  const units = amount / nav;
  const unitCapital = units * 10;
  const unitPremium = amount - unitCapital;

  // Create transaction + DDI snapshot + approval queue + notification together.
  // No blob upload here — the DDI PDF is generated on demand via /api/forms/buy-ddi?ddiId=...
  const transaction = await prisma.transaction.create({
    data: {
      investorId,
      fundId: fund.id,
      channel: "LS",
      direction: "BUY",
      amount,
      nav,
      units,
      cumulativeUnits: 0,
      unitCapital,
      unitPremium,
      avgCostAtTime: nav,
      realizedGain: 0,
      costOfUnitsSold: 0,
      orderDate: new Date(),
      status: "PENDING",
      paymentMethod: "DDI",
      notes: "One-time buy via Direct Debit Instruction",
    },
  });

  const ddi = await prisma.ddiInstruction.create({
    data: {
      investorId,
      fundId: fund.id,
      transactionId: transaction.id,
      amount,
      signatureUrl: investor.signatureUrl ?? null,
      termsAccepted: true,
      status: "PENDING_REVIEW",
    },
  });

  // Store the DDI id on the transaction's paymentRef so the admin approvals
  // table can link to /api/forms/buy-ddi?ddiId=... without another lookup.
  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { paymentRef: `ddi:${ddi.id}` },
  });

  await Promise.all([
    prisma.approvalQueue.create({
      data: {
        entityType: "TRANSACTION",
        entityId: transaction.id,
        makerId: userId,
        status: "PENDING",
        notes: `BUY ${fundCode} via DDI - BDT ${amount.toLocaleString("en-IN")} (${units.toFixed(4)} units @ NAV ${nav.toFixed(4)})`,
      },
    }),
    prisma.notification.create({
      data: {
        userId,
        type: "TRANSACTION",
        title: "DDI Authorization Submitted",
        message: `Your direct debit instruction for ${fundCode} of BDT ${amount.toLocaleString("en-IN")} has been submitted and is pending review.`,
        link: "/transactions",
      },
    }),
  ]);

  return NextResponse.json({
    id: transaction.id,
    ddiId: ddi.id,
    status: "PENDING",
    fund: fundCode,
    amount,
    estimatedUnits: units,
    nav,
    message: "DDI authorization submitted successfully. Pending admin review.",
  });
}
