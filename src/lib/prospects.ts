// Helpers shared by every prospect-tier route: synthetic Supabase email,
// OTP lifecycle (create + verify + cooldown), and Supabase Auth sign-in.
//
// Prospects authenticate inside the same Supabase Auth realm as
// investors, but keyed on a synthetic email "<phone>@prospect.ekush.local"
// because Supabase Auth requires an email and we do not want a real
// email on prospect accounts (some prospects sign up without one).
// The `tier` claim on user_metadata distinguishes the realms.

import { hash, compare } from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSmsProvider } from "@/lib/sms";

// Synthetic-email pattern. The local part is the canonical phone (digits
// only, including "880" country code if it was provided), so two
// prospects can never collide and the address is reproducible from the
// phone alone. The domain is reserved-for-internal-use; real SMTP delivery
// is never attempted to it.
const PROSPECT_EMAIL_DOMAIN = "prospect.ekush.local";

export function prospectAuthEmail(phoneNational: string): string {
  // Always include "880" in the synthetic address so that an investor
  // who later flips to investor tier doesn't collide with an existing
  // prospect synthetic. Phone arrives as the validator's 10/11-digit
  // canonical form (no country code).
  const digits = phoneNational.replace(/\D+/g, "");
  const withCc = digits.startsWith("880") ? digits : `880${digits}`;
  return `${withCc}@${PROSPECT_EMAIL_DOMAIN}`;
}

// ─── OTP lifecycle ───────────────────────────────────────────────────
// Codes are 6-digit numeric, hashed with bcrypt before storage. Plain
// text never lands in the DB — only in the SMS body.

export const OTP_TTL_MS = 5 * 60 * 1000;            // 5 minutes
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;    // 60 seconds
export const OTP_MAX_RESENDS = 3;
export const OTP_MAX_VERIFY_ATTEMPTS = 5;

export type OtpPurpose = "PROSPECT_SIGNUP";

