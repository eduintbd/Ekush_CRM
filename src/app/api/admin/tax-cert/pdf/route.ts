import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPortfolioBannerDataUrl } from "@/lib/pdf-assets";
import { buildTaxCertificateFullHtml } from "@/lib/mail/tax-certificate-html";
import { renderHtmlToPdf } from "@/lib/html-to-pdf";

const ADMIN_ROLES = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPPORT", "SUPER_ADMIN"];

export const runtime = "nodejs";
export const maxDuration = 60;

// Generates and streams a Tax Certificate PDF for an investor. If certId is
// supplied we use that specific cert; otherwise we pick the investor's most
// recent cert by periodEnd. Mirrors the layout the investor sees at
// /forms/tax-certificate?id=<certId>.
export async function GET(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certId = req.nextUrl.searchParams.get("certId");
  const investorId = req.nextUrl.searchParams.get("investorId");

  let cert;
  if (certId) {
    cert = await prisma.taxCertificate.findUnique({
      where: { id: certId },
      include: { fund: true, investor: true },
    });
  } else if (investorId) {
    cert = await prisma.taxCertificate.findFirst({
      where: { investorId },
      include: { fund: true, investor: true },
      orderBy: { periodEnd: "desc" },
    });
  } else {
    return NextResponse.json({ error: "certId or investorId required" }, { status: 400 });
  }

  if (!cert) {
    return NextResponse.json({ error: "Tax certificate not found" }, { status: 404 });
  }

  const bannerDataUrl = getPortfolioBannerDataUrl() ?? undefined;

  const html = buildTaxCertificateFullHtml({
    investorName: cert.investor.name,
    investorCode: cert.investor.investorCode,
    investorTitle: cert.investor.title,
    nidNumber: cert.investor.nidNumber,
    tinNumber: cert.investor.tinNumber,
    fundCode: cert.fund.code,
    fundName: cert.fund.name,
    periodStart: cert.periodStart,
    periodEnd: cert.periodEnd,
    beginningCostValue: Number(cert.beginningCostValue),
    endingCostValue: Number(cert.endingCostValue),
    beginningMarketValue: Number(cert.beginningMarketValue),
    endingMarketValue: Number(cert.endingMarketValue),
    beginningUnrealizedGain: Number(cert.beginningUnrealizedGain),
    endingUnrealizedGain: Number(cert.endingUnrealizedGain),
    totalRealizedGain: Number(cert.totalRealizedGain),
    totalAdditionAtCost: Number(cert.totalAdditionAtCost),
    totalRedemptionAtCost: Number(cert.totalRedemptionAtCost),
    netInvestment: Number(cert.netInvestment),
    totalGrossDividend: Number(cert.totalGrossDividend),
    totalTax: Number(cert.totalTax),
    totalNetDividend: Number(cert.totalNetDividend),
    bannerDataUrl,
  });

  let pdf: Buffer;
  try {
    pdf = await renderHtmlToPdf(html);
  } catch (err) {
    console.error("Tax cert PDF render failed:", err);
    return NextResponse.json({ error: "Could not render PDF" }, { status: 500 });
  }

  const fileName = `Tax-Certificate-${cert.investor.investorCode}-${cert.fund.code}.pdf`;
  return new NextResponse(pdf as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
