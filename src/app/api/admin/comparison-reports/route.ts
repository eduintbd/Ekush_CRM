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
  const title = formData.get("title") as string | null;
  const source = formData.get("source") as string | null;
  const reportDateStr = formData.get("reportDate") as string | null;

  if (!file || !title) {
    return NextResponse.json({ error: "File and title are required" }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File size must be under 20MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "pdf";
  const key = `comparison-reports/${Date.now()}-${file.name}`;
  const filePath = await uploadFile(file, key);

  const report = await prisma.comparisonReport.create({
    data: {
      title,
      source: source || null,
      reportDate: reportDateStr ? new Date(reportDateStr) : null,
      fileName: file.name,
      filePath,
      mimeType: file.type || null,
      uploadedBy: (session.user as any).id,
    },
  });

  return NextResponse.json({ success: true, report });
}

export async function GET() {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await prisma.comparisonReport.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reports });
}
