// /api/prospects/me
//
//   GET    — return the authenticated prospect's profile
//   PATCH  — update email / opt-out marketing
//   DELETE — soft-delete the prospect (sets deletedAt). Hard-delete is
//            admin-only via /api/admin/prospects/[id].
//
// All methods require an authenticated PROSPECT-tier session. Investor
// sessions get 403 — they have their own /api/profile endpoint.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isProspectsEnabled, disabledResponse } from "@/lib/feature-flags";

async function requireProspect() {
  const session = await getSession();
  if (!session?.user) return { ok: false as const, status: 401, error: "Not authenticated" };
  if (session.user.tier !== "PROSPECT") {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  if (!session.user.prospectId) {
    return { ok: false as const, status: 401, error: "Session missing prospect identity" };
  }
  return { ok: true as const, prospectId: session.user.prospectId };
}

export async function GET() {
  if (!isProspectsEnabled()) return disabledResponse();
  const guard = await requireProspect();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const prospect = await prisma.prospect.findUnique({
    where: { id: guard.prospectId },
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      interest: true,
      source: true,
      marketingConsent: true,
      marketingConsentAt: true,
      kycSubmitted: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
  if (!prospect) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  return NextResponse.json({ prospect });
}

export async function PATCH(req: NextRequest) {
  if (!isProspectsEnabled()) return disabledResponse();
  const guard = await requireProspect();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Only a small allowlist of fields is editable from /me. Phone changes
  // require re-OTP and live in a separate endpoint we'll add later.
  const data: {
    email?: string | null;
    marketingConsent?: boolean;
    marketingConsentAt?: Date | null;
  } = {};

  if ("email" in body) {
    const raw = (body as Record<string, unknown>).email;
    if (raw === null || raw === "") {
      data.email = null;
    } else if (typeof raw === "string") {
      const e = raw.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 254) {
        return NextResponse.json({ error: "Email format is invalid." }, { status: 400 });
      }
      data.email = e;
    }
  }

  if ("marketingConsent" in body) {
    const raw = (body as Record<string, unknown>).marketingConsent;
    if (typeof raw !== "boolean") {
      return NextResponse.json(
        { error: "marketingConsent must be true or false." },
        { status: 400 },
      );
    }
    data.marketingConsent = raw;
    data.marketingConsentAt = raw ? new Date() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No editable fields provided." }, { status: 400 });
  }

  const updated = await prisma.prospect.update({
    where: { id: guard.prospectId },
    data,
    select: {
      id: true,
      email: true,
      marketingConsent: true,
      marketingConsentAt: true,
    },
  });

  return NextResponse.json({ prospect: updated });
}

export async function DELETE() {
  if (!isProspectsEnabled()) return disabledResponse();
  const guard = await requireProspect();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  // Soft-delete: mark deletedAt and revoke the Supabase Auth session.
  // The 30-day purge cron (added in Phase 8 alongside the upload cron)
  // will hard-delete rows past their grace window.
  const prospect = await prisma.prospect.update({
    where: { id: guard.prospectId },
    data: { deletedAt: new Date() },
    select: { supabaseId: true },
  });

  if (prospect.supabaseId) {
    // Disable the auth user immediately so the existing session is
    // unusable on next request. We don't hard-delete the auth row yet
    // — the purge cron handles that after 30 days so a restore-window
    // request from the user can still re-link.
    await supabaseAdmin.auth.admin
      .updateUserById(prospect.supabaseId, {
        ban_duration: "8760h", // 1 year — purge cron will hard-delete first
      })
      .catch(() => null);
  }

  return NextResponse.json({ success: true });
}
