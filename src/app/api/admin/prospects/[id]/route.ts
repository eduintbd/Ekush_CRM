// DELETE /api/admin/prospects/[id]
//
// Default: soft delete — sets `deletedAt` and bans the matching
// Supabase Auth user so any remaining session is unusable. Soft-deleted
// rows survive 30 days for restore, then the cron purges them.
//
// `?hard=1` — permanent delete from the DB. Restricted to SUPER_ADMIN
// per the brief's "second confirmation" requirement; the UI surfaces
// this via an explicit checkbox in the confirm modal.
//
// Both paths write an AuditLog entry capturing snapshot fields so the
// trail survives even after the prospect row is gone.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES, SUPER_ROLES } from "@/lib/roles";
import { isProspectsEnabled } from "@/lib/feature-flags";
import { getRequestIp } from "@/lib/rate-limit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isProspectsEnabled()) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const session = await getSession();
  const role = session?.user?.role;
  if (!session || !STAFF_ROLES.includes(role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const hard = req.nextUrl.searchParams.get("hard") === "1";
  if (hard && !SUPER_ROLES.includes(role ?? "")) {
    return NextResponse.json(
      { error: "Hard delete is restricted to Super Admins." },
      { status: 403 },
    );
  }

  const prospect = await prisma.prospect.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      supabaseId: true,
      deletedAt: true,
      kycSubmitted: true,
      linkedInvestor: { select: { id: true, investorCode: true } },
    },
  });
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  // Defensive: refuse to delete a prospect whose KYC has already been
  // approved into an active investor — the link is sacred, deleting the
  // prospect would zero out the conversion attribution and the investor
  // record's `linkedProspectId` (ON DELETE SET NULL) without any audit
  // trail visible to the investors team.
  if (prospect.linkedInvestor && hard) {
    return NextResponse.json(
      {
        error:
          "Cannot hard-delete a prospect linked to an active investor. Soft-delete instead, or unlink the investor first.",
      },
      { status: 409 },
    );
  }

  const ipAddress = getRequestIp(req);
  const auditSnapshot = {
    name: prospect.name,
    phone: prospect.phone,
    email: prospect.email,
    kycSubmitted: prospect.kycSubmitted,
    linkedInvestorCode: prospect.linkedInvestor?.investorCode ?? null,
  };

  if (hard) {
    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email ?? null,
          userRole: role,
          action: "PROSPECT_HARD_DELETE",
          entity: "Prospect",
          entityId: prospect.id,
          oldValue: JSON.stringify(auditSnapshot),
          ipAddress,
        },
      }),
      prisma.prospect.delete({ where: { id: prospect.id } }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email ?? null,
          userRole: role,
          action: prospect.deletedAt
            ? "PROSPECT_SOFT_DELETE_REPEAT"
            : "PROSPECT_SOFT_DELETE",
          entity: "Prospect",
          entityId: prospect.id,
          oldValue: JSON.stringify(auditSnapshot),
          ipAddress,
        },
      }),
      prisma.prospect.update({
        where: { id: prospect.id },
        data: { deletedAt: new Date() },
      }),
    ]);
  }

  // Best-effort: ban the auth user so a stale session can't keep
  // accessing /prospect/dashboard. We don't await failure here — the
  // delete on the DB side is the source of truth.
  if (prospect.supabaseId) {
    if (hard) {
      await supabaseAdmin.auth.admin.deleteUser(prospect.supabaseId).catch(() => null);
    } else {
      await supabaseAdmin.auth.admin
        .updateUserById(prospect.supabaseId, { ban_duration: "8760h" })
        .catch(() => null);
    }
  }

  return NextResponse.json({ success: true, hard });
}