function generateNumericOtp(): string {
  // crypto.randomInt is unbiased; range [0, 1_000_000) zero-padded.
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// Creates a fresh OTP row + sends the SMS. Use this on the very first
// signup request. For resends call `requestOtpResend` instead.
export async function issueOtp(params: {
  phone: string;
  purpose?: OtpPurpose;
}): Promise<{ ok: true } | { ok: false; reason: string; retryAfterSeconds?: number }> {
  const purpose: OtpPurpose = params.purpose ?? "PROSPECT_SIGNUP";

  const code = generateNumericOtp();
  const codeHash = await hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otpCode.create({
    data: {
      phone: params.phone,
      codeHash,
      purpose,
      expiresAt,
    },
  });

  const provider = getSmsProvider();
  const smsResult = await provider.send({
    to: params.phone,
    body: `Your Ekush WML verification code is ${code}. It expires in 5 minutes. Do not share this code with anyone.`,
  });
  if (!smsResult.ok) {
    return { ok: false, reason: "Could not send SMS. Please try again." };
  }
  return { ok: true };
}

// Resend an existing OTP if cooldown elapsed and resend cap not hit.
// We DO NOT rotate the code on resend — that would let an attacker who
// stole the first SMS still verify against the second, but more
// importantly it confuses end users who may receive two messages.
// Instead we send the SAME code again. If the OTP has expired, the
// caller should treat that as "start over" and call `issueOtp` fresh.
//
// Returns the issued result so the route can surface a 429 cleanly.
export async function requestOtpResend(params: {
  phone: string;
  purpose?: OtpPurpose;
}): Promise<{ ok: true } | { ok: false; reason: string; retryAfterSeconds?: number }> {
  const purpose: OtpPurpose = params.purpose ?? "PROSPECT_SIGNUP";

  const latest = await prisma.otpCode.findFirst({
    where: { phone: params.phone, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!latest || latest.expiresAt.getTime() < Date.now()) {
    // No live OTP — start a brand new cycle.
    return issueOtp(params);
  }

  if (latest.resendCount >= OTP_MAX_RESENDS) {
    return {
      ok: false,
      reason: "Maximum resend attempts reached. Please start over.",
    };
  }

  const sinceLast = Date.now() - latest.createdAt.getTime();
  if (sinceLast < OTP_RESEND_COOLDOWN_MS) {
    const waitMs = OTP_RESEND_COOLDOWN_MS - sinceLast;
    return {
      ok: false,
      reason: `Please wait ${Math.ceil(waitMs / 1000)}s before resending.`,
      retryAfterSeconds: Math.ceil(waitMs / 1000),
    };
  }

  // Same code, same hash — we cannot decrypt the bcrypt hash, so we
  // have to issue a NEW code and replace the row. This is the
  // honest-and-simple choice: rotate-on-resend.
  const code = generateNumericOtp();
  const codeHash = await hash(code, 10);

  await prisma.otpCode.update({
    where: { id: latest.id },
    data: {
      codeHash,
      resendCount: { increment: 1 },
      // Reset expiry to 5 minutes from this moment — the user just
      // engaged, so the timer restarts.
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      // Don't touch attempts — verify-attempt budget is per-cycle, not
      // per-resend.
    },
  });

  const provider = getSmsProvider();
  const smsResult = await provider.send({
    to: params.phone,
    body: `Your Ekush WML verification code is ${code}. It expires in 5 minutes. Do not share this code with anyone.`,
  });
  if (!smsResult.ok) {
    return { ok: false, reason: "Could not send SMS. Please try again." };
  }
  return { ok: true };
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function verifyOtp(params: {
  phone: string;
  code: string;
  purpose?: OtpPurpose;
}): Promise<OtpVerifyResult> {
  const purpose: OtpPurpose = params.purpose ?? "PROSPECT_SIGNUP";

  if (!/^[0-9]{6}$/.test(params.code)) {
    return { ok: false, reason: "Code must be 6 digits." };
  }

  const row = await prisma.otpCode.findFirst({
    where: { phone: params.phone, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!row) return { ok: false, reason: "No active code. Please request a new one." };
  if (row.expiresAt.getTime() < Date.now())
    return { ok: false, reason: "Code expired. Please request a new one." };
  if (row.attempts >= OTP_MAX_VERIFY_ATTEMPTS)
    return { ok: false, reason: "Too many failed attempts. Please request a new code." };

  const matches = await compare(params.code, row.codeHash);
  if (!matches) {
    await prisma.otpCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "Incorrect code." };
  }

  await prisma.otpCode.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}

// ─── Supabase Auth helpers for the prospect realm ────────────────────
//
// `ensureSupabaseProspectUser` creates (or updates) the auth.users row
// for a prospect. Idempotent — safe to call on every login.

export async function ensureSupabaseProspectUser(params: {
  prospectId: string;
  phone: string;        // canonical 10/11-digit form
  password: string;
  name: string;
  email?: string | null;
}): Promise<{ ok: true; supabaseId: string } | { ok: false; error: string }> {
  const authEmail = prospectAuthEmail(params.phone);
  const userMeta = {
    tier: "PROSPECT",
    prospectId: params.prospectId,
    phone: params.phone,
    name: params.name,
    email: params.email ?? null,
    role: "PROSPECT",
    status: "ACTIVE",
  };

  const { data: created, error: createErr } =
    await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: params.password,
      email_confirm: true,
      user_metadata: userMeta,
    });

  if (!createErr && created?.user) {
    return { ok: true, supabaseId: created.user.id };
  }

  // If the user already exists, look them up and refresh password +
  // metadata so subsequent sign-ins succeed.
  if (createErr?.message?.includes("already been registered")) {
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === authEmail);
    if (!existing) return { ok: false, error: "Could not locate auth account." };

    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: params.password,
      user_metadata: userMeta,
    });
    return { ok: true, supabaseId: existing.id };
  }

  return { ok: false, error: createErr?.message ?? "Failed to provision auth account." };
}
