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

  const documents = await prisma.document.findMany({
    where: { investorId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) || "KYC_DOC";

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  let result;
  try {
    result = await uploadKycDocument(file, {
      investorId,
      allowPdf: PDF_ALLOWED_KYC_KINDS.has(type),
    });
  } catch (err) {
    if (err instanceof KycUploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const document = await prisma.document.create({
    data: {
      investorId,
      type,
      fileName: result.displayName,
      filePath: result.filePath,
      mimeType: result.storedMimeType,
    },
  });

  return NextResponse.json(document);
}
