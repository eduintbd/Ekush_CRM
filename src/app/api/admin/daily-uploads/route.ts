import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/upload";
import { STAFF_ROLES } from "@/lib/roles";
import {
  parseFinStats,
  parseInvestorsWorkbook,
  parseTaxCertificates,
  ingestFinStats,
  ingestInvestors,
  ingestTaxCertificates,
} from "@/lib/excel-import";


// Allow up to 5 minutes for large ingestion jobs
export const maxDuration = 300;

function parseDateFromFilename(fileName: string): Date | null {
  // Supports "2026.03.25 FIN STATS.xlsx", "EFUF_2026-03-25_INVESTORS.xlsx", etc.
  const m = fileName.match(/(\d{4})[.\-_](\d{1,2})[.\-_](\d{1,2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const fundId = formData.get("fundId") as string | null;
  const uploadType = formData.get("uploadType") as string | null; // FIN_STATS or INVESTORS

  if (!file || !fundId || !uploadType) {
    return NextResponse.json(
      { error: "file, fundId, and uploadType are required" },
      { status: 400 }
    );
  }

  if (!["FIN_STATS", "INVESTORS"].includes(uploadType)) {
    return NextResponse.json({ error: "Invalid uploadType" }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "File size must be under 50MB" }, { status: 400 });
  }

  const fund = await prisma.fund.findUnique({ where: { id: fundId } });
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

  const reportDate = parseDateFromFilename(file.name) || new Date();

  // Upload the file to blob storage
  const key = `daily-uploads/${fund.code}/${uploadType}/${Date.now()}-${file.name}`;
  const filePath = await uploadFile(file, key);

  // Create the record in PENDING state
  const record = await prisma.dailyFundUpload.create({
    data: {
      fundId,
      uploadType,
      reportDate,
      fileName: file.name,
      filePath,
      mimeType: file.type || null,
      uploadedBy: (session.user as any).id,
      status: "PROCESSING",
    },
  });

  // Read the file buffer for parsing
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    let rowsProcessed = 0;

    if (uploadType === "FIN_STATS") {
      const parsed = await parseFinStats(buffer);
      const result = await ingestFinStats(prisma, fundId, parsed, parsed.asOfDate || reportDate);
      rowsProcessed = result.updatedFields;
    } else {
      const parsed = await parseInvestorsWorkbook(buffer);
      // Skip transaction import for daily uploads — too slow for Vercel timeout.
      // Transactions are imported during initial seed; daily uploads only update holdings.
      const result = await ingestInvestors(prisma, fundId, parsed, { skipTransactions: true });
      rowsProcessed = result.holdingsUpserted + result.txCreated;

      // Tax certificates: pull authoritative per-investor values from the
      // workbook's TAX CERTIFICATE sheet (source of truth, not computed).
      const taxCerts = await parseTaxCertificates(buffer);
      let taxCertsUpserted = 0;
      if (taxCerts) {
        const tcRes = await ingestTaxCertificates(prisma, fundId, taxCerts);
        taxCertsUpserted = tcRes.upserted;
        rowsProcessed += tcRes.upserted;
      }

      // Log to audit log
      await prisma.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: "IMPORT",
          entity: "DailyFundUpload",
          entityId: record.id,
          newValue: JSON.stringify({
            fundCode: fund.code,
            usersCreated: result.usersCreated,
            holdingsUpserted: result.holdingsUpserted,
            txCreated: result.txCreated,
            taxCertsUpserted,
          }),
        },
      });
    }

    await prisma.dailyFundUpload.update({
      where: { id: record.id },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        rowsProcessed,
      },
    });

    return NextResponse.json({
      success: true,
      record: { id: record.id, status: "PROCESSED", rowsProcessed },
    });
  } catch (err: any) {
    console.error("Daily upload ingestion error:", err);

    await prisma.dailyFundUpload.update({
      where: { id: record.id },
      data: {
        status: "FAILED",
        error: err.message || "Unknown error",
      },
    });

    return NextResponse.json(
      {
        error: "Ingestion failed",
        detail: err.message || "Unknown error",
        recordId: record.id,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fundId = req.nextUrl.searchParams.get("fundId");
  const uploads = await prisma.dailyFundUpload.findMany({
    where: fundId ? { fundId } : {},
    orderBy: { createdAt: "desc" },
    include: { fund: { select: { code: true, name: true } } },
    take: 50,
  });

  return NextResponse.json({ uploads });
}
