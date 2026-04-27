// POST /api/admin/2fa/enroll/confirm
//
// Final step of TOTP enrolment. The staff user has scanned the QR and
// types in the current 6-digit code; we verify against the secret
// stored by /enroll/start and, on match, set enrolledAt + lastUsedAt.
// Subsequent admin logins now require a TOTP code.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";
import { verifyTotpCode } from "@/lib/totp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = session?.user?.role ?? "";
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const code = (body as { code?: unknown } | null)?.code;
  if (typeof code !== "string") {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }

  const row = await prisma.userTotp.findUnique({
    where: { userId: session.user.id },
  });
  if (!row) {
    return NextResponse.json(
      { error: "Start enrollment first." },
      { status: 400 },
    );
  }
  if (row.enrolledAt) {
    return NextResponse.json(
      { error: "2FA is already enrolled on this account." },
      { status: 409 },
    );
  }

  if (!(await verifyTotpCode(row.secret, code))) {
    return NextResponse.json(
      { error: "Invalid or expired code. Try again with the latest 6-digit code from your authenticator app." },
      { status: 401 },
    );
  }

  const now = new Date();
  await Promise.all([
    prisma.userTotp.update({
      where: { userId: session.user.id },
      data: { enrolledAt: now, lastUsedAt: now },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        userRole: role,
        action: "ADMIN_2FA_ENROLL",
        entity: "UserTotp",
        entityId: row.id,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
