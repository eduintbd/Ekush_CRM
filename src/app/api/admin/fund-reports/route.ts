import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/upload";

const ADMIN_ROLES = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPER_ADMIN"];

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !ADMIN_ROLES.includes(role)) {
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
  });

  return NextResponse.json({ success: true, report });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !ADMIN_ROLES.includes(role)) {
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
