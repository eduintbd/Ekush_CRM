// POST /api/prospects/otp/verify
//
// Final step of the WhatsApp signup flow. The caller already POST'd to
// /api/prospects/signup which created an unverified Prospect row + sent
// an OTP. Here we:
//   1. Verify the 6-digit code (consumes it on success)
//   2. Mark prospect.phoneVerified = true
//   3. Create (or refresh) the Supabase Auth user with synthetic email
//      "<phone-with-cc>@prospect.ekush.local" and tier:"PROSPECT"
//   4. Sign the user in via Supabase signInWithPassword — sets the
//      sb-* cookies that Phase 4's middleware uses to allow access to
//      the prospect dashboard
//
// We require the password again so we can hand it to Supabase Auth at
// provision-time (we never store the plaintext, only the bcrypt hash on
// the Prospect row). Sending it back over HTTPS to verify is acceptable
// because the same payload also created the row five minutes earlier.

import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import { isProspectsEnabled, disabledResponse } from "@/lib/feature-flags";
import {
  normalizeLoginInput,
  validateProspectPhone,
} from "@/lib/login-input";
import {
  ensureSupabaseProspectUser,
  prospectAuthEmail,
  verifyOtp,
} from "@/lib/prospects";
import { getRequestIp, isRateLimited, recordLoginAttempt } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!isProspectsEnabled()) return disabledResponse();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { phone, code, password } = body as Record<string, unknown>;

  const phoneNormalized = normalizeLoginInput(String(phone ?? ""), "PROSPECT");
  const phoneCheck = validateProspectPhone(phoneNormalized);
  if (!phoneCheck.ok) {
    return NextResponse.json({ error: phoneCheck.reason }, { status: 400 });
  }
  const phoneCanonical = phoneCheck.phone;

  // Rate-limit verify attempts so a brute-forcer cannot exhaust the
  // 6-digit space by flooding this endpoint. The OTP row also has its
  // own attempts counter (max 5 wrong codes per cycle), so we have
  // belt-and-braces protection.
  const ipAddress = getRequestIp(req);
  const rateKey = {
    identifier: phoneCanonical,
    ipAddress,
    realm: "PROSPECT" as const,
  };
  const limit = await isRateLimited(rateKey);
  if (limit.limited) {
    return NextResponse.json(
      {
        error: `Too many verification attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (typeof code !== "string") {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 10) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const result = await verifyOtp({ phone: phoneCanonical, code });
  if (!result.ok) {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json({ error: result.reason }, { status: 401 });
  }

  // OTP verified — promote the prospect.
  const prospect = await prisma.prospect.findUnique({
    where: { phone: phoneCanonical },
  });
  if (!prospect || prospect.deletedAt) {
    return NextResponse.json(
      { error: "Account not found. Please sign up again." },
      { status: 404 },
    );
  }

  // Re-check the password against the stored hash before we hand it
  // to Supabase Auth — this also catches a "verified-then-changed-pwd"
  // race during signup.
  const pwdMatches = await compare(password, prospect.passwordHash);
  if (!pwdMatches) {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const provisioned = await ensureSupabaseProspectUser({
    prospectId: prospect.id,
    phone: phoneCanonical,
    password,
    name: prospect.name,
    email: prospect.email,
  });
  if (!provisioned.ok) {
    return NextResponse.json(
      { error: "Could not provision your account. Please try again." },
      { status: 500 },
    );
  }

  await prisma.prospect.update({
    where: { id: prospect.id },
    data: {
      phoneVerified: true,
      supabaseId: provisioned.supabaseId,
      lastLoginAt: new Date(),
    },
  });

  // Sign in via Supabase to set the sb-* cookies on the response.
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
    email: prospectAuthEmail(phoneCanonical),
    password,
  });
  if (signInError) {
    return NextResponse.json(
      { error: "Verification succeeded but sign-in failed. Please log in." },
      { status: 500 },
    );
  }

  await recordLoginAttempt({ ...rateKey, success: true });
  return NextResponse.json({
    success: true,
    prospectId: prospect.id,
    redirect: "/prospect/dashboard",
  });
}
