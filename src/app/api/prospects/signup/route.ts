// POST /api/prospects/signup
//
// Step-1 of the WhatsApp signup flow. Accepts the lightweight form
// payload, creates a Prospect row in `phoneVerified=false` state with a
// bcrypt password hash, and dispatches an SMS OTP. The caller (UI) must
// then collect the 6-digit code and POST to /api/prospects/otp/verify
// to finalize and sign in.
//
// Idempotent on phone collisions:
//   - phone exists, verified  → 409 "phone already registered"
//   - phone exists, unverified → reuse the row, resend OTP
//   - phone unknown            → create row, send OTP

import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isProspectsEnabled, disabledResponse } from "@/lib/feature-flags";
import {
  normalizeLoginInput,
  validateProspectPhone,
} from "@/lib/login-input";
import { issueOtp, requestOtpResend } from "@/lib/prospects";
import { validatePassword } from "@/lib/auth-tokens";

const VALID_INTERESTS = new Set([
  "mutual_funds",
  "sip",
  "cip",
  "fund_return",
  "exploring",
  "other",
]);

export async function POST(req: NextRequest) {
  if (!isProspectsEnabled()) return disabledResponse();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { name, phone, email, password, interest, source, marketingConsent } = body as Record<
    string,
    unknown
  >;

  // ─ Phone ─────────────────────────────────────────────────────────
  const phoneNormalized = normalizeLoginInput(String(phone ?? ""), "PROSPECT");
  const phoneCheck = validateProspectPhone(phoneNormalized);
  if (!phoneCheck.ok) {
    return NextResponse.json({ error: phoneCheck.reason }, { status: 400 });
  }
  const phoneCanonical = phoneCheck.phone;

  // ─ Name ──────────────────────────────────────────────────────────
  if (typeof name !== "string") {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const nameTrimmed = name.trim();
  if (nameTrimmed.length < 2 || nameTrimmed.length > 80) {
    return NextResponse.json(
      { error: "Name must be 2–80 characters." },
      { status: 400 },
    );
  }
  // Letters / spaces / dots / hyphens only. Allows BD names with
  // dots and hyphens but rejects digits and most punctuation.
  if (!/^[\p{L} .\-']+$/u.test(nameTrimmed)) {
    return NextResponse.json(
      { error: "Name may only contain letters, spaces, dots, and hyphens." },
      { status: 400 },
    );
  }

  // ─ Email (optional) ──────────────────────────────────────────────
  let emailNormalized: string | null = null;
  if (typeof email === "string" && email.trim().length > 0) {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 254) {
      return NextResponse.json(
        { error: "Email format is invalid." },
        { status: 400 },
      );
    }
    emailNormalized = e;
  }

  // ─ Password ──────────────────────────────────────────────────────
  if (typeof password !== "string") {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }
  const pwdCheck = validatePassword(password);
  if (!pwdCheck.ok) {
    return NextResponse.json({ error: pwdCheck.reason }, { status: 400 });
  }

  // ─ Interest ──────────────────────────────────────────────────────
  if (typeof interest !== "string" || !VALID_INTERESTS.has(interest)) {
    return NextResponse.json(
      { error: "Please select a valid area of interest." },
      { status: 400 },
    );
  }

  // ─ Marketing consent ─────────────────────────────────────────────
  if (marketingConsent !== true) {
    return NextResponse.json(
      { error: "Marketing consent is required to receive fund updates." },
      { status: 400 },
    );
  }

  // ─ Optional source (free-text attribution) ───────────────────────
  const sourceNormalized =
    typeof source === "string" && source.trim().length > 0 && source.length <= 64
      ? source.trim()
      : null;

  // ─ Existing-phone handling ───────────────────────────────────────
  const existing = await prisma.prospect.findUnique({
    where: { phone: phoneCanonical },
  });

  if (existing && !existing.deletedAt) {
    if (existing.phoneVerified) {
      return NextResponse.json(
        { error: "This phone number is already registered. Please log in instead." },
        { status: 409 },
      );
    }
    // Unverified prospect — refresh form data + resend OTP. We do NOT
    // overwrite the password unless one was supplied, but this route
    // requires password, so we always update.
    const passwordHash = await hash(password, 10);
    await prisma.prospect.update({
      where: { id: existing.id },
      data: {
        name: nameTrimmed,
        email: emailNormalized,
        passwordHash,
        interest,
        source: sourceNormalized ?? existing.source,
        marketingConsent: true,
        marketingConsentAt: new Date(),
      },
    });
    const resend = await requestOtpResend({ phone: phoneCanonical });
    if (!resend.ok) {
      // Cooldown / cap-hit — surface to the UI so user understands.
      return NextResponse.json(
        { error: resend.reason, retryAfterSeconds: resend.retryAfterSeconds ?? null },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { success: true, prospectId: existing.id, phone: phoneCanonical, resent: true },
    );
  }

  // ─ Create new (or revive soft-deleted) prospect ──────────────────
  const passwordHash = await hash(password, 10);
  const prospect = existing && existing.deletedAt
    ? await prisma.prospect.update({
        where: { id: existing.id },
        data: {
          name: nameTrimmed,
          email: emailNormalized,
          passwordHash,
          interest,
          source: sourceNormalized,
          marketingConsent: true,
          marketingConsentAt: new Date(),
          deletedAt: null,
          phoneVerified: false,
          kycSubmitted: false,
          supabaseId: null,
        },
      })
    : await prisma.prospect.create({
        data: {
          phone: phoneCanonical,
          name: nameTrimmed,
          email: emailNormalized,
          passwordHash,
          interest,
          source: sourceNormalized,
          marketingConsent: true,
          marketingConsentAt: new Date(),
        },
      });

  const sent = await issueOtp({ phone: phoneCanonical });
  if (!sent.ok) {
    return NextResponse.json({ error: sent.reason }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    prospectId: prospect.id,
    phone: phoneCanonical,
  });
}
