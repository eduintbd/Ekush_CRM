import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { STAFF_ROLES } from "@/lib/roles";

// Fund collection bank details. Mirrors the map in src/app/api/forms/ddi/route.ts
// — duplicated intentionally for now; a later refactor can centralize these
// into a Fund.collectionBankAccount relation.
const FUND_BANK_DETAILS: Record<
  string,
  { accountName: string; accountNo: string; bankName: string; branchName: string; routingNo: string }
> = {
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
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionInvestorId = (session.user as any)?.investorId as string | undefined;
  const role = (session.user as any)?.role as string | undefined;
  const isAdmin = role ? STAFF_ROLES.includes(role) : false;

  const fundCode = req.nextUrl.searchParams.get("fundCode") || "";
  const amountParam = req.nextUrl.searchParams.get("amount") || "0";
  const ddiId = req.nextUrl.searchParams.get("ddiId");

  // Resolve which investor's data to render.
  let investorId: string | undefined;
  let amount = Number(amountParam);
  let signatureUrl: string | null = null;
  let applicationDate = new Date();
  let resolvedFundCode = fundCode;

  if (ddiId) {
    const ddi = await prisma.ddiInstruction.findUnique({
      where: { id: ddiId },
      include: { fund: true },
    });
    if (!ddi) return NextResponse.json({ error: "DDI not found" }, { status: 404 });
    // Investors can only see their own DDI; admins can see any.
    if (!isAdmin && ddi.investorId !== sessionInvestorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    investorId = ddi.investorId;
    amount = ddi.amount;
    signatureUrl = ddi.signatureUrl;
    applicationDate = ddi.applicationDate;
    resolvedFundCode = ddi.fund.code;
  } else {
    // Preview mode — only investors (for their own pending form). Admins always
    // come through with a ddiId since they view submitted DDIs.
    if (!sessionInvestorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    investorId = sessionInvestorId;
  }

  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    include: { bankAccounts: { where: { isPrimary: true }, take: 1 } },
  });
  if (!investor) return NextResponse.json({ error: "Investor not found" }, { status: 404 });

  // For preview (no ddiId), fall back to the investor's current signature.
  if (!ddiId) signatureUrl = investor.signatureUrl;

  if (!resolvedFundCode || !FUND_FULL_NAMES[resolvedFundCode]) {
    return NextResponse.json({ error: "Invalid fund code" }, { status: 400 });
  }
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Amount required" }, { status: 400 });
  }

  const fundFullName = FUND_FULL_NAMES[resolvedFundCode];
  const fundBank = FUND_BANK_DETAILS[resolvedFundCode];
  const investorBank = investor.bankAccounts[0];
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const orange = [242, 112, 35] as const;
  const navy = [30, 58, 95] as const;

  // Top bar
  doc.setFillColor(...orange);
  doc.rect(0, 0, pw, 4, "F");

  // Heading
  doc.setFontSize(12);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...navy);
  doc.text("One-time Purchase", pw / 2, 14, { align: "center" });

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
  doc.text(`Date of Application: ${fmtDate(applicationDate)}`, 14, 48);

  // Investor info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text("INVESTOR'S INFORMATION", 14, 58);

  autoTable(doc, {
    startY: 62,
    body: [
      [
        "Name of the Investor",
        investor.name?.toUpperCase() || "",
        "Investor Code",
        investor.investorCode,
      ],
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

  // DDI (one-time) info
  let y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text("DIRECT DEBIT INSTRUCTION (DDI) INFORMATION", 14, y);

  autoTable(doc, {
    startY: y + 4,
    body: [
      ["PURCHASE TYPE", "ONE-TIME (NON-RECURRING)"],
      ["DEBIT DATE", fmtDate(applicationDate)],
      ["DEBIT AMOUNT (BDT)", `BDT ${Number(amount).toLocaleString("en-IN")}`],
    ],
    theme: "grid",
    bodyStyles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 65, textColor: [80, 80, 80] },
      1: { cellWidth: pw - 65 - 28 },
    },
    margin: { left: 14, right: 14 },
  });

  // Investor bank details
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

  // Fund's collection bank
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

  // Acknowledgement
  y = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text("INVESTOR ACKNOWLEDGEMENT", 14, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);

  const ack = `I/We, maintaining an account with the above-mentioned bank, hereby authorize ${fundFullName} to debit my/our account through online fund transfer processes for a one-time amount of BDT ${Number(amount).toLocaleString("en-IN")} to subscribe to units of ${fundFullName}. The auto debit instruction will be initiated by the designated Bank at the instruction of ${fundFullName} managed by Ekush Wealth Management Limited.`;

  const ack2 =
    "I have read and understood the terms and conditions of payment through the Auto-debit payment process, which may be altered, modified, and replaced from time to time by Ekush Wealth Management Limited as per regulatory requirements.";

  const lines1 = doc.splitTextToSize(ack, pw - 28);
  doc.text(lines1, 14, y + 6);
  const afterAck1 = y + 6 + lines1.length * 3.5 + 3;
  const lines2 = doc.splitTextToSize(ack2, pw - 28);
  doc.text(lines2, 14, afterAck1);

  // Signatures
  const sigY = afterAck1 + lines2.length * 3.5 + 12;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text("SIGNATURES AS PER THE BANK ACCOUNT", 14, sigY);

  // Try to embed the uploaded signature image if we have a URL. Fall back to a
  // note indicating the wet signature on file is used.
  if (signatureUrl) {
    try {
      const res = await fetch(signatureUrl);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") || "image/png";
        const base64 = buf.toString("base64");
        const fmt = contentType.includes("jpeg") || contentType.includes("jpg") ? "JPEG" : "PNG";
        doc.addImage(`data:${contentType};base64,${base64}`, fmt, 14, sigY + 4, 50, 16);
      }
    } catch {
      // Ignore embed failures — line + label still print.
    }
  } else {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text("Wet signature on file at Ekush", 14, sigY + 12);
    doc.setTextColor(0, 0, 0);
  }

  doc.setDrawColor(0, 0, 0);
  doc.line(14, sigY + 22, 80, sigY + 22);
  doc.line(pw - 80, sigY + 22, pw - 14, sigY + 22);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Principal Applicant", 14, sigY + 28);
  doc.text("Joint Applicant (If Any)", pw - 80, sigY + 28);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(
    "Ekush Wealth Management Limited | 9G, Motijheel C/A, 2nd Floor, Dhaka-1000 | info@ekushwml.com | www.ekushwml.com",
    pw / 2,
    290,
    { align: "center" },
  );

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Buy_DDI_${investor.investorCode}_${resolvedFundCode}.pdf"`,
    },
  });
}
