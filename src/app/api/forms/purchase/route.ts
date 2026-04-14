import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { EKUSH_LOGO_BASE64 } from "@/lib/logo-data";

// ──────────────────────────────────────────────────────────────────
// Exact replica of the Ekush "INVESTOR'S PURCHASE FORM" PDF template
// All measurements are in mm (jsPDF default unit)
// ──────────────────────────────────────────────────────────────────

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
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = String(today.getFullYear());
  const dateDigits = (dd + mm + yyyy).split(""); // [d,d,m,m,y,y,y,y]

  const amountNum = parseFloat(amount) || 0;
  const unitsNum = parseInt(units) || 0;
  const navNum = parseFloat(nav) || 0;

  const doc = new jsPDF("p", "mm", "a4"); // 210 x 297 mm
  const pw = 210;
  const L = 18; // left margin
  const R = pw - 18; // right edge
  const W = R - L; // content width (174mm)

  // ─── Colors ─────────────────────────────────────────────────────
  const GREEN_BG: [number, number, number] = [220, 237, 200]; // green fill from the PDF
  const BORDER: [number, number, number] = [160, 160, 160]; // grey border
  const BLACK: [number, number, number] = [0, 0, 0];
  const GREY: [number, number, number] = [100, 100, 100];

  function setColor(c: [number, number, number]) {
    doc.setTextColor(c[0], c[1], c[2]);
  }

  // ─── Logo (top-right) ───────────────────────────────────────────
  try {
    doc.addImage(EKUSH_LOGO_BASE64, "PNG", R - 42, 8, 42, 18);
  } catch {
    // Fallback text if image fails
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(242, 112, 35);
    doc.text("EKUSH", R - 5, 16, { align: "right" });
  }

  // ─── Title ──────────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setColor(BLACK);
  doc.text("INVESTOR'S PURCHASE FORM", pw / 2 - 8, 18, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(GREY);
  doc.text("ASSET MANAGER: EKUSH WEALTH MANAGEMENT LIMITED", pw / 2 - 8, 26, { align: "center" });

  // ─── Horizontal rule ────────────────────────────────────────────
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(L, 32, R, 32);

  // ─── Fund Name + Date row ───────────────────────────────────────
  let y = 36;

  // "Name of the Fund" field — green box
  const dateBlockW = 62; // width for "Date" label + 8 digit boxes
  const fundFieldW = W - dateBlockW - 6;

  // Green field: Name of the Fund
  doc.setFillColor(...GREEN_BG);
  doc.setDrawColor(...BORDER);
  doc.rect(L, y, fundFieldW, 16, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(GREY);
  doc.text("Name of the Fund", L + 3, y + 5);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(BLACK);
  doc.text(fundName, L + 3, y + 13);

  // Date label + boxes
  const dateX = L + fundFieldW + 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(GREY);
  doc.text("Date", dateX, y + 9);

  const boxSize = 6;
  const boxStartX = dateX + 12;
  for (let i = 0; i < 8; i++) {
    const bx = boxStartX + i * (boxSize + 0.8);
    doc.setDrawColor(...BORDER);
    doc.setFillColor(245, 245, 245);
    doc.rect(bx, y + 2, boxSize, boxSize + 2, "FD");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    setColor(BLACK);
    doc.text(dateDigits[i] || "", bx + boxSize / 2, y + 8.5, { align: "center" });
  }

  // ─── Investor Code ──────────────────────────────────────────────
  y += 22;
  doc.setFillColor(...GREEN_BG);
  doc.setDrawColor(...BORDER);
  doc.rect(L, y, W, 14, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(GREY);
  doc.text("Investor Code", L + 3, y + 5);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(BLACK);
  doc.text(investor.investorCode, L + 3, y + 11.5);

  // ─── Investor Name ──────────────────────────────────────────────
  y += 18;
  doc.setFillColor(...GREEN_BG);
  doc.setDrawColor(...BORDER);
  doc.rect(L, y, W, 14, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(GREY);
  doc.text("Investor Name", L + 3, y + 5);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(BLACK);
  doc.text(investor.name, L + 3, y + 11.5);

  // ─── CONFIRMATION OF UNIT ALLOCATION ────────────────────────────
  y += 24;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.line(L + 20, y, R - 20, y);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  setColor(BLACK);
  doc.text("CONFIRMATION OF UNIT ALLOCATION", pw / 2, y - 2, { align: "center" });

  y += 5;

  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      [
        "Investment Amount",
        amountNum.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
        "In Words",
        numberToWords(amountNum),
      ],
      [
        "Cost Price Per Unit",
        navNum.toFixed(4),
        "In Words",
        numberToWords(Math.round(navNum)) + " (per unit)",
      ],
      [
        "Number of Allotted Units",
        unitsNum.toLocaleString("en-IN"),
        "In Words",
        numberToWords(unitsNum),
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: { top: 5, bottom: 5, left: 3, right: 3 },
      lineColor: [160, 160, 160],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 42, fillColor: [220, 237, 200] as any },
      1: { cellWidth: 30, halign: "right", fontStyle: "bold" },
      2: { cellWidth: 16, fillColor: [220, 237, 200] as any, fontSize: 8 },
      3: { fontSize: 9, fontStyle: "italic" },
    },
    margin: { left: L, right: pw - R },
  });

  // ─── Mode of Transaction ────────────────────────────────────────
  y = (doc as any).lastAutoTable?.finalY + 12 || y + 50;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.line(L + 40, y, R - 40, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(BLACK);
  doc.text("Mode of Transaction", pw / 2, y - 2, { align: "center" });

  y += 6;

  const isOnline = /transfer|online/i.test(paymentMethod);
  const isCheque = /cheque|pay.?order/i.test(paymentMethod);
  const isCash = /cash/i.test(paymentMethod);

  function drawCheckbox(label: string, checked: boolean, x: number, yPos: number) {
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(x, yPos - 3.5, 4.5, 4.5, "S");
    if (checked) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 130, 0);
      doc.text("X", x + 1, yPos + 0.3);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setColor(BLACK);
    doc.text(label, x + 7, yPos);
  }

  const colW = W / 3;
  drawCheckbox("Online Transfer", isOnline, L + 10, y);
  drawCheckbox("Cheque/Pay Order", isCheque, L + colW + 10, y);
  drawCheckbox("Cash", isCash, L + colW * 2 + 10, y);

  // ─── Bank details fields ────────────────────────────────────────
  y += 10;
  const fieldH = 14;

  const drawFormField = (label: string, value: string, yp: number) => {
    doc.setFillColor(...GREEN_BG);
    doc.setDrawColor(...BORDER);
    doc.rect(L, yp, W, fieldH, "FD");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(GREY);
    doc.text(label, L + 3, yp + 5);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(BLACK);
    doc.text(value, L + 3, yp + 11.5);
  };

  drawFormField("Bank Name", bank?.bankName || "", y);
  y += fieldH + 2;
  drawFormField("Branch Name", bank?.branchName || "", y);
  y += fieldH + 2;
  drawFormField("Routing Number", bank?.routingNumber || "", y);
  y += fieldH + 2;
  drawFormField("Cheque Number/Pay Order Number (if any)", "", y);
  y += fieldH + 2;
  drawFormField("Remarks (if any)", "", y);

  // ─── Signature section ──────────────────────────────────────────
  y += fieldH + 20;

  const sigW = (W - 12) / 3;
  const sigLabels = ["Principal Signatory", "Secondary Signatory", "Additional Signatory (if any)"];

  for (let i = 0; i < 3; i++) {
    const sx = L + i * (sigW + 6);
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.4);
    doc.line(sx, y, sx + sigW, y);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(GREY);
    doc.text(sigLabels[i], sx + sigW / 2, y + 5, { align: "center" });
  }

  // ─── Verifier box ───────────────────────────────────────────────
  y += 14;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.rect(L, y, W, 22, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(GREY);
  doc.text("Verifier Name", L + 3, y + 7);
  doc.line(L, y + 11, L + W, y + 11);
  doc.text("Designation", L + 3, y + 18);

  doc.setFontSize(8);
  setColor(GREY);
  doc.text("Signature", R - 25, y + 7);

  // ─── Return PDF ─────────────────────────────────────────────────
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Purchase-Form-${investor.investorCode}.pdf"`,
    },
  });
}

// ──────────────────────────────────────────────────────────────────
// Number to words (South Asian: Lakh / Crore grouping)
// ──────────────────────────────────────────────────────────────────

function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const intPart = Math.floor(Math.abs(n));
  if (intPart === 0) return "Zero";

  let remaining = intPart;
  const groups: number[] = [];
  groups.push(remaining % 1000);
  remaining = Math.floor(remaining / 1000);
  while (remaining > 0) {
    groups.push(remaining % 100);
    remaining = Math.floor(remaining / 100);
  }

  const scales = ["", "Thousand", "Lakh", "Crore"];
  const parts: string[] = [];

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
