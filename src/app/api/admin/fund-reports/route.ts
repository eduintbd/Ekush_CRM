import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/upload";
import { STAFF_ROLES } from "@/lib/roles";
import { flushTag, fundTag } from "@/lib/marketing-revalidator";

// Maps a fund-report reportType to the ekushwml.com rebuild's cache
// section key (see web/src/lib/api/fund-detail.ts::fundCacheTag).
// Report types not listed don't surface on the public site so skip
// the webhook entirely.
const REPORT_TYPE_TO_SECTION: Record<string, string> = {
  PORTFOLIO_STATEMENT: "portfolio-statements",
  FINANCIAL_STATEMENT: "financial-statements",
  FORMATION_DOCUMENT: "formation-documents",
  FORM_PDF: "forms",
};


export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const fundId = formData.get("fundId") as string | null;
  const reportType = formData.get("reportType") as string | null;
  const title = (formData.get("title") as string) || "Fund Report";

  if (!file || !fundId || !reportType) {
    return NextResponse.json({ error: "file, fundId, and reportType are required" }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File size must be under 20MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "xlsx";
  const key = `fund-reports/${fundId}/${reportType}/${Date.now()}-${file.name}`;
  const filePath = await uploadFile(file, key);

  const report = await prisma.fundReport.create({
    data: {
      fundId,
      reportType,
      title,
      fileName: file.name,
      filePath,
      mimeType: file.type || null,
      uploadedBy: (session.user as any).id,
    },
    include: { fund: { select: { code: true } } },
  });

  // Best-effort cache flush on the marketing rebuild. flushTag never
  // throws — a failure here must not fail the admin upload.
  const section = REPORT_TYPE_TO_SECTION[reportType];
  if (section && report.fund?.code) {
    await flushTag(fundTag(report.fund.code, section));
  }

  return NextResponse.json({ success: true, report });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fundId = req.nextUrl.searchParams.get("fundId");
  const reports = await prisma.fundReport.findMany({
    where: fundId ? { fundId } : {},
    include: { fund: { select: { code: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reports });
}
