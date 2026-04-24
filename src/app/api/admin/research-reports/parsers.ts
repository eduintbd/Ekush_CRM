/**
 * Input parser for /api/admin/research-reports POST + PATCH. Kept
 * outside route.ts because Next.js App Router only allows HTTP-verb
 * + config exports from route files.
 */

export type ResearchReportInput = {
  title: string;
  description: string;
  pdfUrl: string;
  pdfSizeBytes: number | null;
  displayOrder: number;
  isPublished: boolean;
};

export function parseResearchReportInput(
  body: Record<string, unknown>,
): ResearchReportInput | { error: string } {
  const title = str(body.title);
  const description = str(body.description);
  const pdfUrl = str(body.pdfUrl);

  if (!title) return { error: "title is required" };
  if (title.length > 200) return { error: "title is too long (max 200 chars)" };
  if (!description) return { error: "description is required" };
  if (description.length > 500) {
    return { error: "description is too long (max 500 chars)" };
  }
  if (!pdfUrl) return { error: "pdfUrl is required" };
  if (!/^https?:\/\//i.test(pdfUrl)) {
    return { error: "pdfUrl must be an http(s) URL" };
  }

  // pdfSizeBytes is set by the upload handler — admins don't edit it
  // by hand, but accept the value on PATCH so edits preserve it.
  const rawSize = body.pdfSizeBytes;
  let pdfSizeBytes: number | null = null;
  if (typeof rawSize === "number" && Number.isFinite(rawSize) && rawSize > 0) {
    pdfSizeBytes = Math.trunc(rawSize);
  }

  return {
    title,
    description,
    pdfUrl,
    pdfSizeBytes,
    displayOrder: intOrZero(body.displayOrder),
    isPublished: !!body.isPublished,
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function intOrZero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
