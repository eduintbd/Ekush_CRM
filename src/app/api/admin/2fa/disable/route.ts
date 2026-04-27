// POST /api/admin/2fa/disable
//
// Manual 2FA reset. SUPER_ADMIN-only per the brief's "admin reset is
// manual via a senior admin" rule — this is what a Super Admin invokes
// when a colleague loses their phone / authenticator app.
//
// Body: { userId: string }
// Effect: drops the UserTotp row entirely; the next login will allow
//         the target user to enrol again from scratch (subject to the
//         grace-window policy).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SUPER_ROLES } from "@/lib/roles";
import { getRequestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = session?.user?.role ?? "";
  if (!session || !SUPER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const targetUserId = (body as { userId?: unknown } | null)?.userId;
  if (typeof targetUserId !== "string" || targetUserId.length === 0) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true, totp: { select: { id: true, enrolledAt: true } } },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (!target.totp) {
    return NextResponse.json(
      { success: true, alreadyDisabled: true },
    );
  }

  await Promise.all([
    prisma.userTotp.delete({ where: { id: target.totp.id } }),
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        userRole: role,
        action: "ADMIN_2FA_DISABLE",
        entity: "UserTotp",
        entityId: target.totp.id,
        ipAddress: getRequestIp(req),
        oldValue: JSON.stringify({
          targetUserId: target.id,
          targetEmail: target.email,
          targetRole: target.role,
          wasEnrolled: !!target.totp.enrolledAt,
        }),
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
