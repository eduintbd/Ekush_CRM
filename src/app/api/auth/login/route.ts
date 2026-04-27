import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { normalizeLoginInput, INVESTOR_CODE_RE } from "@/lib/login-input";
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
      { status: 400 }
    );
  }

  // Normalize before any DB lookup or rate-limit key. INVESTOR realm
  // strips zero-width / control / Unicode lookalike chars and uppercases.
  // The PROSPECT realm runs through its own route — this one is INVESTOR
  // only.
  const loginTrimmed = normalizeLoginInput(login as string, "INVESTOR");
  const ipAddress = getRequestIp(req);
  const rateKey = {
    identifier: loginTrimmed.toLowerCase(),
    ipAddress,
    realm: "INVESTOR" as const,
  };

  // 0. Rate-limit gate — runs before any DB join so brute-force attempts
  //    don't get a free user-existence oracle off the lookup time.
  const limit = await isRateLimited(rateKey);
  if (limit.limited) {
    return NextResponse.json(
      {
        error: `Too many failed attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  // 1. Find user in Prisma by email, phone, or investor code
  let user: Awaited<ReturnType<typeof prisma.user.findFirst>> & {
    investor?: { id: string; investorCode: string; name: string } | null;
  };

  try {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginTrimmed },
          { phone: loginTrimmed },
          { investor: { investorCode: loginTrimmed.toUpperCase() } },
        ],
      },
      include: { investor: true },
    }) as any;
  } catch {
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }

  if (!user) {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // 1b. Active investors must log in with their Investor Code matching
  // the strict regex (one uppercase letter + 1–5 digits). Email/phone
  // lookups are only allowed while the account is still PENDING (so
  // approvals staff and KYC helpers can reach new sign-ups). Admin /
  // staff users have no investor record, so this guard skips them.
  if (user.status === "ACTIVE" && user.investor) {
    const enteredUpper = loginTrimmed; // already uppercased by normalize
    if (!INVESTOR_CODE_RE.test(enteredUpper)) {
      await recordLoginAttempt({ ...rateKey, success: false });
      return NextResponse.json(
        {
          error:
            "Investor Code must be one uppercase letter followed by 1–5 digits (e.g. A00002).",
        },
        { status: 401 },
      );
    }
    if (enteredUpper !== user.investor.investorCode.toUpperCase()) {
      await recordLoginAttempt({ ...rateKey, success: false });
      return NextResponse.json(
        {
          error:
            "Active investors must log in with their Investor Code. Please enter your code (e.g. A00002) instead of an email or phone number.",
        },
        { status: 401 },
      );
    }
  }

  // 2. Check account lock
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json(
      { error: "Account is temporarily locked. Please try again later." },
      { status: 401 }
    );
  }

  // 3. Check account status
  if (
    user.status === "SUSPENDED" ||
    user.status === "CLOSED" ||
    user.status === "DEACTIVATED" ||
    user.status === "LOCKED"
  ) {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json(
      { error: "Account is not active. Please contact support." },
      { status: 401 }
    );
  }

  // 4. Verify password against bcrypt hash
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

  // 4b. Phase 9 — admin 2FA gate. Runs AFTER the password check so an
  // attacker can't probe staff identifiers via 2FA-error timing, but
  // BEFORE the Supabase sign-in so an unverified second factor never
  // mints a session cookie.
  const isStaff = STAFF_ROLES.includes(user.role);
  let twoFactorWarning: { deadline: string; daysRemaining: number } | null = null;
  if (isStaff) {
    const totp = await prisma.userTotp.findUnique({
      where: { userId: user.id },
      select: { secret: true, enrolledAt: true, lastUsedAt: true, id: true },
    });

    if (totp?.enrolledAt) {
      // Already enrolled — require the code on every login.
      const code = typeof totpCode === "string" ? totpCode : null;
      if (!code) {
        // Don't record this as a "fail" — it's a normal step in the
        // two-step login. The client will represent this state as the
        // 2FA prompt and submit again with the code.
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
      // Bump lastUsedAt so a stolen code can't be replayed within the
      // same 30s step — the next attempt would still verify against
      // the same secret but lastUsedAt's monotonic forward move means
      // the audit trail captures every accepted code uniquely.
      await prisma.userTotp.update({
        where: { id: totp.id },
        data: { lastUsedAt: new Date() },
      });
    } else {
      // Not enrolled. Grace-window state decides whether to warn or block.
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
  }

  // 5. Prepare user metadata to store in Supabase Auth
  const investor = (user as any).investor as
    | { id: string; investorCode: string; name: string }
    | null;

  const userMeta = {
    prismaUserId: user.id,
    role: user.role,
    status: user.status,
    investorId: investor?.id,
    investorCode: investor?.investorCode,
    name: investor?.name ?? "User",
  };

  // Use email for Supabase Auth; fall back to a deterministic internal address
  const authEmail = user.email ?? `${user.phone ?? user.id}@ekush.internal`;

  // 6. Sync user with Supabase Auth (create on first login, update on subsequent)
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
      // If user already exists in Supabase, try to find and link them
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
          console.error("Supabase createUser error:", createErr.message);
          return NextResponse.json(
            { error: "Authentication failed. Please try again." },
            { status: 500 }
          );
        }
      } else {
        console.error("Supabase createUser error:", createErr.message);
        return NextResponse.json(
          { error: "Authentication failed. Please try again." },
          { status: 500 }
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
    // Keep Supabase email, password, and metadata in sync
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
      email: authEmail,
      password,
      user_metadata: userMeta,
    });
    if (updateErr) {
      console.error("Supabase updateUser error:", updateErr.message);
    }
  }

  // 7. Sign in via Supabase to get a session (sets auth cookies)
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
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (signInError) {
    console.error("Supabase signIn error:", signInError.message);
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }

  // 8. Update Prisma login tracking + audit row
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
    // Phase 9: present only when the staff user is in the grace window
    // and has not yet enrolled — the dashboard banner reads this off
    // the session metadata, but the login response carries it too so
    // the client can show an immediate "X days remaining" toast.
    twoFactorWarning,
  });
}
