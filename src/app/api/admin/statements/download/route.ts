import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTransactionReportPDF, generateDividendReportPDF, generateTaxCertificatePDF, generatePortfolioStatementPDF } from "@/lib/pdf";
import { STAFF_ROLES } from "@/lib/roles";


function csvEscape(val: any): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(rows: Record<string, any>[], headers: string[]): string {
  const head = headers.join(",");
  const body = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")).join("\n");
  return head + "\n" + body;
}

function parseDate(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const investorId = req.nextUrl.searchParams.get("investorId");
  const type = req.nextUrl.searchParams.get("type") || "portfolio";
  const format = (req.nextUrl.searchParams.get("format") || "csv").toLowerCase();
  const from = parseDate(req.nextUrl.searchParams.get("from"));
  const to = parseDate(req.nextUrl.searchParams.get("to"));

  if (!investorId) {
    return NextResponse.json({ error: "investorId is required" }, { status: 400 });
  }

  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    select: { id: true, investorCode: true, name: true, investorType: true, tinNumber: true },
  });

  if (!investor) {
    return NextResponse.json({ error: "Investor not found" }, { status: 404 });
  }

  const dateRangeDisplay = {
    from: from ? formatDateDisplay(from) : "All time",
    to: to ? formatDateDisplay(to) : formatDateDisplay(new Date()),
  };

  // ─── PORTFOLIO ───────────────────────────────────────────────────
  if (type === "portfolio") {
    const holdings = await prisma.fundHolding.findMany({
      where: { investorId },
      include: { fund: true },
    });

    if (format === "pdf") {
      const doc = generatePortfolioStatementPDF({
        investorName: investor.name,
        investorCode: investor.investorCode,
        investorType: investor.investorType,
        generatedDate: formatDateDisplay(new Date()),
        dateRange: dateRangeDisplay,
        holdings: holdings.map((h) => ({
          fundCode: h.fund.code,
          fundName: h.fund.name,
          totalUnits: Number(h.totalCurrentUnits),
          avgCost: Number(h.avgCost),
          nav: Number(h.fund.currentNav),
          costValue: Number(h.totalCostValueCurrent),
          marketValue: Number(h.totalCurrentUnits) * Number(h.fund.currentNav),
          gain: Number(h.totalCurrentUnits) * Number(h.fund.currentNav) - Number(h.totalCostValueCurrent),
          gainPercent: Number(h.totalCostValueCurrent) > 0
            ? ((Number(h.totalCurrentUnits) * Number(h.fund.currentNav) - Number(h.totalCostValueCurrent)) / Number(h.totalCostValueCurrent)) * 100
            : 0,
        })),
        totalCost: holdings.reduce((s, h) => s + Number(h.totalCostValueCurrent), 0),
        totalMarket: holdings.reduce((s, h) => s + Number(h.totalCurrentUnits) * Number(h.fund.currentNav), 0),
        totalGain: holdings.reduce(
          (s, h) => s + Number(h.totalCurrentUnits) * Number(h.fund.currentNav) - Number(h.totalCostValueCurrent),
          0
        ),
      });
      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${investor.investorCode}_portfolio.pdf"`,
        },
      });
    }

    const rows = holdings.map((h) => ({
      fund_code: h.fund.code,
      fund_name: h.fund.name,
      units: Number(h.totalCurrentUnits).toFixed(4),
      avg_cost: Number(h.avgCost).toFixed(4),
      current_nav: Number(h.fund.currentNav).toFixed(4),
      cost_value: Number(h.totalCostValueCurrent).toFixed(2),
      market_value: (Number(h.totalCurrentUnits) * Number(h.fund.currentNav)).toFixed(2),
      gain_loss: (Number(h.totalCurrentUnits) * Number(h.fund.currentNav) - Number(h.totalCostValueCurrent)).toFixed(2),
    }));
    const csv = toCSV(rows, ["fund_code", "fund_name", "units", "avg_cost", "current_nav", "cost_value", "market_value", "gain_loss"]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${investor.investorCode}_portfolio.csv"`,
      },
    });
  }

  // ─── TRANSACTIONS ────────────────────────────────────────────────
  if (type === "transactions") {
    const where: any = { investorId };
    if (from || to) {
      where.orderDate = {};
      if (from) where.orderDate.gte = from;
      if (to) where.orderDate.lte = to;
    }

    const txs = await prisma.transaction.findMany({
      where,
      include: { fund: { select: { code: true } } },
      orderBy: { orderDate: "desc" },
    });

    if (format === "pdf") {
      const doc = generateTransactionReportPDF({
        investorName: investor.name,
        investorCode: investor.investorCode,
        investorType: investor.investorType,
        generatedDate: formatDateDisplay(new Date()),
        filters: {
          fund: "All",
          year: from || to ? `${dateRangeDisplay.from} - ${dateRangeDisplay.to}` : "All",
          type: "All",
        },
        transactions: txs.map((t) => ({
          id: t.id,
          orderDate: t.orderDate.toISOString(),
          fundCode: t.fund.code,
          direction: t.direction,
          units: Number(t.units),
          nav: Number(t.nav),
          amount: Number(t.amount),
        })),
      });
      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${investor.investorCode}_transactions.pdf"`,
        },
      });
    }

    const rows = txs.map((t) => ({
      date: t.orderDate.toISOString().split("T")[0],
      fund: t.fund.code,
      direction: t.direction,
      channel: t.channel,
      amount: Number(t.amount).toFixed(2),
      units: Number(t.units).toFixed(4),
      nav: Number(t.nav).toFixed(4),
      status: t.status,
      payment_method: t.paymentMethod || "",
      unique_code: t.uniqueCode || "",
    }));
    const csv = toCSV(rows, ["date", "fund", "direction", "channel", "amount", "units", "nav", "status", "payment_method", "unique_code"]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${investor.investorCode}_transactions.csv"`,
      },
    });
  }

  // ─── DIVIDENDS ───────────────────────────────────────────────────
  if (type === "dividends") {
    const where: any = { investorId };
    if (from || to) {
      where.paymentDate = {};
      if (from) where.paymentDate.gte = from;
      if (to) where.paymentDate.lte = to;
    }

    const divs = await prisma.dividend.findMany({
      where,
      include: { fund: { select: { code: true } } },
      orderBy: { paymentDate: "desc" },
    });

    if (format === "pdf") {
      const doc = generateDividendReportPDF({
        investorName: investor.name,
        investorCode: investor.investorCode,
        investorType: investor.investorType,
        generatedDate: formatDateDisplay(new Date()),
        dateRange: dateRangeDisplay,
        dividends: divs.map((d) => ({
          year: d.accountingYear || "—",
          fundCode: d.fund.code,
          paymentDate: d.paymentDate ? formatDateDisplay(d.paymentDate) : "—",
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
          "Content-Disposition": `attachment; filename="${investor.investorCode}_dividends.pdf"`,
        },
      });
    }

    const rows = divs.map((d) => ({
      year: d.accountingYear || "",
      fund: d.fund.code,
      payment_date: d.paymentDate ? d.paymentDate.toISOString().split("T")[0] : "",
      units: Number(d.totalUnits).toFixed(4),
      dividend_per_unit: Number(d.dividendPerUnit).toFixed(2),
      gross_dividend: Number(d.grossDividend).toFixed(2),
      tax_rate: Number(d.taxRate).toFixed(2),
      tax_amount: Number(d.taxAmount).toFixed(2),
      net_dividend: Number(d.netDividend).toFixed(2),
      option: d.dividendOption,
    }));
    const csv = toCSV(rows, ["year", "fund", "payment_date", "units", "dividend_per_unit", "gross_dividend", "tax_rate", "tax_amount", "net_dividend", "option"]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${investor.investorCode}_dividends.csv"`,
      },
    });
  }

  // ─── TAX CERTIFICATES ────────────────────────────────────────────
  if (type === "tax") {
    const where: any = { investorId };
    if (from || to) {
      where.periodEnd = {};
      if (from) where.periodEnd.gte = from;
      if (to) where.periodEnd.lte = to;
    }

    const certs = await prisma.taxCertificate.findMany({
      where,
      include: { fund: { select: { code: true, name: true } } },
      orderBy: { periodEnd: "desc" },
    });

    if (format === "pdf") {
      // For multi-cert PDF, generate one page per certificate via concat
      // Simpler approach: use the first cert or generate combined PDF.
      // Here we'll generate a PDF per cert appended.
      if (certs.length === 0) {
        return NextResponse.json({ error: "No tax certificates in range" }, { status: 404 });
      }

      // Build one PDF with one cert (first one). For multiple, user can filter down.
      // To keep it simple and useful: generate a combined PDF using jsPDF addPage.
      const jsPDFModule = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const doc = new jsPDFModule.default();
      const autoTable = autoTableModule.default;

      certs.forEach((c, idx) => {
        if (idx > 0) doc.addPage();
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFillColor(30, 58, 95);
        doc.rect(0, 0, pageWidth, 35, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Ekush Wealth Management Ltd", 14, 15);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Tax Certificate", 14, 25);
        doc.setFontSize(8);
        doc.text(
          `Period: ${c.periodStart ? formatDateDisplay(c.periodStart) : "—"} to ${c.periodEnd ? formatDateDisplay(c.periodEnd) : "—"}`,
          pageWidth - 14,
          15,
          { align: "right" }
        );
        doc.text(`Fund: ${c.fund.code}`, pageWidth - 14, 22, { align: "right" });

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Investor Details", 14, 45);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Name: ${investor.name}`, 14, 53);
        doc.text(`Code: ${investor.investorCode}`, 14, 59);
        doc.text(`Type: ${investor.investorType}`, 14, 65);
        doc.text(`TIN: ${investor.tinNumber || "N/A"}`, 14, 71);
        doc.text(`Fund: ${c.fund.name}`, 14, 77);

        const summaryData = [
          ["Beginning of Period", "", ""],
          ["  Units", Number(c.beginningUnits).toFixed(4), ""],
          ["  Cost Value", "", Number(c.beginningCostValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })],
          ["  Market Value", "", Number(c.beginningMarketValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })],
          ["", "", ""],
          ["During the Period", "", ""],
          ["  Units Added", Number(c.totalUnitsAdded).toFixed(4), ""],
          ["  Units Redeemed", Number(c.totalUnitsRedeemed).toFixed(4), ""],
          ["  Net Investment", "", Number(c.netInvestment).toLocaleString("en-IN", { minimumFractionDigits: 2 })],
          ["  Realized Gain", "", Number(c.totalRealizedGain).toLocaleString("en-IN", { minimumFractionDigits: 2 })],
          ["", "", ""],
          ["End of Period", "", ""],
          ["  Units", Number(c.endingUnits).toFixed(4), ""],
          ["  Cost Value", "", Number(c.endingCostValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })],
          ["  Market Value", "", Number(c.endingMarketValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })],
          ["  NAV", Number(c.navAtEnd).toFixed(4), ""],
          ["", "", ""],
          ["Dividend Summary", "", ""],
          ["  Gross Dividend", "", Number(c.totalGrossDividend).toLocaleString("en-IN", { minimumFractionDigits: 2 })],
          ["  Tax Deducted at Source", "", Number(c.totalTax).toLocaleString("en-IN", { minimumFractionDigits: 2 })],
          ["  Net Dividend", "", Number(c.totalNetDividend).toLocaleString("en-IN", { minimumFractionDigits: 2 })],
        ];

        autoTable(doc, {
          startY: 85,
          head: [["Particulars", "Units", "Amount (BDT)"]],
          body: summaryData,
          theme: "plain",
          headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 90 },
            1: { halign: "right", cellWidth: 40 },
            2: { halign: "right", cellWidth: 50 },
          },
          didParseCell: (data: any) => {
            const text = String(data.cell.raw);
            if (
              text === "Beginning of Period" ||
              text === "During the Period" ||
              text === "End of Period" ||
              text === "Dividend Summary"
            ) {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.fillColor = [240, 244, 248];
            }
          },
        });
      });

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${investor.investorCode}_tax_certificates.pdf"`,
        },
      });
    }

    const rows = certs.map((c) => ({
      period_start: c.periodStart ? c.periodStart.toISOString().split("T")[0] : "",
      period_end: c.periodEnd ? c.periodEnd.toISOString().split("T")[0] : "",
      fund: c.fund.code,
      net_investment: Number(c.netInvestment).toFixed(2),
      realized_gain: Number(c.totalRealizedGain).toFixed(2),
      gross_dividend: Number(c.totalGrossDividend).toFixed(2),
      tax: Number(c.totalTax).toFixed(2),
      net_dividend: Number(c.totalNetDividend).toFixed(2),
    }));
    const csv = toCSV(rows, ["period_start", "period_end", "fund", "net_investment", "realized_gain", "gross_dividend", "tax", "net_dividend"]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${investor.investorCode}_tax_certificates.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

// Silence unused import warning for generateTaxCertificatePDF (kept for reuse)
void generateTaxCertificatePDF;
