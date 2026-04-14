import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;
  if (!investorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    include: {
      user: { select: { email: true, phone: true } },
      bankAccounts: { where: { isPrimary: true }, take: 1 },
    },
  });

  if (!investor) return NextResponse.json({ error: "Investor not found" }, { status: 404 });

  const fundName = req.nextUrl.searchParams.get("fundName") || "";
  const amount = req.nextUrl.searchParams.get("amount") || "";
  const units = req.nextUrl.searchParams.get("units") || "";
  const nav = req.nextUrl.searchParams.get("nav") || "";
  const paymentMethod = req.nextUrl.searchParams.get("payment") || "Bank Transfer";

  const bank = investor.bankAccounts[0];
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  const dateDigits = today.toISOString().slice(0, 10).replace(/-/g, ""); // 20260416

  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const leftM = 14;

  // ─── Utility functions ──────────────────────────────────────────
  function numberToWords(n: number): string {
    if (n === 0) return "Zero";
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const scales = ["", "Thousand", "Lakh", "Crore"];

    const parts: string[] = [];
    const intPart = Math.floor(Math.abs(n));

    if (intPart === 0) return "Zero";

    // South Asian grouping: last 3 digits, then groups of 2
    let remaining = intPart;
    const groups: number[] = [];
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
    while (remaining > 0) {
      groups.push(remaining % 100);
      remaining = Math.floor(remaining / 100);
    }

    for (let i = groups.length - 1; i >= 0; i--) {
      const g = groups[i];
      if (g === 0) continue;
      let part = "";
      if (g >= 100) {
        part += ones[Math.floor(g / 100)] + " Hundred ";
        const rem = g % 100;
        if (rem >= 20) {
          part += tens[Math.floor(rem / 10)] + " " + ones[rem % 10];
        } else if (rem > 0) {
          part += ones[rem];
        }
      } else if (g >= 20) {
        part += tens[Math.floor(g / 10)] + " " + ones[g % 10];
      } else {
        part += ones[g];
      }
      parts.push(part.trim() + (scales[i] ? " " + scales[i] : ""));
    }

    return parts.join(" ").replace(/\s+/g, " ").trim() + " Only";
  }

  function drawField(label: string, value: string, y: number, width?: number) {
    const w = width || pw - 2 * leftM;
    doc.setFillColor(232, 245, 233); // light green
    doc.rect(leftM, y, w, 10, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(leftM, y, w, 10, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(label, leftM + 3, y + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(value, leftM + 3, y + 8.5);
  }

  function drawFieldPair(label1: string, val1: string, label2: string, val2: string, y: number) {
    const halfW = (pw - 2 * leftM - 4) / 2;
    drawField(label1, val1, y, halfW);

    const x2 = leftM + halfW + 4;
    doc.setFillColor(232, 245, 233);
    doc.rect(x2, y, halfW, 10, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(x2, y, halfW, 10, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(label2, x2 + 3, y + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(val2, x2 + 3, y + 8.5);
  }

  // ─── Header ─────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("INVESTOR'S PURCHASE FORM", pw / 2, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("ASSET MANAGER: EKUSH WEALTH MANAGEMENT LIMITED", pw / 2, 22, { align: "center" });

  // Ekush branding (top right)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(242, 112, 35);
  doc.text("EKUSH", pw - 20, 12, { align: "right" });
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("Wealth Management", pw - 14, 17, { align: "right" });

  // ─── Fund & Date ────────────────────────────────────────────────
  let y = 30;

  // Date boxes
  const dateBoxStartX = pw - leftM - 48;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Date", dateBoxStartX - 8, y + 5);
  for (let i = 0; i < 8; i++) {
    const x = dateBoxStartX + i * 6;
    doc.setDrawColor(180, 180, 180);
    doc.rect(x, y, 6, 8, "S");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(dateDigits[i] || "", x + 2, y + 6);
  }

  drawField("Name of the Fund", fundName, y, dateBoxStartX - leftM - 12);

  y += 16;
  drawField("Investor Code", investor.investorCode, y);

  y += 14;
  drawField("Investor Name", investor.name, y);

  // ─── Confirmation of Unit Allocation ────────────────────────────
  y += 20;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("CONFIRMATION OF UNIT ALLOCATION", pw / 2, y, { align: "center" });
  doc.setDrawColor(0, 0, 0);
  doc.line(leftM + 30, y + 1, pw - leftM - 30, y + 1);

  y += 8;
  const amountNum = parseFloat(amount) || 0;
  const unitsNum = parseInt(units) || 0;
  const navNum = parseFloat(nav) || 0;

  // Table
  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      ["Investment Amount", amountNum.toLocaleString("en-IN", { maximumFractionDigits: 2 }), "In Words", numberToWords(amountNum)],
      ["Cost Price Per Unit", navNum.toFixed(4), "In Words", numberToWords(Math.round(navNum * 10000) / 10000).replace(" Only", "") + " (per unit)"],
      ["Number of Allotted Units", unitsNum.toLocaleString("en-IN"), "In Words", numberToWords(unitsNum)],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40, fillColor: [232, 245, 233] },
      1: { cellWidth: 35, halign: "right", fontStyle: "bold" },
      2: { cellWidth: 18, fillColor: [232, 245, 233], fontSize: 8 },
      3: { fontSize: 8, fontStyle: "italic" },
    },
  });

  // ─── Mode of Transaction ────────────────────────────────────────
  y = (doc as any).lastAutoTable?.finalY + 10 || y + 40;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Mode of Transaction", pw / 2, y, { align: "center" });
  doc.line(leftM + 50, y + 1, pw - leftM - 50, y + 1);

  y += 7;
  const isOnline = paymentMethod.toLowerCase().includes("transfer") || paymentMethod.toLowerCase().includes("online");
  const isCheque = paymentMethod.toLowerCase().includes("cheque") || paymentMethod.toLowerCase().includes("pay order");
  const isCash = paymentMethod.toLowerCase().includes("cash");

  const drawCheckbox = (label: string, checked: boolean, x: number, yPos: number) => {
    doc.rect(x, yPos - 3, 4, 4, "S");
    if (checked) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 150, 0);
      doc.text("X", x + 0.7, yPos);
    }
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(label, x + 6, yPos);
  };

  drawCheckbox("Online Transfer", isOnline, leftM + 15, y);
  drawCheckbox("Cheque/Pay Order", isCheque, pw / 2 - 20, y);
  drawCheckbox("Cash", isCash, pw - leftM - 40, y);

  y += 8;
  drawField("Bank Name", bank?.bankName || "", y);
  y += 14;
  drawField("Branch Name", bank?.branchName || "", y);
  y += 14;
  drawField("Routing Number", bank?.routingNumber || "", y);
  y += 14;
  drawField("Cheque Number/Pay Order Number (if any)", "", y);
  y += 14;
  drawField("Remarks (if any)", "", y);

  // ─── Signatures ─────────────────────────────────────────────────
  y += 24;
  const thirdW = (pw - 2 * leftM - 8) / 3;

  // Signature boxes
  for (let i = 0; i < 3; i++) {
    const x = leftM + i * (thirdW + 4);
    doc.setDrawColor(0, 0, 0);
    doc.line(x, y, x + thirdW, y);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const labels = ["Principal Signatory", "Secondary Signatory", "Additional Signatory (if any)"];
    doc.text(labels[i], x + thirdW / 2, y + 4, { align: "center" });
  }

  y += 14;
  // Verifier section
  doc.setDrawColor(0, 0, 0);
  doc.rect(leftM, y, pw - 2 * leftM, 20, "S");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Verifier Name", leftM + 3, y + 5);
  doc.text("Designation", leftM + 3, y + 14);
  doc.text("Signature", pw - leftM - 25, y + 5);

  // ─── Footer ─────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "This is a computer-generated form. Ekush Wealth Management Ltd | Licensed by BSEC | www.ekushwml.com",
    pw / 2,
    pageH - 8,
    { align: "center" }
  );

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Purchase-Form-${investor.investorCode}.pdf"`,
    },
  });
}
