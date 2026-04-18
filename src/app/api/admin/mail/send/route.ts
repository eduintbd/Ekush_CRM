import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/smtp";
import {
  portfolioStatementEmail,
  taxCertificateEmail,
  TEMPLATE_OPTIONS,
} from "@/lib/mail/templates";
import { getPortfolioBannerDataUrl } from "@/lib/pdf-assets";
import { buildPortfolioStatementFullHtml } from "@/lib/mail/portfolio-statement-html";
import { buildTaxCertificateFullHtml } from "@/lib/mail/tax-certificate-html";
import { renderHtmlBatchToPdfs } from "@/lib/html-to-pdf";

const ADMIN_ROLES = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPER_ADMIN"];

export const runtime = "nodejs";
export const maxDuration = 60;

interface SendRequestBody {
  template: string;
  investorIds: string[];
  fundCode?: string;
  skipZeroMarketValue?: boolean;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as SendRequestBody;
  const { template, investorIds } = body;
  const skipZeroMV = body.skipZeroMarketValue !== false; // default true

  if (!template || !Array.isArray(investorIds) || investorIds.length === 0) {
    return NextResponse.json({ error: "template and investorIds are required" }, { status: 400 });
  }

  const opt = TEMPLATE_OPTIONS.find((o) => o.id === template);
  if (!opt) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  // Welcome email template is still pending copy.
  if (template === "WELCOME") {
    return NextResponse.json(
      { error: "This template is pending — please provide the email text and we'll enable it." },
      { status: 400 },
    );
  }

  // Tax Certificate runs a separate pipeline: different Prisma model,
  // per-investor fund resolution, and its own PDF builder. Early-branch
  // to keep the portfolio flow below untouched.
  if (template === "TAX_CERT") {
    return handleTaxCertSend({
      investorIds,
      adminId: (session.user as any).id as string,
    });
  }

  const fundCode = opt.fundCode ?? body.fundCode;
  if (!fundCode) {
    return NextResponse.json({ error: "Fund code required for this template" }, { status: 400 });
  }

  // Resolve the fund once — selected template pins which fund the PDF is
  // scoped to (same behaviour as the /forms/portfolio-statement?fundCode=…
  // preview page).
  const fund = await prisma.fund.findUnique({ where: { code: fundCode } });
  if (!fund) {
    return NextResponse.json({ error: `Fund ${fundCode} not found` }, { status: 404 });
  }

  const investors = await prisma.investor.findMany({
    where: { id: { in: investorIds } },
    include: {
      user: { select: { email: true } },
      holdings: {
        where: { fundId: fund.id },
        include: { fund: { select: { code: true, name: true, currentNav: true } } },
      },
    },
  });

  // Dividend total per investor for this fund (Investment Results → Dividend Received)
  const dividendAgg = await prisma.dividend.groupBy({
    by: ["investorId"],
    where: { fundId: fund.id, investorId: { in: investorIds } },
    _sum: { grossDividend: true },
  });
  const dividendByInvestor = new Map<string, number>(
    dividendAgg.map((d) => [d.investorId, Number(d._sum.grossDividend || 0)]),
  );

  // Embed the banner as a data URL so Puppeteer doesn't need network access
  // to our domain when rendering via setContent.
  const bannerDataUrl = getPortfolioBannerDataUrl() ?? undefined;

  const results: Array<{
    investorId: string;
    investorCode: string;
    status: "SENT" | "FAILED" | "SKIPPED";
    error?: string;
  }> = [];
  const adminId = (session.user as any).id as string;
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  interface PreparedMail {
    investor: (typeof investors)[number];
    subject: string;
    html: string;
    pdfHtml: string;
  }
  const prepared: PreparedMail[] = [];

