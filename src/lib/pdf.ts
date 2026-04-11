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
