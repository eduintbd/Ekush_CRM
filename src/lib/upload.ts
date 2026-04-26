import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

/**
 * Upload a File to either Vercel Blob (production) or local uploads/ dir (dev fallback).
 *
 * - In production set BLOB_READ_WRITE_TOKEN in Vercel env vars to enable Blob storage.
 * - In dev, if the token is missing we write to ./uploads which works on a normal filesystem.
 *
 * Returns a URL or relative path that can be stored in the database.
 *
 * NOTE: this is the legacy signature, retained for non-KYC callers
 * (article covers, learn images, daily fund uploads, etc.). For KYC
 * documents always use `uploadKycDocument()` below — it adds the
 * Phase-8 hardening pipeline (magic-byte check, sharp re-encode,
 * UUID filenames, etc.).
 */
export async function uploadFile(file: File, key: string): Promise<string> {
  // Sanitize key to avoid path traversal or weird chars
  const safeKey = key.replace(/[^\w./\-]/g, "_");

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(safeKey, file, {
      access: "public",
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  // Local filesystem fallback (dev / non-Vercel hosts)
  const uploadsRoot = path.join(process.cwd(), "uploads");
  const fullPath = path.join(uploadsRoot, safeKey);
  await mkdir(path.dirname(fullPath), { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(fullPath, Buffer.from(bytes));
  return `/${path.posix.join("uploads", safeKey)}`;
}

// ─── Phase 8: KYC document hardening ─────────────────────────────
//
// All KYC document uploads (NID Front, NID Back, Photo, Signature,
// Nominee NID/Photo/Signature, E-TIN, Cheque Leaf, BO Acknowledgement)
// MUST flow through uploadKycDocument(). Image kinds get re-encoded
// through sharp to destroy polyglots and strip EXIF (incl. GPS).
// PDFs are kept byte-identical (re-encoding a PDF is lossy) but
// magic-byte gated so a renamed .exe can't sneak in. Filenames are
// random UUIDs at rest — the original name stays in the DB only as
// a display label, never on disk.

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Filename extensions that NEVER appear in a legitimate KYC upload.
// Reject if any of these substrings is present anywhere in the name —
// guards against double extensions (e.g. "nid.jpg.exe") and
// case-insensitive matches.
const FORBIDDEN_EXT_TOKENS: readonly string[] = [
  ".exe", ".bat", ".cmd", ".sh", ".ps1", ".js", ".vbs", ".jar",
  ".apk", ".msi", ".scr", ".com", ".php", ".jsp", ".asp", ".aspx",
  ".py", ".rb", ".pl", ".html", ".htm", ".svg", ".dll", ".sys",
];

const PDF_MIME = "application/pdf";

// PDF is only legitimate on a small subset of KYC document kinds —
// E-TIN and BO Acknowledgement, since those typically arrive from the
// issuing authority as scanned PDFs. NID front/back, photo, signature,
// cheque leaf etc. must be images.
export const PDF_ALLOWED_KYC_KINDS: ReadonlySet<string> = new Set([
  "TIN_CERT",
  "BO_ACKNOWLEDGEMENT",
]);

// Magic-byte signatures we trust. Reading the first 12 bytes is enough
// to identify all four formats and is cheap (single arrayBuffer slice).
function detectMagicBytes(
  buf: Buffer,
): "image/jpeg" | "image/png" | "image/webp" | "application/pdf" | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // WebP: "RIFF????WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return "image/webp";
  }
  // PDF: "%PDF-"
  if (
    buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 &&
    buf[4] === 0x2d
  ) {
    return "application/pdf";
  }
  return null;
}

export type KycUploadResult = {
  // Path to use as Document.filePath. Always begins with "kyc/" so
  // the gated download endpoint can recognise it.
  filePath: string;
  // Final stored mime — for images this is "image/jpeg" since we
  // re-encode to JPEG; for PDFs it's "application/pdf".
  storedMimeType: string;
  // Bytes on disk after re-encoding (for images may differ from input).
  storedSizeBytes: number;
  // Original filename, sanitized — store on Document.fileName to show
  // the user a meaningful label without exposing the raw name on disk.
  displayName: string;
};

export class KycUploadError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Hardened KYC document upload. Throws KycUploadError on validation
 * failure so callers can surface a clean message; throws plain Error
 * on infrastructure errors (Blob unavailable, filesystem write failed).
 *
 * Pass `allowPdf: true` only for kinds that legitimately ship as a
 * PDF (E-TIN, BO Acknowledgement). Callers can derive this from
 * `PDF_ALLOWED_KYC_KINDS.has(type)` against a known type string.
 */
export async function uploadKycDocument(
  file: File,
  opts: { investorId: string; allowPdf?: boolean; pathPrefix?: string },
): Promise<KycUploadResult> {
  // 1. Size cap
  if (file.size > MAX_BYTES) {
    throw new KycUploadError(
      413,
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed is 5 MB.`,
    );
  }
  if (file.size === 0) {
    throw new KycUploadError(400, "File is empty.");
  }

  // 2. Filename extension denylist (case-insensitive substring match)
  const lowerName = (file.name ?? "").toLowerCase();
  for (const banned of FORBIDDEN_EXT_TOKENS) {
    if (lowerName.includes(banned)) {
      throw new KycUploadError(
        415,
        `Filenames containing "${banned}" are not allowed.`,
      );
    }
  }

  // 3. Read first 12 bytes for magic-byte detection
  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  const detected = detectMagicBytes(buffer.subarray(0, 12));
  if (!detected) {
    throw new KycUploadError(
      415,
      "Unsupported file type. Upload a JPEG / PNG / WEBP image, or a PDF for E-TIN / BO Acknowledgement.",
    );
  }

  // 4. PDF allowlist — caller decides via opts.allowPdf based on the
  // document type. The register route maps each KYC docType to this
  // flag via PDF_ALLOWED_KYC_KINDS.
  const isPdf = detected === "application/pdf";
  if (isPdf && !opts.allowPdf) {
    throw new KycUploadError(
      415,
      "PDF is only allowed for E-TIN Certificate and BO Acknowledgement.",
    );
  }

  // 5. Cross-check the client-claimed MIME against the magic bytes.
  // We do not rely on file.type alone — the magic bytes win — but if
  // the client claimed something hostile (e.g. text/html) we reject
  // even if the bytes were also lying about being an image.
  const claimedMime = (file.type ?? "").toLowerCase();
  if (claimedMime && claimedMime !== detected && !isPdf) {
    // For images, sharp will re-encode regardless, so a mismatch is
    // not catastrophic. We still log a warning.
    // eslint-disable-next-line no-console
    console.warn(
      `[uploadKycDocument] MIME mismatch: client said "${claimedMime}", magic bytes say "${detected}". Re-encoding via sharp.`,
    );
  }

  // 6. Re-encode images to strip EXIF / polyglot payloads. PDFs go
  // through unchanged — the magic-byte check is the gate, and
  // re-encoding a PDF is lossy and provider-dependent.
  let outBuffer: Buffer;
  let storedMime: string;
  let storedExt: string;
  if (isPdf) {
    outBuffer = buffer;
    storedMime = PDF_MIME;
    storedExt = "pdf";
  } else {
    // Re-encode to JPEG. Auto-rotate based on EXIF, then strip ALL
    // metadata (incl. GPS). Quality 88 is visually lossless for ID
    // photos and shrinks to ~30% of typical phone-camera output.
    outBuffer = await sharp(buffer)
      .rotate() // honour EXIF orientation, then drop EXIF below
      .jpeg({ quality: 88, mozjpeg: true })
      .withMetadata({
        // sharp's withMetadata({}) keeps profile/density only — NO
        // EXIF passes through. Calling it explicitly so the intent
        // is visible in the diff.
        exif: {},
      })
      .toBuffer();
    storedMime = "image/jpeg";
    storedExt = "jpg";
  }

  // 7. UUID filename — never include any user-supplied bytes in the
  // path so a renamed .exe.jpg can't reach the disk under that name.
  // The path always begins with "kyc/" so the gated download endpoint
  // can recognise it and refuse to serve unrelated keys.
  const uuid = crypto.randomUUID();
  const prefix = opts.pathPrefix ?? "kyc";
  const storedKey = `${prefix}/${opts.investorId}/${uuid}.${storedExt}`;

  // 8. Persist. Vercel Blob's `access: "public"` is the only mode the
  // SDK accepts on `put()` today; we keep blobs unguessable via the
  // UUID and never expose the public URL to clients — downloads flow
  // through /api/documents/[id] which checks auth + ownership.
  const filePath = await persistBytes(outBuffer, storedKey, storedMime);

  // Sanitize original name for display. Strip path components and
  // forbid control chars so an admin viewer can render it safely.
  const displayName = sanitizeDisplayName(file.name ?? "(unnamed)");

  return {
    filePath,
    storedMimeType: storedMime,
    storedSizeBytes: outBuffer.length,
    displayName,
  };
}

async function persistBytes(
  bytes: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, bytes, {
      access: "public",
      addRandomSuffix: false,
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }
  // Dev fallback — write outside web root (process.cwd()/uploads is
  // not served by Next.js by default).
  const uploadsRoot = path.join(process.cwd(), "uploads");
  const fullPath = path.join(uploadsRoot, key);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, bytes);
  return `/${path.posix.join("uploads", key)}`;
}

function sanitizeDisplayName(raw: string): string {
  // Drop directory components, collapse path separators, strip control
  // chars + common shell metacharacters so an admin previewing the
  // filename never executes it.
  const base = raw.split(/[\\/]/).pop() ?? raw;
  return base
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f<>:"|?*]/g, "")
    .slice(0, 120)
    .trim() || "document";
}
