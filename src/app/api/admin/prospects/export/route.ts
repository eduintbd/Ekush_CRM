// GET /api/admin/prospects/export
//
// Marketing CSV export. Per the brief, ONLY marketing-eligible fields:
//   name, phone, email, interest, source, joined date, marketing
//   consent timestamp.
//
// Explicitly NOT included:
//   - password_hash, supabaseId        (credentials)
//   - kyc fields (we don't have any here, but the export schema is
//     defined exhaustively to make accidental future leaks impossible)
//   - linkedInvestorId                 (investor PII boundary)
//   - last_login_at                    (engagement metadata, not
//                                       marketing-attribution data)
//
// We also write an AuditLog entry on each export so a compliance review
// can reconstruct who pulled which marketing list, when, and from
// which IP.

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
      // Only export prospects who have actively consented. An unverified
      // sign-up that never finished OTP verification is excluded.
      marketingConsent: true,
      phoneVerified: true,
    },
    select: {
      name: true,
      phone: true,
      email: true,
      interest: true,
      source: true,
      createdAt: true,
      marketingConsentAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      userRole: role,
      action: "PROSPECTS_EXPORT_CSV",
      entity: "Prospect",
      ipAddress: getRequestIp(req),
      metadata: { count: rows.length },
    },
  });

  const header = [
    "name",
    "phone",
    "email",
    "interest",
    "source",
    "joined_at",
    "marketing_consent_at",
  ];
  const lines: string[] = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvField(r.name),
        csvField(`+880${r.phone}`),
        csvField(r.email ?? ""),
        csvField(r.interest),
        csvField(r.source ?? ""),
        csvField(r.createdAt.toISOString()),
        csvField(r.marketingConsentAt ? r.marketingConsentAt.toISOString() : ""),
      ].join(","),
    );
  }

  // Excel reads a CSV as UTF-8 only when there's a BOM. Saves the user
  // from the "Bengali names show as ????" trap.
  const body = "﻿" + lines.join("\n");
  const filename = `ekush-prospects-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Don't let proxies cache marketing exports — every download
      // should hit the DB so audit log captures it.
      "Cache-Control": "no-store",
    },
  });
}

// Quotes the field if it contains a comma, quote, or newline; doubles
// up internal quotes per RFC 4180. Empty string left as-is.
function csvField(v: string): string {
  if (v === "") return "";
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
