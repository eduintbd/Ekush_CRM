import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/upload";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;

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
  await prisma.bankAccount.create({
    data: {
      investorId,
      bankName: "Pending Review",
      accountNumber: "Pending Review",
      chequeLeafUrl,
      isPrimary: existingCount === 0,
    },
  });

  return NextResponse.json({ success: true });
}
