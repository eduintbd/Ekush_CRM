// POST /api/prospects/otp/send
//
// Resend the active OTP for a phone. Enforces the cooldown + max-resend
// caps from the brief (60s cooldown, max 3 resends per cycle).
//
// The route is anonymous-callable — no session required, since the user
// is mid-signup and not yet logged in. Brute-force protection is
// already provided by the rate-limit + the cooldown logic in
// requestOtpResend.

import { NextRequest, NextResponse } from "next/server";
import { isProspectsEnabled, disabledResponse } from "@/lib/feature-flags";
import {
  normalizeLoginInput,
  validateProspectPhone,
} from "@/lib/login-input";
import { requestOtpResend } from "@/lib/prospects";
import { getRequestIp, isRateLimited, recordLoginAttempt } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!isProspectsEnabled()) return disabledResponse();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { phone } = body as { phone?: unknown };

  const phoneNormalized = normalizeLoginInput(String(phone ?? ""), "PROSPECT");
  const phoneCheck = validateProspectPhone(phoneNormalized);
  if (!phoneCheck.ok) {
    return NextResponse.json({ error: phoneCheck.reason }, { status: 400 });
  }

  // Rate-limit OTP resend the same way as login attempts: 5 per
  // (phone, ip) per 15 min. Prevents an attacker from burning through
  // SMS budget via flood-resend.
  const ipAddress = getRequestIp(req);
  const rateKey = {
    identifier: phoneCheck.phone,
    ipAddress,
    realm: "PROSPECT" as const,
  };
  const limit = await isRateLimited(rateKey);
  if (limit.limited) {
    return NextResponse.json(
      {
        error: `Too many resend attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const result = await requestOtpResend({ phone: phoneCheck.phone });
  if (!result.ok) {
    await recordLoginAttempt({ ...rateKey, success: false });
    return NextResponse.json(
      { error: result.reason, retryAfterSeconds: result.retryAfterSeconds ?? null },
      { status: 429 },
    );
  }
  return NextResponse.json({ success: true, phone: phoneCheck.phone });
}
