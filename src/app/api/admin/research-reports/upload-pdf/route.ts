import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/upload";
import { requireStaff } from "../../knowledge/_guard";

/**
 * Admin upload endpoint for Research Report PDFs. Pushes the file to
 * Vercel Blob and returns { url, sizeBytes } that the form saves
 * into ResearchReport.pdfUrl + pdfSizeBytes via POST/PATCH.
 *
 * Constraints:
 *   - MIME: application/pdf (the UI's `accept` attribute is the soft
 *     gate; this is the hard one)
 *   - size: 50 MB max — research PDFs with charts + figures can run
 *     large, and admin saves are infrequent so the cap is generous
 */
const MAX_SIZE = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const guard = await requireStaff();
  if (guard) return guard;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.type && file.type !== "application/pdf") {
    return NextResponse.json(
      { error: `file must be application/pdf (got ${file.type})` },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "file too large (max 50 MB)" },
      { status: 400 },
    );
  }

  const key = `research-reports/${Date.now()}-${file.name}`.replace(
    /\s+/g,
    "-",
  );
  const url = await uploadFile(file, key);
  return NextResponse.json({ url, sizeBytes: file.size });
}
