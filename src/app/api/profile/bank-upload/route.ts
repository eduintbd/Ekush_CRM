import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/upload";

export async function POST(req: NextRequest) {
  const session = await getSession();
  let investorId = (session?.user as any)?.investorId;

  // Fallback: look up from DB if not in session metadata
  if (!investorId && (session?.user as any)?.id) {
    const user = await prisma.user.findUnique({
      where: { id: (session!.user as any).id },
      select: { investor: { select: { id: true } } },
    });
    investorId = user?.investor?.id;
  }

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const chequeLeaf = formData.get("chequeLeaf") as File | null;

  if (!chequeLeaf) {
    return NextResponse.json({ error: "Cheque leaf image is required" }, { status: 400 });
  }

  // Validate file size (5MB max)
  if (chequeLeaf.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 });
  }

  // Upload the cheque leaf image
  const ext = chequeLeaf.name.split(".").pop() || "jpg";
  const key = `cheque-leaves/${investorId}/${Date.now()}.${ext}`;
  const chequeLeafUrl = await uploadFile(chequeLeaf, key);

  // If first bank account, make it primary
  const existingCount = await prisma.bankAccount.count({ where: { investorId } });

  // Create bank account with cheque leaf — bank details will be filled by admin after review
  const bankAccount = await prisma.bankAccount.create({
    data: {
      investorId,
      bankName: "Pending Review",
      accountNumber: "Pending Review",
      chequeLeafUrl,
      isPrimary: existingCount === 0,
    },
  });

  // Existing investor (has investor code) = create a verification ticket.
  // New sign-ups (no code yet) = no ticket.
  const investor = await prisma.investor.findUnique({ where: { id: investorId }, select: { investorCode: true, name: true } });
  if (investor?.investorCode) {
    const trackingNumber = `BNK-${Date.now().toString(36).toUpperCase()}`;
    await prisma.serviceRequest.create({
      data: {
        investorId,
        type: "BANK_VERIFICATION",
        status: "OPEN",
        description: `Bank account change request from ${investor.name} (${investor.investorCode}). Cheque leaf uploaded for verification. Bank Account ID: ${bankAccount.id}`,
        trackingNumber,
        slaDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });
  }

  return NextResponse.json({ success: true });
}
