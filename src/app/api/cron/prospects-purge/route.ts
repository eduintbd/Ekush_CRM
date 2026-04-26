// GET /api/cron/prospects-purge
//
// Daily Vercel Cron entry point that sweeps the Phase-1 ancillary
// tables. The job is idempotent — running it multiple times in a day
// just deletes nothing past the first call. Auth follows the same
// pattern as /api/cron/notifications: Vercel attaches
// `Authorization: Bearer $CRON_SECRET`; staff can invoke manually
// from an authenticated session.
//
// What gets purged:
//   - Prospect rows whose deletedAt is older than 30 days (the brief's
//     restore window)
//   - LoginAttempt rows older than 24 hours (rate-limit table doesn't
//     need to grow forever)
//   - OtpCode rows past expiresAt + 1 day (small grace so a verify
//     attempt can still surface "code expired" cleanly)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { STAFF_ROLES } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROSPECT_PURGE_DAYS = 30;
const LOGIN_ATTEMPT_RETENTION_HOURS = 24;
const OTP_GRACE_HOURS = 24;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const isCron = Boolean(secret) && auth === `Bearer ${secret}`;

  if (!isCron) {
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !STAFF_ROLES.includes(role ?? "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = Date.now();
  const prospectCutoff = new Date(
    now - PROSPECT_PURGE_DAYS * 24 * 60 * 60 * 1000,
  );
  const loginAttemptCutoff = new Date(
    now - LOGIN_ATTEMPT_RETENTION_HOURS * 60 * 60 * 1000,
  );
  const otpCutoff = new Date(now - OTP_GRACE_HOURS * 60 * 60 * 1000);

  // 1. Hard-delete soft-deleted prospects past their grace window.
  // We need the supabaseId beforehand so we can also delete their
  // auth.users row — Supabase Admin API doesn't cascade from Prisma.
  const expiringProspects = await prisma.prospect.findMany({
    where: {
      deletedAt: { lt: prospectCutoff, not: null },
    },
    select: { id: true, supabaseId: true },
  });

  let prospectsDeleted = 0;
  for (const p of expiringProspects) {
    try {
      // Delete the DB row first so a rerun doesn't try to delete the
      // auth user twice if the second leg fails.
      await prisma.prospect.delete({ where: { id: p.id } });
      prospectsDeleted += 1;
      if (p.supabaseId) {
        await supabaseAdmin.auth.admin
          .deleteUser(p.supabaseId)
          .catch(() => null);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[cron/prospects-purge] failed to purge prospect ${p.id}:`,
        err,
      );
    }
  }

  // 2. Trim LoginAttempt audit rows. Single deleteMany — no per-row
  // logic needed.
  const loginAttempts = await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: loginAttemptCutoff } },
  });

  // 3. Expire stale OTPs (consumed or not — we keep nothing).
  const otpCodes = await prisma.otpCode.deleteMany({
    where: { expiresAt: { lt: otpCutoff } },
  });

  return NextResponse.json({
    success: true,
    cutoffs: {
      prospects: prospectCutoff.toISOString(),
      loginAttempts: loginAttemptCutoff.toISOString(),
      otpCodes: otpCutoff.toISOString(),
    },
    deleted: {
      prospects: prospectsDeleted,
      prospectsConsidered: expiringProspects.length,
      loginAttempts: loginAttempts.count,
      otpCodes: otpCodes.count,
    },
  });
}
