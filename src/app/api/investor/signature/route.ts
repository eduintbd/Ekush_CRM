import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/upload";

export async function GET() {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;
  if (!investorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    select: { signatureUrl: true },
  });

  return NextResponse.json({ signatureUrl: investor?.signatureUrl ?? null });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;
  if (!investorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("signature") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Signature file required" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Image file required" }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 2MB" }, { status: 400 });
  }

  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const url = await uploadFile(
    file,
    `${investorId}/signature/${Date.now()}_${safeName}`,
  );

  await prisma.investor.update({
    where: { id: investorId },
    data: { signatureUrl: url },
  });

  return NextResponse.json({ signatureUrl: url });
}
