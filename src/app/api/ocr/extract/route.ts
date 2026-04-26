import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/auth";

// Vercel Pro: allow up to 60s; Hobby caps at 10s which is usually enough here.
export const maxDuration = 30;
export const runtime = "nodejs";

const PROMPTS: Record<string, string> = {
  nid: `You are analyzing a Bangladesh National ID Card (NID) image. Extract the following fields and return ONLY a valid JSON object with no markdown fences and no commentary:

{
  "nameEnglish": "full name in English BLOCK LETTERS, or null",
  "nameBengali": "full name in Bengali, or null",
  "fatherName": "father's / husband's name — copy verbatim exactly as written (Bengali if that's how it appears), or null",
  "motherName": "mother's name — copy verbatim exactly as written, or null",
  "nidNumber": "NID number as digits only, no spaces or dashes (typical length 10, 13, or 17 digits), or null",
  "dateOfBirth": "date of birth in DD/MM/YYYY format if legible, or null",
  "presentAddress": "present address — copy verbatim, join multi-line into a single string with commas, or null",
  "permanentAddress": "permanent address — copy verbatim, or null"
}

Critical rules:
- Copy Bengali text byte-for-byte as written on the card.
- Labels on BD NIDs are typically: পিতা (father), মাতা (mother), ঠিকানা (address). The value usually appears on the line BELOW the label.
- For nidNumber, strip all non-digit characters.
- If a field is missing or illegible, set it to null (not empty string).
- Output the JSON object ONLY.`,

  bo: `You are analyzing a Bangladesh BO (Beneficial Owner) account acknowledgement / receipt. Return ONLY a valid JSON object:

{
  "boAccountNumber": "16-digit BO account number as digits only (strip spaces and dashes), or null",
  "holderName": "account holder name, or null"
}

Rules:
- BO account numbers are 16 digits, often printed as "BO ID" or "BO A/C" or "Account No".
- Strip all non-digit characters from boAccountNumber.
- Output the JSON object ONLY.`,

  tin: `You are analyzing a Bangladesh E-TIN (Tax Identification Number) certificate. Return ONLY a valid JSON object:

{
  "tinNumber": "TIN number as digits only (typically 12 digits), or null",
  "holderName": "taxpayer name, or null"
}

Rules:
- Strip all non-digit characters from tinNumber.
- Output the JSON object ONLY.`,
};

const SUPPORTED_IMAGE_MEDIA = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const PDF_MEDIA = "application/pdf";
const PDF_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const PDF_MAX_PAGES = 2;

// Page count for unencrypted PDFs: each page object carries `/Type /Page`
// (with negative lookahead to avoid matching `/Pages`, the pages-tree root).
// Returns 0 when the count cannot be determined (e.g. object-stream PDFs);
// callers treat 0 as "unknown" rather than rejecting.
function countPdfPages(buf: Buffer): number {
  const text = buf.toString("binary");
  const matches = text.match(/\/Type\s*\/Page(?![s\/A-Za-z])/g);
  return matches ? matches.length : 0;
}

export async function POST(req: NextRequest) {
  // Guard: require a logged-in session OR allow the call during registration
  // (registration hits this before the user is logged in, so we skip auth).
  // In prod you may want a per-IP rate limiter here.
  await getSession().catch(() => null);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OCR is not configured — ANTHROPIC_API_KEY is missing." },
      { status: 503 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = ((formData.get("type") as string) || "nid").toLowerCase();

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const prompt = PROMPTS[type] ?? PROMPTS.nid;

  const rawMedia = file.type || "image/jpeg";
  const isPdf = rawMedia === PDF_MEDIA;
  const isImage = SUPPORTED_IMAGE_MEDIA.has(rawMedia);

  if (!isPdf && !isImage) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a JPEG / PNG / WEBP image, or a PDF." },
      { status: 415 },
    );
  }

  if (isPdf && file.size > PDF_MAX_BYTES) {
    return NextResponse.json(
      { error: `PDF is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed is 2 MB.` },
      { status: 413 },
    );
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    if (isPdf) {
      const pages = countPdfPages(buffer);
      // pages === 0 means we couldn't reliably count (likely an object-stream
      // PDF); allow it through and let Anthropic handle the upper bound.
      if (pages > PDF_MAX_PAGES) {
        return NextResponse.json(
          { error: `PDF has ${pages} pages. Maximum allowed is ${PDF_MAX_PAGES}.` },
          { status: 400 },
        );
      }
    }

    const sourceBlock = isPdf
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: PDF_MEDIA as "application/pdf",
            data: base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: rawMedia as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64,
          },
        };

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            sourceBlock,
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text") as { type: "text"; text: string } | undefined;
    const raw = textBlock?.text?.trim() ?? "{}";
    // Strip accidental markdown fences if the model added them
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Could not parse model response", raw: cleaned },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    console.error("OCR extract error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
