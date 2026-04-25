import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "../../knowledge/_guard";

/**
 * Pull the latest uploaded Portfolio Statement PDF for a fund, hand
 * it to Claude, and return structured asset / sector / holdings data
 * the admin can review before saving.
 *
 * The admin flow is:
 *   1. Upload the quarterly portfolio statement under Fund Reports →
 *      Portfolio Statement.
 *   2. Open /admin/fund-fact-sheets/<code> and hit "Extract from
 *      latest PDF" — this route runs.
 *   3. The form pre-fills with the extracted numbers; the admin
 *      reviews (can edit any row) and hits Save.
 *
 * We intentionally do not write to FundFactSheet here — the admin is
 * the review gate. If the PDF is ambiguous the admin corrects and
 * saves; the extract endpoint stays idempotent.
 */

export const maxDuration = 60;
export const runtime = "nodejs";

const ALLOWED_CODES = new Set(["EFUF", "EGF", "ESRF"]);

const EXTRACT_PROMPT = `You are reading a mutual-fund Portfolio Statement PDF issued in Bangladesh. Extract the fields below and return a single JSON object with no markdown fences and no commentary.

{
  "asOfDate": "YYYY-MM-DD — the 'As on …' date printed at the top, or null",
  "totalInvestment": "grand total investment value as a number, or null",
  "assetAllocation": [
    { "category": "Stocks",              "weightPct": number },
    { "category": "Bonds",               "weightPct": number },
    { "category": "Cash & Equivalents",  "weightPct": number }
  ],
  "sectorAllocation": [
    { "sector": "Bank",             "weightPct": number },
    { "sector": "Pharmaceuticals",  "weightPct": number },
    { "sector": "Close-End Mutual Funds", "weightPct": number },
    { "sector": "Miscellaneous",    "weightPct": number },
    { "sector": "Engineering",      "weightPct": number },
    { "sector": "Preference Shares","weightPct": number },
    { "sector": "Open-End Mutual Funds", "weightPct": number }
  ],
  "holdings": [
    { "ticker": "short code, uppercase", "name": "security name as printed", "weightPct": number }
  ]
}

Extraction rules:

A. Asset allocation (three rows always):
   - "Stocks" = GRAND TOTAL OF CAPITAL MARKET SECURITIES → use its "% of total Investment" value. This is the sum of Section I (Listed) + Section II (Non-Listed).
   - "Bonds" = 0 unless the PDF has a dedicated bonds section. Most Ekush portfolio statements show 0 here.
   - "Cash & Equivalents" = 100 − Stocks% − Bonds%. Equivalent to (Total Cash and Cash Equivalents and Investments in Securities not Related to Capital Market) ÷ (Total Investment) × 100. Round to 2 decimals.
   - If values don't add to exactly 100 due to rounding, accept ±0.2% drift.

B. Sector allocation (Section I + Section II combined):
   - Sectors appear as un-numbered ALL-CAPS headers above their stock rows ("BANK", "PHARMACEUTICALS", "CLOSE-END MUTUAL FUND", "MISCELLANEOUS", "ENGINEERING", "Preference Shares", "A. Open-End Mutual Funds").
   - For each sector, SUM the "% of total Investment" column for every numbered row that belongs to that sector.
   - Only include sectors that have at least one row in the PDF. Drop sectors from the list above whose sum would be 0.
   - Use the canonical sector names from the JSON skeleton above. Map "CLOSE-END MUTUAL FUND" → "Close-End Mutual Funds", "Preference Shares" stays as "Preference Shares", "A. Open-End Mutual Funds" → "Open-End Mutual Funds".

C. Holdings:
   - One entry per numbered row across BOTH Section I and Section II (skip the "Subtotal" / "Total" rows).
   - "name" = the Investment in Stocks column verbatim.
   - "ticker" = a short uppercase code derived from the security name (e.g. "Square Pharmaceuticals Limited" → "SQUAREPHARMA", "BRAC Bank Limited" → "BRACBANK", "Vanguard AML Growth Fund" → "VAMLGROWTH"). If the PDF prints a ticker symbol, prefer that.
   - "weightPct" = the row's "% of total Investment" number.
   - Sort descending by weightPct. Include every row (do not cap at 5 — the admin UI slices top 5 on render).

D. Numbers:
   - Percentages as plain numbers without the % sign (e.g. 14.14 not "14.14%").
   - If a field is not present or unreadable, use null for dates and 0 for numeric percentages.

Return the JSON object ONLY — no prose, no fences.`;

export async function POST(req: NextRequest) {
  const guard = await requireStaff();
  if (guard) return guard;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { fundCode?: string; reportId?: string }
    | null;
  const fundCode = (body?.fundCode ?? "").toUpperCase();
  if (!ALLOWED_CODES.has(fundCode)) {
    return NextResponse.json(
      { error: "fundCode must be EFUF, EGF, or ESRF" },
      { status: 400 },
    );
  }

  const fund = await prisma.fund.findUnique({ where: { code: fundCode } });
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

  const report = body?.reportId
    ? await prisma.fundReport.findFirst({
        where: { id: body.reportId, fundId: fund.id, reportType: "PORTFOLIO_STATEMENT" },
      })
    : await prisma.fundReport.findFirst({
        where: { fundId: fund.id, reportType: "PORTFOLIO_STATEMENT" },
        orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
      });

  if (!report) {
    return NextResponse.json(
      {
        error:
          "No Portfolio Statement uploaded for this fund yet. Upload one in Fund Reports first.",
      },
      { status: 404 },
    );
  }

  const pdfBuffer = await loadPdf(report.filePath);
  if (!pdfBuffer) {
    return NextResponse.json(
      { error: `Could not read PDF at ${report.filePath}` },
      { status: 502 },
    );
  }

  const base64 = pdfBuffer.toString("base64");

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            { type: "text", text: EXTRACT_PROMPT },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text") as
      | { type: "text"; text: string }
      | undefined;
    const raw = textBlock?.text?.trim() ?? "{}";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Claude returned a non-JSON response", raw: cleaned },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      fundCode,
      report: {
        id: report.id,
        filePath: report.filePath,
        fileName: report.fileName,
        reportDate: report.reportDate,
      },
      extracted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    console.error("fund-fact-sheets extract error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * filePath is either a Vercel Blob URL (https://…) or the dev-mode
 * local "/uploads/…" path. Fetch the first, read-from-disk the second.
 */
async function loadPdf(filePath: string): Promise<Buffer | null> {
  try {
    if (/^https?:\/\//i.test(filePath)) {
      const res = await fetch(filePath);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    }
    const rel = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    const abs = path.join(process.cwd(), rel);
    return await readFile(abs);
  } catch {
    return null;
  }
}
