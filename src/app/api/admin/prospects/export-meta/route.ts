// GET /api/admin/prospects/export-meta
//
// Meta Business Suite custom-audience CSV. Meta accepts hashed
// identifiers — we follow their normalization rules:
//   - email:      lowercase, trim, then SHA-256
//   - phone:      digits only with country code, then SHA-256
//   - first/last: lowercase, trim, then SHA-256
//
// The header columns must match Meta's expected names exactly so the
// audience importer can auto-map.
//
// Same audit-log + consent-gating semantics as /export.

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";
import { isProspectsEnabled } from "@/lib/feature-flags";
import { getRequestIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  if (!isProspectsEnabled()) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const session = await getSession();
  const role = session?.user?.role;
  if (!session || !STAFF_ROLES.includes(role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rows = await prisma.prospect.findMany({
    where: {
      deletedAt: null,
      marketingConsent: true,
      phoneVerified: true,
    },
    select: {
      name: true,
      phone: true,
      email: true,
    },
    orderBy: { createdAt: "desc" },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      userRole: role,
      action: "PROSPECTS_EXPORT_META",
      entity: "Prospect",
      ipAddress: getRequestIp(req),
      metadata: { count: rows.length },
    },
  });

  // Meta's expected column names for hashed PII (HASHED_* convention):
  //   email, phone, fn (first name), ln (last name)
  // Source: https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences
  const header = ["email", "phone", "fn", "ln"];
  const lines: string[] = [header.join(",")];

  for (const r of rows) {
    const { fn, ln } = splitName(r.name);
    const phoneFull = `880${r.phone}`; // Meta wants country code, no + sign
    lines.push(
      [
        sha256(normalizeEmail(r.email)),
        sha256(normalizePhone(phoneFull)),
        sha256(normalizeName(fn)),
        sha256(normalizeName(ln)),
      ].join(","),
    );
  }

  const body = "﻿" + lines.join("\n");
  const filename = `ekush-prospects-meta-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function sha256(input: string): string {
  if (!input) return "";
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D+/g, "");
}

function normalizeName(name: string): string {
  if (!name) return "";
  // Meta strips diacritics + non-letter chars + lowercases. We keep
  // Bengali letters intact (Unicode \p{L}) so Bengali-only names
  // still produce stable hashes — Meta's hashing tool handles UTF-8.
  return name.normalize("NFKD").replace(/[^\p{L}]+/gu, "").toLowerCase();
}

function splitName(full: string): { fn: string; ln: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return { fn: "", ln: "" };
  if (parts.length === 1) return { fn: parts[0], ln: "" };
  return { fn: parts[0], ln: parts.slice(1).join(" ") };
}
