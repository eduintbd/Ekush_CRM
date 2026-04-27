// POST /api/admin/2fa/enroll/start
//
// Generates a fresh TOTP secret + otpauth QR for the calling staff
// user. Stores the secret on UserTotp with `enrolledAt = null` so a
// page refresh during enrollment doesn't lose the secret. The user
// must POST /api/admin/2fa/enroll/confirm with a valid 6-digit code
// to flip enrolledAt and complete enrolment.
//
// Re-running this endpoint on a user who has already started (but not
// confirmed) overwrites the previous secret — the prior QR becomes
// invalid. That's the safer default if the admin scanned but lost
// access to the authenticator before confirming.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";
import { generateTotpSecret, buildEnrollmentBundle } from "@/lib/totp";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  const role = session?.user?.role ?? "";
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Defensive: refuse to overwrite a confirmed enrolment from this
  // endpoint. If a staff user wants to rotate their authenticator
  // they should disable first (manual SUPER_ADMIN reset) — that's the
  // brief's "no recovery codes for v1" stance.
  const existing = await prisma.userTotp.findUnique({
    where: { userId: session.user.id },
  });
  if (existing?.enrolledAt) {
    return NextResponse.json(
      {
        error:
          "2FA is already enrolled on this account. Ask a Super Admin to disable it first if you need to re-enroll.",
      },
      { status: 409 },
    );
  }

  const secret = generateTotpSecret();
  const account = session.user.email ?? session.user.id;

  if (existing) {
    await prisma.userTotp.update({
      where: { userId: session.user.id },
      data: { secret, enrolledAt: null, lastUsedAt: null },
    });
  } else {
    await prisma.userTotp.create({
      data: { userId: session.user.id, secret },
    });
  }

  const bundle = await buildEnrollmentBundle(secret, account);
  return NextResponse.json({
    success: true,
    // The plaintext secret is returned ONCE so the user can paste it
    // into a password manager / authenticator manually if they can't
    // scan the QR. After confirmation, no endpoint exposes it again.
    secret: bundle.secret,
    otpauthUri: bundle.otpauthUri,
    qrDataUrl: bundle.qrDataUrl,
  });
}
