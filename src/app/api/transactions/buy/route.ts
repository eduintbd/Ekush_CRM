import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const investorId = (session?.user as any)?.investorId;
  const userId = (session?.user as any)?.id;

  if (!investorId || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Accept either JSON or multipart/form-data (with optional payment slip)
  const contentType = req.headers.get("content-type") || "";
  let fundCode: string | undefined;
  let amount: number | undefined;
  let channel: string | undefined;
  let paymentSlip: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    fundCode = form.get("fundCode") as string | undefined;
    amount = parseFloat(form.get("amount") as string);
    channel = (form.get("channel") as string) || "LS";
    paymentSlip = form.get("paymentSlip") as File | null;
  } else {
    const body = await req.json();
    fundCode = body.fundCode;
    amount = body.amount;
    channel = body.channel;
  }

  if (!fundCode || !amount || amount <= 0) {
    return NextResponse.json({ error: "Fund and positive amount required" }, { status: 400 });
  }

  const fund = await prisma.fund.findUnique({ where: { code: fundCode } });
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

  const nav = Number(fund.currentNav);
  if (nav <= 0) {
    return NextResponse.json({ error: "NAV not available" }, { status: 400 });
  }

  const units = amount / nav;
  const unitCapital = units * 10; // face value
  const unitPremium = amount - unitCapital;

  // Persist payment slip to local uploads dir (same pattern as /api/documents)
  let paymentRef: string | null = null;
  if (paymentSlip && paymentSlip.size > 0) {
    const uploadDir = path.join(process.cwd(), "uploads", investorId, "payment-slips");
    await mkdir(uploadDir, { recursive: true });
    const fileName = `${Date.now()}_${paymentSlip.name.replace(/[^\w.\-]/g, "_")}`;
    const filePath = path.join(uploadDir, fileName);
    const bytes = await paymentSlip.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));
    paymentRef = `uploads/${investorId}/payment-slips/${fileName}`;
  }

  // Create pending transaction
  const transaction = await prisma.transaction.create({
    data: {
      investorId,
      fundId: fund.id,
      channel: channel || "LS",
      direction: "BUY",
      amount,
      nav,
      units,
      cumulativeUnits: 0, // will be updated on execution
      unitCapital,
      unitPremium,
      avgCostAtTime: nav,
      realizedGain: 0,
      costOfUnitsSold: 0,
      orderDate: new Date(),
      status: "PENDING",
      paymentMethod: "BANK_TRANSFER",
      paymentRef,
    },
  });

  // Create approval queue entry and notification in parallel
  await Promise.all([
    prisma.approvalQueue.create({
      data: {
        entityType: "TRANSACTION",
        entityId: transaction.id,
        makerId: userId,
        status: "PENDING",
        notes: `BUY ${fundCode} - BDT ${amount.toLocaleString("en-IN")} (${units.toFixed(4)} units @ NAV ${nav.toFixed(4)})`,
      },
    }),
    prisma.notification.create({
      data: {
        userId,
        type: "TRANSACTION",
        title: "Buy Order Placed",
        message: `Your buy order for ${fundCode} of BDT ${amount.toLocaleString("en-IN")} has been submitted and is pending approval.`,
        link: "/transactions",
      },
    }),
  ]);

  return NextResponse.json({
    id: transaction.id,
    status: "PENDING",
    fund: fundCode,
    amount,
    estimatedUnits: units,
    nav,
    paymentRef,
    message: "Order submitted successfully. Pending approval.",
  });
}
