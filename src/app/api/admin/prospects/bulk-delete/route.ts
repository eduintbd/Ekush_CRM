// POST /api/admin/prospects/bulk-delete
//
// Batch counterpart to /api/admin/prospects/[id]. Body:
//   { ids: string[], hard?: boolean }
//
// Soft-delete is unrestricted within STAFF_ROLES. Hard-delete is
// SUPER_ADMIN-only; mirrors the per-row endpoint's gate.
//
// We process in a single transaction so the AuditLog entries and the
// row mutations land atomically — a partial bulk delete is the worst
// outcome to debug, so we rather fail the whole batch than half-finish.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES, SUPER_ROLES } from "@/lib/roles";
import { isProspectsEnabled } from "@/lib/feature-flags";
import { getRequestIp } from "@/lib/rate-limit";

const MAX_BATCH = 200;

export async function POST(req: NextRequest) {
  if (!isProspectsEnabled()) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const session = await getSession();
  const role = session?.user?.role;
  if (!session || !STAFF_ROLES.includes(role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { ids, hard } = body as { ids?: unknown; hard?: unknown };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No prospects selected." }, { status: 400 });
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Cannot delete more than ${MAX_BATCH} prospects at once.` },
      { status: 400 },
    );
  }
  const idStrings = ids.filter((v): v is string => typeof v === "string");
  if (idStrings.length === 0) {
    return NextResponse.json({ error: "No valid prospect ids." }, { status: 400 });
  }

  const isHard = hard === true;
  if (isHard && !SUPER_ROLES.includes(role ?? "")) {
    return NextResponse.json(
      { error: "Hard delete is restricted to Super Admins." },
      { status: 403 },
    );
  }

  const prospects = await prisma.prospect.findMany({
    where: { id: { in: idStrings } },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      supabaseId: true,
      kycSubmitted: true,
      deletedAt: true,
      linkedInvestor: { select: { id: true, investorCode: true } },
    },
  });
  if (prospects.length === 0) {
    return NextResponse.json({ error: "No matching prospects." }, { status: 404 });
  }

  // Same defensive rule as the single-delete route: never hard-delete
  // a prospect that has converted into an active investor.
  if (isHard) {
    const blocked = prospects.filter((p) => p.linkedInvestor);
    if (blocked.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot hard-delete ${blocked.length} prospect(s) that have already converted to investors. Soft-delete those, or unlink the investor first.`,
        },
        { status: 409 },
      );
    }
  }

  const ipAddress = getRequestIp(req);

  // Build the transaction in two halves: one AuditLog row per prospect,
  // then either a single deleteMany (hard) or a single updateMany (soft).
  const auditWrites = prospects.map((p) =>
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        userRole: role,
        action: isHard
          ? "PROSPECT_HARD_DELETE"
          : p.deletedAt
            ? "PROSPECT_SOFT_DELETE_REPEAT"
            : "PROSPECT_SOFT_DELETE",
        entity: "Prospect",
        entityId: p.id,
        oldValue: JSON.stringify({
          name: p.name,
          phone: p.phone,
          email: p.email,
          kycSubmitted: p.kycSubmitted,
          linkedInvestorCode: p.linkedInvestor?.investorCode ?? null,
        }),
        ipAddress,
        metadata: { bulk: true, batchSize: prospects.length },
      },
    }),
  );

  if (isHard) {
    await prisma.$transaction([
      ...auditWrites,
      prisma.prospect.deleteMany({ where: { id: { in: prospects.map((p) => p.id) } } }),
    ]);
  } else {
    await prisma.$transaction([
      ...auditWrites,
      prisma.prospect.updateMany({
        where: { id: { in: prospects.map((p) => p.id) } },
        data: { deletedAt: new Date() },
      }),
    ]);
  }

  // Best-effort: revoke or remove auth users in parallel after the DB
  // transaction has committed.
  await Promise.all(
    prospects.map((p) => {
      if (!p.supabaseId) return null;
      if (isHard) {
        return supabaseAdmin.auth.admin.deleteUser(p.supabaseId).catch(() => null);
      }
      return supabaseAdmin.auth.admin
        .updateUserById(p.supabaseId, { ban_duration: "8760h" })
        .catch(() => null);
    }),
  );

  return NextResponse.json({
    success: true,
    deleted: prospects.length,
    hard: isHard,
  });
}
