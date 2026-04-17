import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PortfolioStatementData {
  investorName: string;
  investorCode: string;
  investorType: string;
  generatedDate: string;
  dateRange: { from: string; to: string };
  holdings: {
    fundCode: string;
    fundName: string;
    totalUnits: number;
    avgCost: number;
    nav: number;
    costValue: number;
    marketValue: number;
    gain: number;
    gainPercent: number;
  }[];
  totalCost: number;
  totalMarket: number;
  totalGain: number;
}

export function generatePortfolioStatementPDF(data: PortfolioStatementData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(30, 58, 95); // #1e3a5f
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Ekush Wealth Management Ltd", 14, 15);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Portfolio Statement", 14, 25);

  doc.setFontSize(8);
  doc.text("Licensed by BSEC", pageWidth - 14, 15, { align: "right" });
  doc.text(`Generated: ${data.generatedDate}`, pageWidth - 14, 22, { align: "right" });

  // Investor Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Investor Details", 14, 45);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Name: ${data.investorName}`, 14, 53);
  doc.text(`Code: ${data.investorCode}`, 14, 59);
  doc.text(`Type: ${data.investorType}`, 14, 65);
  doc.text(`Period: ${data.dateRange.from} to ${data.dateRange.to}`, 14, 71);

  // Holdings Table
  const tableData = data.holdings.map((h) => [
    h.fundCode,
    h.totalUnits.toFixed(4),
    h.avgCost.toFixed(4),
    h.nav.toFixed(4),
    formatAmount(h.costValue),
    formatAmount(h.marketValue),
    formatAmount(h.gain),
    `${h.gainPercent >= 0 ? "+" : ""}${h.gainPercent.toFixed(2)}%`,
  ]);

  // Add totals row
  tableData.push([
    "TOTAL",
    "",
    "",
    "",
    formatAmount(data.totalCost),
    formatAmount(data.totalMarket),
    formatAmount(data.totalGain),
    data.totalCost > 0
      ? `${((data.totalGain / data.totalCost) * 100).toFixed(2)}%`
      : "0.00%",
  ]);

  autoTable(doc, {
    startY: 78,
    head: [["Fund", "Units", "Avg Cost", "NAV", "Cost Value (BDT)", "Market Value (BDT)", "Gain/Loss (BDT)", "Return"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { fontStyle: "bold" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
    didParseCell: (data: any) => {
      // Bold the totals row
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 235, 242];
      }
    },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable?.finalY || 150;
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text("This is a computer-generated statement. NAV values are as of the statement date.", 14, finalY + 15);
  doc.text("Past performance does not guarantee future results. Investments are subject to market risk.", 14, finalY + 20);
  doc.text("Ekush Wealth Management Ltd | www.ekushwml.com", 14, finalY + 28);

  return doc;
}

interface TaxCertData {
  investorName: string;
  investorCode: string;
  investorType: string;
  tinNumber: string;
  fundCode: string;
  fundName: string;
  periodStart: string;
  periodEnd: string;
  beginningUnits: number;
  beginningCostValue: number;
  beginningMarketValue: number;
  endingUnits: number;
  endingCostValue: number;
  endingMarketValue: number;
  totalUnitsAdded: number;
  totalUnitsRedeemed: number;
  netInvestment: number;
  totalRealizedGain: number;
  totalGrossDividend: number;
  totalTax: number;
  totalNetDividend: number;
  navAtEnd: number;
}

export function generateTaxCertificatePDF(data: TaxCertData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
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
  doc.text(`Period: ${data.periodStart} to ${data.periodEnd}`, pageWidth - 14, 15, { align: "right" });
  doc.text(`Fund: ${data.fundCode}`, pageWidth - 14, 22, { align: "right" });

  // Investor Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Investor Details", 14, 45);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Name: ${data.investorName}`, 14, 53);
  doc.text(`Code: ${data.investorCode}`, 14, 59);
  doc.text(`Type: ${data.investorType}`, 14, 65);
  doc.text(`TIN: ${data.tinNumber || "N/A"}`, 14, 71);
  doc.text(`Fund: ${data.fundName}`, 14, 77);

  // Investment Summary
  const summaryData = [
    ["Beginning of Period", "", ""],
    ["  Units", data.beginningUnits.toFixed(4), ""],
    ["  Cost Value", "", formatAmount(data.beginningCostValue)],
    ["  Market Value", "", formatAmount(data.beginningMarketValue)],
    ["", "", ""],
    ["During the Period", "", ""],
    ["  Units Added", data.totalUnitsAdded.toFixed(4), ""],
    ["  Units Redeemed", data.totalUnitsRedeemed.toFixed(4), ""],
    ["  Net Investment", "", formatAmount(data.netInvestment)],
    ["  Realized Gain", "", formatAmount(data.totalRealizedGain)],
    ["", "", ""],
    ["End of Period", "", ""],
    ["  Units", data.endingUnits.toFixed(4), ""],
    ["  Cost Value", "", formatAmount(data.endingCostValue)],
    ["  Market Value", "", formatAmount(data.endingMarketValue)],
    ["  NAV", data.navAtEnd.toFixed(4), ""],
    ["", "", ""],
    ["Dividend Summary", "", ""],
    ["  Gross Dividend", "", formatAmount(data.totalGrossDividend)],
    ["  Tax Deducted at Source", "", formatAmount(data.totalTax)],
    ["  Net Dividend", "", formatAmount(data.totalNetDividend)],
  ];

  autoTable(doc, {
    startY: 85,
    head: [["Particulars", "Units", "Amount (BDT)"]],
    body: summaryData,
    theme: "plain",
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
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

  // Footer
  const finalY = (doc as any).lastAutoTable?.finalY || 250;
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text("This certificate is issued for income tax purposes as per NBR requirements.", 14, finalY + 15);
  doc.text("Ekush Wealth Management Ltd | Licensed by BSEC | www.ekushwml.com", 14, finalY + 20);

  return doc;
}

interface TransactionReportData {
  investorName: string;
  investorCode: string;
  investorType: string;
  generatedDate: string;
  filters: { fund: string; year: string; type: string };
  transactions: {
    id: string;
    orderDate: string;
    fundCode: string;
    direction: string;
    units: number;
    nav: number;
    amount: number;
  }[];
}

export function generateTransactionReportPDF(data: TransactionReportData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(242, 112, 35); // ekush orange
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Ekush Wealth Management Ltd", 14, 15);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Transaction Report", 14, 25);

  doc.setFontSize(8);
  doc.text("Licensed by BSEC", pageWidth - 14, 15, { align: "right" });
  doc.text(`Generated: ${data.generatedDate}`, pageWidth - 14, 22, { align: "right" });

  // Investor Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Investor Details", 14, 45);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Name: ${data.investorName}`, 14, 53);
  doc.text(`Code: ${data.investorCode}`, 14, 59);
  doc.text(`Type: ${data.investorType}`, 14, 65);

  // Filter chips
  doc.setFont("helvetica", "bold");
  doc.text("Filters", pageWidth - 90, 45);
  doc.setFont("helvetica", "normal");
  doc.text(`Fund: ${data.filters.fund}`, pageWidth - 90, 53);
  doc.text(`Year: ${data.filters.year}`, pageWidth - 90, 59);
  doc.text(`Type: ${data.filters.type}`, pageWidth - 90, 65);

  // Totals
  const totalBuy = data.transactions
    .filter((t) => t.direction === "BUY")
    .reduce((s, t) => s + t.amount, 0);
  const totalSell = data.transactions
    .filter((t) => t.direction === "SELL")
    .reduce((s, t) => s + t.amount, 0);

  // Transaction Table
  const tableData = data.transactions.map((tx, idx) => [
    String(idx + 1),
    new Date(tx.orderDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    tx.fundCode,
    tx.direction === "BUY" ? "Buy" : "Sell",
    tx.units.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
    tx.nav.toFixed(2),
    formatAmount(tx.amount),
  ]);

  // Add totals row
  if (data.transactions.length > 0) {
    tableData.push([
      "",
      "",
      "",
      "TOTAL BUY",
      "",
      "",
      formatAmount(totalBuy),
    ]);
    tableData.push([
      "",
      "",
      "",
      "TOTAL SELL",
      "",
      "",
      formatAmount(totalSell),
    ]);
  }

  autoTable(doc, {
    startY: 75,
    head: [["#", "Date", "Fund", "Type", "Units", "NAV", "Amount (BDT)"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [242, 112, 35],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { cellWidth: 28 },
      2: { cellWidth: 24 },
      3: { cellWidth: 24 },
      4: { halign: "right", cellWidth: 28 },
      5: { halign: "right", cellWidth: 22 },
      6: { halign: "right" },
    },
    didParseCell: (cellData: any) => {
      const lastIdx = tableData.length - 1;
      const secondLastIdx = tableData.length - 2;
      if (
        data.transactions.length > 0 &&
        (cellData.row.index === lastIdx || cellData.row.index === secondLastIdx)
      ) {
        cellData.cell.styles.fontStyle = "bold";
        cellData.cell.styles.fillColor = [255, 240, 230];
      }
    },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable?.finalY || 150;
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Total ${data.transactions.length} transaction(s) listed.`,
    14,
    finalY + 10
  );
  doc.text(
    "This is a computer-generated report. For any discrepancy please contact support.",
    14,
    finalY + 16
  );
  doc.text("Ekush Wealth Management Ltd | www.ekushwml.com", 14, finalY + 22);

  return doc;
}

interface DividendReportData {
  investorName: string;
  investorCode: string;
  investorType: string;
  generatedDate: string;
  dateRange: { from: string; to: string };
  dividends: {
    year: string;
    fundCode: string;
    paymentDate: string;
    totalUnits: number;
    dividendPerUnit: number;
    grossDividend: number;
    taxAmount: number;
    netDividend: number;
    option: string;
  }[];
}

export function generateDividendReportPDF(data: DividendReportData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Ekush Wealth Management Ltd", 14, 15);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Dividend Report", 14, 25);

  doc.setFontSize(8);
  doc.text("Licensed by BSEC", pageWidth - 14, 15, { align: "right" });
  doc.text(`Generated: ${data.generatedDate}`, pageWidth - 14, 22, { align: "right" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Investor Details", 14, 45);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Name: ${data.investorName}`, 14, 53);
  doc.text(`Code: ${data.investorCode}`, 14, 59);
  doc.text(`Type: ${data.investorType}`, 14, 65);
  doc.text(`Period: ${data.dateRange.from} to ${data.dateRange.to}`, 14, 71);

  const tableData = data.dividends.map((d) => [
    d.year,
    d.fundCode,
    d.paymentDate,
    d.totalUnits.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
    d.dividendPerUnit.toFixed(2),
    formatAmount(d.grossDividend),
    formatAmount(d.taxAmount),
    formatAmount(d.netDividend),
    d.option,
  ]);

  const totalGross = data.dividends.reduce((s, d) => s + d.grossDividend, 0);
  const totalTax = data.dividends.reduce((s, d) => s + d.taxAmount, 0);
  const totalNet = data.dividends.reduce((s, d) => s + d.netDividend, 0);

  if (data.dividends.length > 0) {
    tableData.push([
      "",
      "",
      "",
      "",
      "TOTAL",
      formatAmount(totalGross),
      formatAmount(totalTax),
      formatAmount(totalNet),
      "",
    ]);
  }

  autoTable(doc, {
    startY: 78,
    head: [["Year", "Fund", "Payment Date", "Units", "DPU", "Gross (BDT)", "Tax (BDT)", "Net (BDT)", "Option"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
    didParseCell: (cellData: any) => {
      if (data.dividends.length > 0 && cellData.row.index === tableData.length - 1) {
        cellData.cell.styles.fontStyle = "bold";
        cellData.cell.styles.fillColor = [230, 235, 242];
      }
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 150;
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(`Total ${data.dividends.length} dividend entry(ies).`, 14, finalY + 10);
  doc.text("Ekush Wealth Management Ltd | www.ekushwml.com", 14, finalY + 16);

  return doc;
}

function formatAmount(amount: number): string {
  if (amount === 0) return "-";
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `(${formatted})` : formatted;
}

// ─────────────────────── Investment Update ───────────────────────
// Mirrors the HTML layout at /forms/investment-update — the same page
// investors see when they click "Investment Update" on the statements
// screen. Designed for email attachments (mailing center).

export interface InvestmentUpdateData {
  investorName: string;
  investorCode: string;
  fundName: string;
  fundCode: "EFUF" | "EGF" | "ESRF" | string;
  totalUnits: number;
  avgCost: number;
  costValue: number;
  marketValue: number;
  realizedGain: number;
  dividendTotal: number;
  nav: number;
  entryLoad: number; // fractional, e.g. 0.02
  exitLoad: number;
  dateStr: string; // "April 17, 2026"
  bannerPngDataUrl?: string; // data:image/png;base64,...
}

const FUND_REG_INFO: Record<string, string> = {
  EFUF: "BSEC/Mutual Fund/2019/106",
  EGF: "BSEC/Mutual Fund/2022/129",
  ESRF: "BSEC/Mutual Fund/2022/130",
};

export function generateInvestmentUpdatePDF(data: InvestmentUpdateData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297

  // ── Banner (top) — embed the same banner_for_portfolio.png used on the HTML page
  let bannerBottomY = 8;
  if (data.bannerPngDataUrl) {
    try {
      // The source banner is ~1584x331 ≈ 4.79 aspect. Fit to full width.
      const bannerHeight = pageWidth / 4.79;
      doc.addImage(data.bannerPngDataUrl, "PNG", 0, 0, pageWidth, bannerHeight);
      bannerBottomY = bannerHeight;
    } catch {
      bannerBottomY = 8;
    }
  }

  const leftX = 22;
  const rightX = pageWidth - 22;
  let y = bannerBottomY + 8;

  // ── Date
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(data.dateStr, leftX, y);
  y += 10;

  // ── Investor
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(data.investorName, leftX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Investor Code: ${data.investorCode}`, leftX, y);
  y += 8;

  // ── Fund info box (grey bg, light border)
  const boxX = leftX;
  const boxW = rightX - leftX;
  const boxY = y;
  const boxH = 38;
  doc.setFillColor(240, 240, 240);
  doc.setDrawColor(204, 204, 204);
  doc.rect(boxX, boxY, boxW, boxH, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(0, 0, 0);
  doc.text(data.fundName.toUpperCase(), pageWidth / 2, boxY + 6, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  doc.setTextColor(68, 68, 68);
  doc.text(
    "Registered under the Bangladesh Securities & Exchange Commission (Mutual Fund) Rules, 2001.",
    pageWidth / 2,
    boxY + 11,
    { align: "center" },
  );

  const regNo = FUND_REG_INFO[data.fundCode] || FUND_REG_INFO.EFUF;
  const rows: Array<[string, string]> = [
    ["Registration No", regNo],
    ["Sponsor", "Ekush Wealth Management Limited"],
    ["Asset Manager", "Ekush Wealth Management Limited"],
    ["Trustee", "Sandhani Life Insurance Co. Ltd"],
    ["Custodian", "BRAC Bank Limited"],
  ];
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  let ry = boxY + 17;
  const labelX = pageWidth / 2 - 35;
  const colonX = labelX + 40;
  const valueX = colonX + 3;
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(label, labelX, ry);
    doc.setFont("helvetica", "normal");
    doc.text(":", colonX, ry);
    doc.text(value, valueX, ry);
    ry += 4;
  }

  y = boxY + boxH + 5;

  // ── Units / Avg Cost row (double-border feel: thick top, thin bottom)
  const colW = boxW / 4;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(leftX, y, rightX, y);
  doc.setLineWidth(0.2);
  doc.line(leftX, y + 8, rightX, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Number of Units", leftX + 2, y + 5);
  doc.text("Average Cost/Unit", leftX + 2 * colW + 2, y + 5);

  doc.setFont("helvetica", "normal");
  doc.text(
    data.totalUnits.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
    leftX + 2 * colW - 2,
    y + 5,
    { align: "right" },
  );
  doc.text(data.avgCost.toFixed(3), rightX - 2, y + 5, { align: "right" });
  y += 12;

  // ── Investment Results header (double underline)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Investment Results:", leftX, y);
  doc.setLineWidth(0.5);
  doc.line(leftX, y + 1.2, rightX, y + 1.2);
  doc.line(leftX, y + 2.0, rightX, y + 2.0);
  y += 6;

  // ── 2x3 results grid (each row has 4 cells: label, value, label, value)
  const halfW = boxW / 2;
  const valueRightL = leftX + halfW - 4;
  const labelRightL = leftX + halfW * 0.55; // unused; we'll just place values at fixed offsets
  void labelRightL;
  const rowHeight = 6.5;
  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const resultRows: Array<[string, number, string, number, boolean]> = [
    ["Cost Value of Investment", data.costValue, "Capital Gain on Unit Sold", data.realizedGain, false],
    ["Wealth increased by", data.marketValue - data.costValue, "Dividend Received", data.dividendTotal, false],
    [
      "Current Value of Investment",
      data.marketValue,
      "Total Value Creation",
      (data.marketValue - data.costValue) + data.realizedGain + data.dividendTotal,
      true, // last row: italicize right side + grey bg
    ],
  ];

  doc.setLineWidth(0.2);
  for (const [lLabel, lVal, rLabel, rVal, totalsRow] of resultRows) {
    if (totalsRow) {
      doc.setFillColor(240, 240, 240);
      doc.rect(leftX + halfW, y - rowHeight + 1.5, halfW, rowHeight, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(lLabel, leftX, y);
    doc.setFont("helvetica", "bold");
    doc.text(fmt(lVal), valueRightL, y, { align: "right" });

    doc.setFont(totalsRow ? "helvetica" : "helvetica", totalsRow ? "italic" : "normal");
    doc.text(rLabel, leftX + halfW + 2, y);
    doc.setFont("helvetica", totalsRow ? "bolditalic" : "bold");
    doc.text(fmt(rVal), rightX, y, { align: "right" });
    doc.setFont("helvetica", "normal");

    doc.line(leftX, y + 1.2, rightX, y + 1.2);
    y += rowHeight;
  }

  y += 5;

  // ── NAV paragraph
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const navPara = doc.splitTextToSize(
    "The current Net Asset Value (NAV) per unit, together with the applicable buy and sale prices of the fund, is presented below:",
    boxW,
  );
  doc.text(navPara, leftX, y);
  y += navPara.length * 4.8 + 4;

  // ── NAV table (centered, 80% width)
  const navTableW = boxW * 0.8;
  const navTableX = (pageWidth - navTableW) / 2;
  const navColW = navTableW / 3;

  doc.setFillColor(240, 240, 240);
  doc.rect(navTableX, y, navTableW, 9, "F");
  doc.setLineWidth(0.6);
  doc.line(navTableX, y, navTableX + navTableW, y);
  doc.line(navTableX, y + 9, navTableX + navTableW, y + 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("NAV", navTableX + navColW / 2, y + 6, { align: "center" });
  doc.text("Buy Price", navTableX + navColW + navColW / 2, y + 6, { align: "center" });
  doc.text("Sale Price", navTableX + 2 * navColW + navColW / 2, y + 6, { align: "center" });
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const buyPrice = data.nav * (1 + (data.entryLoad || 0));
  const sellPrice = data.nav * (1 - (data.exitLoad || 0));
  doc.text(data.nav.toFixed(3), navTableX + navColW / 2, y + 6, { align: "center" });
  doc.text(buyPrice.toFixed(3), navTableX + navColW + navColW / 2, y + 6, { align: "center" });
  doc.text(sellPrice.toFixed(3), navTableX + 2 * navColW + navColW / 2, y + 6, { align: "center" });
  doc.setLineWidth(0.6);
  doc.line(navTableX, y + 9, navTableX + navTableW, y + 9);

  // ── Orange footer strip
  const footerH = 10;
  const footerY = pageHeight - footerH;
  doc.setFillColor(242, 112, 35);
  doc.rect(0, footerY, pageWidth, footerH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("+8801713-086101", 6, footerY + 4.5);
  doc.text("info@ekushwml.com", 44, footerY + 4.5);
  doc.text(
    "Apt-A3, House: 17, Road: 01, Block: A, Niketon, Gulshan 01, Dhaka-1212",
    pageWidth / 2,
    footerY + 4.5,
    { align: "center" },
  );
  doc.text("www.ekushwml.com", pageWidth - 6, footerY + 4.5, { align: "right" });

  return doc;
}
