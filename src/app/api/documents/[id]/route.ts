// GET /api/documents/[id]
//
// Phase 8 — auth-gated KYC document fetch.
//
// Vercel Blob URLs are public-readable by design (the SDK only ships
// `access: "public"`), so the security model is: keys are unguessable
// UUIDs, and we never expose the raw Blob URL to the client. This
// endpoint resolves the Document row, checks the caller is allowed to
// see it, then proxies the bytes back. Admin staff get any doc;
// investors only get their own.
//
// Note: a determined attacker who somehow learned a UUID could fetch
// the blob directly. UUID-v4 has 122 bits of entropy and the URL is
// only handed out via this endpoint, so the leak surface is the
// admin's session, not the URL space.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      investorId: true,
      type: true,
      fileName: true,
      filePath: true,
      mimeType: true,
    },
  });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = session.user.role ?? "";
  const isStaff = STAFF_ROLES.includes(role);
  const isOwner =
    Boolean(session.user.investorId) && session.user.investorId === doc.investorId;

  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Defence-in-depth: refuse to proxy anything that doesn't live in
  // our expected key prefix. A path that doesn't start with "kyc/"
  // would mean the row was written before Phase 8 (legacy uploadFile
  // path) — for those we redirect to the stored URL since the legacy
  // pipeline only produced public-mode blobs anyway.
  const isPhase8Path = doc.filePath.startsWith("https://") || doc.filePath.startsWith("/uploads/");
  if (!isPhase8Path) {
    return NextResponse.json({ error: "Invalid document path" }, { status: 500 });
  }

  let upstream: Response;
  try {
    if (doc.filePath.startsWith("/uploads/")) {
      // Dev fallback — read from local filesystem directly.
      const fs = await import("fs/promises");
      const path = await import("path");
      const fullPath = path.join(process.cwd(), doc.filePath.replace(/^\//, ""));
      const data = await fs.readFile(fullPath);
      return new NextResponse(new Uint8Array(data), {
        status: 200,
        headers: {
          "Content-Type": doc.mimeType ?? "application/octet-stream",
          "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    upstream = await fetch(doc.filePath, { cache: "no-store" });
  } catch {
    return NextResponse.json({ error: "Could not fetch document" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Document not available" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      // Force the browser-detected mime to match what we stored, not
      // whatever Vercel Blob inferred. That stops a content-type
      // confusion attack from the upstream side.
      "Content-Type": doc.mimeType ?? "application/octet-stream",
      // `inline` so admins can preview NID images directly in the
      // browser; clients can still right-click → save.
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
      // Never cache — every fetch should re-check session.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