  for (const inv of investors) {
    if (!inv.user.email) {
      results.push({
        investorId: inv.id,
        investorCode: inv.investorCode,
        status: "SKIPPED",
        error: "No email on file",
      });
      continue;
    }

    const h = inv.holdings[0];
    const totalUnits = h ? Number(h.totalCurrentUnits) : 0;
    const nav = Number(fund.currentNav);
    const marketValue = totalUnits * nav;

    if (skipZeroMV && marketValue <= 0) {
      results.push({
        investorId: inv.id,
        investorCode: inv.investorCode,
        status: "SKIPPED",
        error: "Zero market value",
      });
      continue;
    }

    const avgCost = h ? Number(h.avgCost) : 0;
    const costValue = h ? Number(h.totalCostValueCurrent) : 0;
    const realizedGain = h ? Number(h.totalRealizedGain) : 0;
    const dividendTotal = dividendByInvestor.get(inv.id) ?? 0;

    const pdfHtml = buildPortfolioStatementFullHtml({
      dateStr,
      investorName: inv.name,
      investorCode: inv.investorCode,
      fundName: fund.name,
      fundCode: fund.code,
      totalUnits,
      avgCost,
      costValue,
      marketValue,
      realizedGain,
      dividendTotal,
      nav,
      entryLoad: Number(fund.entryLoad),
      exitLoad: Number(fund.exitLoad),
      bannerDataUrl,
    });

    const { subject, html } = portfolioStatementEmail({
      investorName: inv.name,
      investorCode: inv.investorCode,
      fundName: opt.fundName ?? fundCode,
      fundCode,
    });

    prepared.push({ investor: inv, subject, html, pdfHtml });
  }

  // Render all PDFs in one browser launch to amortise the ~3-5s cold start.
  let pdfBuffers: Buffer[] = [];
  if (prepared.length > 0) {
    try {
      pdfBuffers = await renderHtmlBatchToPdfs(prepared.map((p) => p.pdfHtml));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "PDF render failed";
      return NextResponse.json(
        {
          error: `Could not render PDFs: ${msg}`,
          sent: 0,
          failed: 0,
          skipped: results.filter((r) => r.status === "SKIPPED").length,
          total: investors.length,
          results,
        },
        { status: 500 },
      );
    }
  }

