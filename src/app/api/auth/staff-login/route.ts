// POST /api/auth/staff-login
//
// Email-keyed login for staff (SUPER_ADMIN / MAKER / CHECKER / VIEWER).
// Mirrors /api/auth/login's auth lifecycle (rate-limit, password
// compare, 2FA gate, Supabase Auth sync, sb-* cookie issuance,
// audit-log row) but:
//
//   - Accepts `login` as an email only, case-insensitive lookup.
//   - Skips the investor-code regex entirely.
//   - Refuses any user whose role is not in STAFF_ROLES — investors
//     who somehow learn the URL get a generic 401, never a session.
//   - Uses rate-limit realm "STAFF" so a hot admin login doesn't
//     poison investor counters and vice versa.
//
// The original /api/auth/login route is intentionally NOT modified —
// the investor-code path stays byte-identical to before. Two routes
// share the same Supabase + 2FA + rate-limit primitives, but no shared
// branching.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { normalizeLoginInput, validateStaffEmail } from "@/lib/login-input";
import {
  getRequestIp,
  isRateLimited,
  recordLoginAttempt,
} from "@/lib/rate-limit";
import { STAFF_ROLES } from "@/lib/roles";
import { verifyTotpCode } from "@/lib/totp";
import { currentAdmin2faState } from "@/lib/admin-2fa";

export async function POST(req: NextRequest) {
  const { login, password, totpCode } = await req.json();

  if (!login?.trim() || !password) {
    return NextResponse.json(
      { error: "Please provide login credentials" },
      { status: 400 },
    );
  }

  // Normalize: trim + strip control / zero-width chars (no uppercase).
  // Then enforce email shape — if the input doesn't look like an email
  // we refuse early with a generic message, no DB lookup.
  const normalized = normalizeLoginInput(login as string, "STAFF");
  const emailCheck = validateStaffEmail(normalized);
  if (!emailCheck.ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const emailLower = emailCheck.email;

  const ipAddress = getRequestIp(req);
  const rateKey = {
    identifier: emailLower,
    ipAddress,
    realm: "STAFF" as const,
  };

  // 0. Rate-limit gate before any DB lookup
  const limit = await isRateLimited(rateKey);
  if (limit.limited) {
    return NextResponse.json(
      {
        error: `Too many failed attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  // 1. Find user by email (case-insensitive, since stored emails may
  // be mixed case). The Prisma `mode: "insensitive"` is Postgres-only
  // and is the standard idiom in this codebase.
  let user: Awaited<ReturnType<typeof prisma.user.findFirst>> | null;
  try {
    user = await prisma.user.findFirst({
      where: {
        email: { equals: emailLower, mode: "insensitive" },
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 },
    );
  }
  if (!user) {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // 2. Refuse non-staff. We deliberately do NOT leak that the email
  // matches an investor account — the response is identical to
  // "user not found".
  if (!STAFF_ROLES.includes(user.role)) {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // 3. Account lock + status checks (mirror /api/auth/login)
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json(
      { error: "Account is temporarily locked. Please try again later." },
      { status: 401 },
    );
  }
  if (
    user.status === "SUSPENDED" ||
    user.status === "CLOSED" ||
    user.status === "DEACTIVATED" ||
    user.status === "LOCKED"
  ) {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json(
      { error: "Account is not active. Please contact a Super Admin." },
      { status: 401 },
    );
  }

  // 4. Password
  const isValid = await compare(password, user.passwordHash);
  if (!isValid) {
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: { increment: 1 },
          ...(user.failedLoginCount >= 4
            ? { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) }
            : {}),
        },
      }),
      recordLoginAttempt({ ...rateKey, success: false }),
    ]);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // 5. Phase-9 admin 2FA gate (identical semantics to /api/auth/login).
  let twoFactorWarning: { deadline: string; daysRemaining: number } | null = null;
  const totp = await prisma.userTotp.findUnique({
    where: { userId: user.id },
    select: { secret: true, enrolledAt: true, lastUsedAt: true, id: true },
  });

  if (totp?.enrolledAt) {
    const code = typeof totpCode === "string" ? totpCode : null;
    if (!code) {
      // Two-step login normal state — not an audit failure.
      return NextResponse.json(
        {
          requires2fa: true,
          error: "Enter the 6-digit code from your authenticator app.",
        },
        { status: 401 },
      );
    }
    if (!(await verifyTotpCode(totp.secret, code))) {
      await recordLoginAttempt({ ...rateKey, success: false });
      return NextResponse.json(
        {
          requires2fa: true,
          error: "Invalid or expired 2FA code. Try again.",
        },
        { status: 401 },
      );
    }
    await prisma.userTotp.update({
      where: { id: totp.id },
      data: { lastUsedAt: new Date() },
    });
  } else {
    const state = currentAdmin2faState();
    if (state.status === "enforce") {
      await recordLoginAttempt({ ...rateKey, success: false });
      return NextResponse.json(
        {
          error:
            "Two-factor authentication is required for admin accounts. Contact a Super Admin to assist with enrollment.",
          enrollmentOverdue: true,
        },
        { status: 401 },
      );
    }
    if (state.status === "grace") {
      twoFactorWarning = {
        deadline: state.deadline.toISOString(),
        daysRemaining: state.daysRemaining,
      };
    }
  }

  // 6. Supabase Auth sync (mirror /api/auth/login). Staff users have
  // no investor record, so investorId/investorCode in the metadata
  // are intentionally omitted.
  const userMeta = {
    prismaUserId: user.id,
    role: user.role,
    status: user.status,
    name: user.fullName ?? user.email ?? "Admin",
    tier: "INVESTOR" as const, // staff aren't a separate auth tier — only PROSPECT vs INVESTOR matters in middleware
  };

  // Use stored email for Supabase Auth; fall back to a deterministic
  // internal address for staff who somehow have no email (shouldn't
  // happen for staff, but defensive).
  const authEmail = user.email ?? `${user.id}@ekush.internal`;

  let supabaseUserId = user.supabaseId;
  if (!supabaseUserId) {
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: userMeta,
      });
    if (createErr) {
      if (createErr.message?.includes("already been registered")) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existing = existingUsers?.users?.find((u) => u.email === authEmail);
        if (existing) {
          supabaseUserId = existing.id;
          await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
            password,
            user_metadata: userMeta,
          });
          await prisma.user.update({
            where: { id: user.id },
            data: { supabaseId: supabaseUserId },
          });
        } else {
          return NextResponse.json(
            { error: "Authentication failed. Please try again." },
            { status: 500 },
          );
        }
      } else {
        return NextResponse.json(
          { error: "Authentication failed. Please try again." },
          { status: 500 },
        );
      }
    } else {
      supabaseUserId = created.user.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { supabaseId: supabaseUserId },
      });
    }
  } else {
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
      email: authEmail,
      password,
      user_metadata: userMeta,
    });
    if (updateErr) {
      // Non-fatal — log and continue, the cookie sign-in below will
      // surface a more useful error if the auth user is truly broken.
      // eslint-disable-next-line no-console
      console.error("Supabase updateUser error:", updateErr.message);
    }
  }

  // 7. Sign in to set sb-* cookies
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });
  if (signInError) {
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 },
    );
  }

  // 8. Bookkeeping
  await Promise.all([
    prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    }),
    recordLoginAttempt({ ...rateKey, success: true }),
  ]);

  return NextResponse.json({
    success: true,
    role: user.role,
    redirect: "/admin/dashboard",
    twoFactorWarning,
  });
}
