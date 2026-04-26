import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import {
  uploadKycDocument,
  KycUploadError,
  PDF_ALLOWED_KYC_KINDS,
} from "@/lib/upload";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = await prisma.kycRecord.findMany({
    where: { investorId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;
  const userId = (session?.user as any)?.id;

  if (!investorId || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const type = formData.get("type") as string;
  const file = formData.get("file") as File | null;
  const selfie = formData.get("selfie") as File | null;

  if (!type) {
    return NextResponse.json({ error: "KYC type required" }, { status: 400 });
  }

  let documentUrl: string | null = null;
  let selfieUrl: string | null = null;

  try {
    if (file && file.size > 0) {
      const r = await uploadKycDocument(file, {
        investorId,
        allowPdf: PDF_ALLOWED_KYC_KINDS.has(type),
      });
      documentUrl = r.filePath;
    }
    if (selfie && selfie.size > 0) {
      // Selfies are always images — never PDF.
      const r = await uploadKycDocument(selfie, {
        investorId,
        allowPdf: false,
      });
      selfieUrl = r.filePath;
    }
  } catch (err) {
    if (err instanceof KycUploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  // Create KYC record and notification in parallel
  const [record] = await Promise.all([
    prisma.kycRecord.create({
      data: {
        investorId,
        type,
        status: "PENDING",
        documentUrl,
        selfieUrl,
      },
    }),
    prisma.notification.create({
      data: {
        userId,
        type: "KYC",
        title: "KYC Document Submitted",
        message: `Your ${type} document has been submitted for verification.`,
        link: "/profile",
      },
    }),
  ]);

  return NextResponse.json(record);
}