  for (let i = 0; i < prepared.length; i++) {
    const { investor: inv, subject, html } = prepared[i];
    const pdfBuffer = pdfBuffers[i];
    const pdfName = `Portfolio-Statement-${fundCode}-${inv.investorCode}.pdf`;

    const r = await sendMail({
      to: inv.user.email!,
      subject,
      html,
      attachments: [{ filename: pdfName, content: pdfBuffer, contentType: "application/pdf" }],
    });

    const log = await prisma.mailLog.create({
      data: {
        investorId: inv.id,
        toEmail: inv.user.email!,
        subject,
        template,
        status: r.ok ? "SENT" : "FAILED",
        errorMessage: r.ok ? null : r.error,
        sentById: adminId,
      },
    });

    results.push({
      investorId: inv.id,
      investorCode: inv.investorCode,
      status: r.ok ? "SENT" : "FAILED",
      error: r.ok ? undefined : r.error,
    });

    if (!r.ok && r.error.startsWith("SMTP is not configured")) {
      await prisma.mailLog.delete({ where: { id: log.id } });
      return NextResponse.json(
        {
          error: "SMTP is not configured. Save valid credentials in Mail Settings first.",
          sent: 0,
          failed: 0,
          skipped: 0,
        },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({
    success: true,
    total: investors.length,
    sent: results.filter((r) => r.status === "SENT").length,
    failed: results.filter((r) => r.status === "FAILED").length,
    skipped: results.filter((r) => r.status === "SKIPPED").length,
    results,
  });
}

// Tax Certificate pipeline — picks each investor's most recent
// TaxCertificate row (across all funds) and mails that PDF.
async function handleTaxCertSend({
  investorIds,
  adminId,
}: {
  investorIds: string[];
  adminId: string;
}) {
  const investors = await prisma.investor.findMany({
    where: { id: { in: investorIds } },
    include: {
      user: { select: { email: true } },
      taxCertificates: {
        include: { fund: true },
        orderBy: { periodEnd: "desc" },
        take: 1,
      },
    },
  });

  const bannerDataUrl = getPortfolioBannerDataUrl() ?? undefined;

  const results: Array<{
    investorId: string;
    investorCode: string;
    status: "SENT" | "FAILED" | "SKIPPED";
    error?: string;
  }> = [];

  interface PreparedMail {
    investor: (typeof investors)[number];
    cert: (typeof investors)[number]["taxCertificates"][number];
    subject: string;
    html: string;
    pdfHtml: string;
  }
  const prepared: PreparedMail[] = [];

  for (const inv of investors) {
    if (!inv.user.email) {
      results.push({
        investorId: inv.id,
        investorCode: inv.investorCode,
        status: "SKIPPED",
        error: "No email on file",
      });
      continue;
    }

    const cert = inv.taxCertificates[0];
    if (!cert) {
      results.push({
        investorId: inv.id,
        investorCode: inv.investorCode,
        status: "SKIPPED",
        error: "No tax certificate on file",
      });
      continue;
    }

    const pdfHtml = buildTaxCertificateFullHtml({
      investorName: inv.name,
      investorCode: inv.investorCode,
      investorTitle: inv.title,
      nidNumber: inv.nidNumber,
      tinNumber: inv.tinNumber,
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

    const assessmentYear = getAssessmentYear(cert.periodEnd);
    const { subject, html } = taxCertificateEmail({
      investorName: inv.name,
      investorCode: inv.investorCode,
      fundName: cert.fund.name,
      assessmentYear,
    });

    prepared.push({ investor: inv, cert, subject, html, pdfHtml });
  }

  let pdfBuffers: Buffer[] = [];
  if (prepared.length > 0) {
    try {
      pdfBuffers = await renderHtmlBatchToPdfs(prepared.map((p) => p.pdfHtml));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "PDF render failed";
      return NextResponse.json(
        {
          error: `Could not render PDFs: ${msg}`,
          sent: 0,
          failed: 0,
          skipped: results.filter((r) => r.status === "SKIPPED").length,
          total: investors.length,
          results,
        },
        { status: 500 },
      );
    }
  }

  for (let i = 0; i < prepared.length; i++) {
    const { investor: inv, cert, subject, html } = prepared[i];
    const pdfBuffer = pdfBuffers[i];
    const pdfName = `Tax-Certificate-${inv.investorCode}-${cert.fund.code}.pdf`;

    const r = await sendMail({
      to: inv.user.email!,
      subject,
      html,
      attachments: [{ filename: pdfName, content: pdfBuffer, contentType: "application/pdf" }],
    });

    const log = await prisma.mailLog.create({
      data: {
        investorId: inv.id,
        toEmail: inv.user.email!,
        subject,
        template: "TAX_CERT",
        status: r.ok ? "SENT" : "FAILED",
        errorMessage: r.ok ? null : r.error,
        sentById: adminId,
      },
    });

    results.push({
      investorId: inv.id,
      investorCode: inv.investorCode,
      status: r.ok ? "SENT" : "FAILED",
      error: r.ok ? undefined : r.error,
    });

    if (!r.ok && r.error.startsWith("SMTP is not configured")) {
      await prisma.mailLog.delete({ where: { id: log.id } });
      return NextResponse.json(
        {
          error: "SMTP is not configured. Save valid credentials in Mail Settings first.",
          sent: 0,
          failed: 0,
          skipped: 0,
        },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({
    success: true,
    total: investors.length,
    sent: results.filter((r) => r.status === "SENT").length,
    failed: results.filter((r) => r.status === "FAILED").length,
    skipped: results.filter((r) => r.status === "SKIPPED").length,
    results,
  });
}

function getAssessmentYear(periodEnd: Date | null): string {
  if (!periodEnd) return "N/A";
  const d = new Date(periodEnd);
  const endYear = d.getFullYear();
  const endMonth = d.getMonth();
  // Bangladesh tax year runs July–June; period ending Jul-Dec is FY N/N+1, Jan-Jun is FY N-1/N
  if (endMonth <= 5) return `${endYear} - ${String(endYear + 1).slice(-2)}`;
  return `${endYear + 1} - ${String(endYear + 2).slice(-2)}`;
}
