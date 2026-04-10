import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const FUND_BANK_DETAILS: Record<string, { accountName: string; accountNo: string; bankName: string; branchName: string; routingNo: string }> = {
  EFUF: {
    accountName: "EKUSH FIRST UNIT FUND",
    accountNo: "1513205101231001",
    bankName: "BRAC BANK LIMITED",
    branchName: "R K MISSION ROAD",
    routingNo: "060272531",
  },
  EGF: {
    accountName: "EKUSH GROWTH FUND",
    accountNo: "1513205101212001",
    bankName: "BRAC BANK LIMITED",
    branchName: "R K MISSION ROAD",
    routingNo: "060272531",
  },
  ESRF: {
    accountName: "EKUSH STABLE RETURN FUND",
    accountNo: "2055604070001",
    bankName: "BRAC BANK LIMITED",
    branchName: "GRAPHICS BUILDING",
    routingNo: "060272531",
  },
};

const FUND_FULL_NAMES: Record<string, string> = {
  EFUF: "EKUSH FIRST UNIT FUND",
  EGF: "EKUSH GROWTH FUND",
  ESRF: "EKUSH STABLE RETURN FUND",
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;
  if (!investorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    include: {
      bankAccounts: { where: { isPrimary: true }, take: 1 },
    },
  });

  if (!investor) return NextResponse.json({ error: "Investor not found" }, { status: 404 });

  const fundCode = req.nextUrl.searchParams.get("fundCode") || "ESRF";
  const amount = req.nextUrl.searchParams.get("amount") || "";
  const debitDay = req.nextUrl.searchParams.get("debitDay") || "5";
  const tenure = req.nextUrl.searchParams.get("tenure") || "5";
  const frequency = req.nextUrl.searchParams.get("frequency") || "MONTHLY";

  const fundFullName = FUND_FULL_NAMES[fundCode] || fundCode;
  const fundBank = FUND_BANK_DETAILS[fundCode] || FUND_BANK_DETAILS.ESRF;
  const investorBank = investor.bankAccounts[0];

  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1); // next month 1st
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + parseInt(tenure));

  const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const orange = [242, 112, 35] as const;
  const navy = [30, 58, 95] as const;

  // ─── Header ────────────────────────────────────────────────────
  doc.setFillColor(...orange);
  doc.rect(0, 0, pw, 4, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...navy);
  doc.text("Systematic Investment Plan", pw / 2, 14, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Asset Manager: Ekush Wealth Management Limited", pw / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text(`Fund: ${fundFullName}`, pw / 2, 27, { align: "center" });

  // Title
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("AUTO DEBIT INSTRUCTION FORM", pw / 2, 38, { align: "center" });

  // Date of Application
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(`Date of Application: ${fmtDate(today)}`, 14, 48);

  // ─── Investor's Information ────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text("INVESTOR'S INFORMATION", 14, 58);

  autoTable(doc, {
    startY: 62,
    body: [
      ["Name of the Investor", investor.name?.toUpperCase() || "", "Investor Code", investor.investorCode],
    ],
    theme: "grid",
    bodyStyles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45, textColor: [80, 80, 80] },
      1: { cellWidth: 65 },
      2: { fontStyle: "bold", cellWidth: 35, textColor: [80, 80, 80] },
      3: { cellWidth: pw - 145 - 28 },
    },
    margin: { left: 14, right: 14 },
  });

  // ─── DDI Information ───────────────────────────────────────────
  let y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text("DIRECT DEBIT INSTRUCTION (DDI) INFORMATION", 14, y);

  autoTable(doc, {
    startY: y + 4,
    body: [
      ["DDI START DATE", fmtDate(startDate)],
      ["DDI END DATE", fmtDate(endDate)],
      ["SIP TENURE", `${tenure} Year${parseInt(tenure) > 1 ? "s" : ""}`],
      ["DDI PULL DATE OF THE MONTH", `${debitDay}th day of each month`],
      ["MONTHLY DDI AMOUNT (BDT)", `BDT ${Number(amount).toLocaleString("en-IN")}`],
    ],
    theme: "grid",
    bodyStyles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 65, textColor: [80, 80, 80] },
      1: { cellWidth: pw - 65 - 28 },
    },
    margin: { left: 14, right: 14 },
  });

  // ─── Investor Bank Details ─────────────────────────────────────
  y = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: y,
    body: [
      ["BANK ACCOUNT NAME", investorBank ? investor.name?.toUpperCase() || "" : ""],
      ["BANK ACCOUNT NUMBER", investorBank?.accountNumber || ""],
      ["BANK NAME", investorBank?.bankName?.toUpperCase() || ""],
      ["BRANCH NAME", investorBank?.branchName?.toUpperCase() || ""],
      ["ROUTING NUMBER", investorBank?.routingNumber || ""],
    ],
    theme: "grid",
    bodyStyles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 65, textColor: [80, 80, 80] },
      1: { cellWidth: pw - 65 - 28 },
    },
    margin: { left: 14, right: 14 },
  });

  // ─── Fund's (Collection) Bank Details ──────────────────────────
  y = (doc as any).lastAutoTable.finalY + 4;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text("FUND'S (COLLECTION) BANK DETAILS", 14, y);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(128, 128, 128);
  doc.text("FILLED BY OFFICE", pw - 14, y, { align: "right" });

  autoTable(doc, {
    startY: y + 4,
    body: [
      ["BANK ACCOUNT NAME", fundBank.accountName],
      ["BANK ACCOUNT NUMBER", fundBank.accountNo],
      ["BANK NAME", fundBank.bankName],
      ["BRANCH NAME", fundBank.branchName],
      ["ROUTING NUMBER", fundBank.routingNo],
    ],
    theme: "grid",
    bodyStyles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 65, textColor: [80, 80, 80] },
      1: { cellWidth: pw - 65 - 28 },
    },
    margin: { left: 14, right: 14 },
  });

  // ─── Investor Acknowledgement ──────────────────────────────────
  y = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text("INVESTOR ACKNOWLEDGEMENT", 14, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);

  const ackText1 = `I/ We, maintaining an account with the above-mentioned bank, hereby would like to inform you that I/we have authorized ${fundFullName} to debit my/our account through online fund transfer processes by an amount not exceeding the above-mentioned amount. The auto debit instruction will be initiated by the designated Bank at the instruction of ${fundFullName} managed by Ekush Wealth Management Limited. The account shall be debited on a monthly basis and the instruction shall be valid from the debit start date to debit end date as mentioned above. Exit Load is 2% of the 'Investors Sale Price' if surrendered before 12 months of the DDI Start Date and 1% of the 'Investors Sale Price' if surrendered before 36 months of the DDI Start Date. This is for your kind information and support in this regard.`;

  const ackText2 = "I have read and understood the terms and conditions of payment through the Auto-debit payment process, which may be altered, modified, and replaced from time to time by Ekush Wealth Management Limited as per regulatory requirements.";

  const lines1 = doc.splitTextToSize(ackText1, pw - 28);
  doc.text(lines1, 14, y + 6);

  const afterAck1 = y + 6 + lines1.length * 3.5 + 3;
  const lines2 = doc.splitTextToSize(ackText2, pw - 28);
  doc.text(lines2, 14, afterAck1);

  // ─── Signatures ────────────────────────────────────────────────
  const sigY = afterAck1 + lines2.length * 3.5 + 12;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text("SIGNATURES AS PER THE BANK ACCOUNT", 14, sigY);

  doc.setDrawColor(0, 0, 0);
  doc.line(14, sigY + 20, 80, sigY + 20);
  doc.line(pw - 80, sigY + 20, pw - 14, sigY + 20);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("Principal Applicant", 14, sigY + 26);
  doc.text("Joint Applicant (If Any)", pw - 80, sigY + 26);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(
    "Ekush Wealth Management Limited | 9G, Motijheel C/A, 2nd Floor, Dhaka-1000 | info@ekushwml.com | www.ekushwml.com",
    pw / 2,
    290,
    { align: "center" }
  );

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="DDI_Form_${investor.investorCode}_${fundCode}.pdf"`,
    },
  });
}
