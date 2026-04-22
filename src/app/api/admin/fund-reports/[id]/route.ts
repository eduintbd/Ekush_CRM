import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/roles";
import { flushTag, fundTag } from "@/lib/marketing-revalidator";

// Kept in sync with the sibling POST route — report types not listed
// don't surface on the public marketing site.
const REPORT_TYPE_TO_SECTION: Record<string, string> = {
  PORTFOLIO_STATEMENT: "portfolio-statements",
  FINANCIAL_STATEMENT: "financial-statements",
  FORMATION_DOCUMENT: "formation-documents",
  FORM_PDF: "forms",
};

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pull the fund code + reportType up-front so we can flush the
  // marketing cache once the delete succeeds.
  const existing = await prisma.fundReport.findUnique({
    where: { id: params.id },
    select: { reportType: true, fund: { select: { code: true } } },
  });

  await prisma.fundReport.delete({ where: { id: params.id } });

  const section = existing ? REPORT_TYPE_TO_SECTION[existing.reportType] : null;
  if (section && existing?.fund?.code) {
    await flushTag(fundTag(existing.fund.code, section));
  }

  return NextResponse.json({ success: true });
}
