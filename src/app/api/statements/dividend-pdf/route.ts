import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDividendReportPDF } from "@/lib/pdf";

export async function GET(req: NextRequest) {
  const session = await getSession();
  let investorId = (session?.user as any)?.investorId;

  // Fallback: look up from DB
  if (!investorId && session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { investor: { select: { id: true } } },
    });
    investorId = user?.investor?.id;
  }

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    select: { investorCode: true, name: true, investorType: true },
  });

  if (!investor) {
    return NextResponse.json({ error: "Investor not found" }, { status: 404 });
  }

  const fundCode = req.nextUrl.searchParams.get("fund");
  const year = req.nextUrl.searchParams.get("year");

  const where: any = { investorId };
  if (fundCode) {
    const fund = await prisma.fund.findUnique({ where: { code: fundCode } });
    if (fund) where.fundId = fund.id;
  }
  if (year) {
    where.accountingYear = year;
  }

  const dividends = await prisma.dividend.findMany({
    where,
    include: { fund: { select: { code: true } } },
    orderBy: { paymentDate: "desc" },
  });

  const doc = generateDividendReportPDF({
    investorName: investor.name,
    investorCode: investor.investorCode,
    investorType: investor.investorType,
    generatedDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    dateRange: {
      from: year ? `Year ${year}` : "All years",
      to: fundCode ? `Fund: ${fundCode}` : "All funds",
    },
    dividends: dividends.map((d) => ({
      year: d.accountingYear || "—",
      fundCode: d.fund.code,
      paymentDate: d.paymentDate
        ? d.paymentDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "—",
      totalUnits: Number(d.totalUnits),
      dividendPerUnit: Number(d.dividendPerUnit),
      grossDividend: Number(d.grossDividend),
      taxAmount: Number(d.taxAmount),
      netDividend: Number(d.netDividend),
      option: d.dividendOption,
    })),
  });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Dividend-Statement-${investor.investorCode}.pdf"`,
    },
  });
}
