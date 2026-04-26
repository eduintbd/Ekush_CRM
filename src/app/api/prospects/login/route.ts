// POST /api/prospects/login
//
// Phone + password sign-in for verified prospects. Mirrors the investor
// login route (rate-limit gate, audit row, Supabase signInWithPassword)
// but resolves the user via the Prospect table, enforces phoneVerified,
// and signs in against the synthetic email.

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
} from "@/lib/prospects";
import { getRequestIp, isRateLimited, recordLoginAttempt } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!isProspectsEnabled()) return disabledResponse();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { phone, password } = body as Record<string, unknown>;

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const phoneNormalized = normalizeLoginInput(String(phone ?? ""), "PROSPECT");
  const phoneCheck = validateProspectPhone(phoneNormalized);
  if (!phoneCheck.ok) {
    return NextResponse.json({ error: phoneCheck.reason }, { status: 400 });
  }
  const phoneCanonical = phoneCheck.phone;

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
        error: `Too many failed attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const prospect = await prisma.prospect.findUnique({
    where: { phone: phoneCanonical },
  });

  if (!prospect || prospect.deletedAt) {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!prospect.phoneVerified) {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json(
      {
        error:
          "Your phone number is not verified yet. Please complete the OTP step from the signup form.",
      },
      { status: 401 },
    );
  }

  const pwdMatches = await compare(password, prospect.passwordHash);
  if (!pwdMatches) {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Refresh the Supabase Auth user (idempotent — safe on every login)
  // so password changes propagate and metadata stays current.
  const provisioned = await ensureSupabaseProspectUser({
    prospectId: prospect.id,
    phone: phoneCanonical,
    password,
    name: prospect.name,
    email: prospect.email,
  });
  if (!provisioned.ok) {
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 },
    );
  }

  if (!prospect.supabaseId) {
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { supabaseId: provisioned.supabaseId },
    });
  }

  // Sign in to set the sb-* cookies on the response.
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
      { error: "Authentication failed. Please try again." },
      { status: 500 },
    );
  }

  await Promise.all([
    prisma.prospect.update({
      where: { id: prospect.id },
      data: { lastLoginAt: new Date() },
    }),
    recordLoginAttempt({ ...rateKey, success: true }),
  ]);

  return NextResponse.json({
    success: true,
    prospectId: prospect.id,
    redirect: "/prospect/dashboard",
  });
}
