import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/smtp";
import { portfolioStatementEmail, TEMPLATE_OPTIONS } from "@/lib/mail/templates";
import { generatePortfolioStatementPDF } from "@/lib/pdf";

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

  // Templates pending (user will provide copy later)
  if (template === "TAX_CERT" || template === "WELCOME") {
    return NextResponse.json(
      { error: "This template is pending — please provide the email text and we'll enable it." },
      { status: 400 },
    );
  }

  const fundCode = opt.fundCode ?? body.fundCode;
  if (!fundCode) {
    return NextResponse.json({ error: "Fund code required for this template" }, { status: 400 });
  }

  const investors = await prisma.investor.findMany({
    where: { id: { in: investorIds } },
    include: {
      user: { select: { email: true } },
      holdings: { include: { fund: { select: { code: true, name: true, currentNav: true } } } },
    },
  });

  const results: Array<{ investorId: string; investorCode: string; status: "SENT" | "FAILED" | "SKIPPED"; error?: string }> = [];
  const adminId = (session.user as any).id as string;

  for (const inv of investors) {
    if (!inv.user.email) {
      results.push({ investorId: inv.id, investorCode: inv.investorCode, status: "SKIPPED", error: "No email on file" });
      continue;
    }

    // Default rule: skip if market value in this fund is zero
    if (skipZeroMV) {
      const h = inv.holdings.find((x) => x.fund.code === fundCode);
      const mv = h ? Number(h.totalCurrentUnits) * Number(h.fund.currentNav) : 0;
      if (mv <= 0) {
        results.push({ investorId: inv.id, investorCode: inv.investorCode, status: "SKIPPED", error: "Zero market value" });
        continue;
      }
    }

    const { subject, html } = portfolioStatementEmail({
      investorName: inv.name,
      investorCode: inv.investorCode,
      fundName: opt.fundName ?? fundCode,
      fundCode,
    });

    // Build the portfolio-statement PDF for this investor, scoped to the
    // selected fund (matches what /forms/portfolio-statement renders).
    const fundHoldings = inv.holdings.filter((h) => h.fund.code === fundCode);
    let totalCost = 0;
    let totalMarket = 0;
    let totalGain = 0;
    const pdfHoldings = fundHoldings.map((h) => {
      const units = Number(h.totalCurrentUnits);
      const avgCost = Number(h.avgCost);
      const nav = Number(h.fund.currentNav);
      const costValue = Number(h.totalCostValueCurrent);
      const marketValue = units * nav;
      const gain = marketValue - costValue;
      const returnPct =
        Number(h.annualizedReturn) || (costValue > 0 ? (gain / costValue) * 100 : 0);
      totalCost += costValue;
      totalMarket += marketValue;
      totalGain += gain;
      return {
        fundCode: h.fund.code,
        fundName: h.fund.name,
        totalUnits: units,
        avgCost,
        nav,
        costValue,
        marketValue,
        gain,
        gainPercent: returnPct,
      };
    });

    const today = new Date();
    const doc = generatePortfolioStatementPDF({
      investorName: inv.name,
      investorCode: inv.investorCode,
      investorType: inv.investorType ?? "—",
      generatedDate: today.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      dateRange: { from: "Opening", to: "As of " + today.toLocaleDateString("en-GB") },
      holdings: pdfHoldings,
      totalCost,
      totalMarket,
      totalGain,
    });
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const pdfName = `Portfolio-${fundCode}-${inv.investorCode}.pdf`;

    const r = await sendMail({
      to: inv.user.email,
      subject,
      html,
      attachments: [{ filename: pdfName, content: pdfBuffer, contentType: "application/pdf" }],
    });

    const log = await prisma.mailLog.create({
      data: {
        investorId: inv.id,
        toEmail: inv.user.email,
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

    // If SMTP isn't configured we bail early — no point hitting the rest
    if (!r.ok && r.error.startsWith("SMTP is not configured")) {
      // Delete the bogus log entry to avoid noise
      await prisma.mailLog.delete({ where: { id: log.id } });
      return NextResponse.json({
        error: "SMTP is not configured. Save valid credentials in Mail Settings first.",
        sent: 0,
        failed: 0,
        skipped: 0,
      }, { status: 400 });
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
