// Phase 9 — admin 2FA helpers (TOTP).
//
// Wraps otplib v13's functional API so the call sites stay
// intent-revealing and we can swap library or rotate algorithm in one
// place. v13 dropped the v12-style `authenticator` singleton in favour
// of `generateSecret`, `generateURI`, and `verify`.
//
// Verification uses the standard 30-second window with a ±1-step skew
// tolerance — Google Authenticator, Authy, Aegis, 1Password etc. all
// default to that.
//
// We never store the plaintext code; the persisted UserTotp.secret is
// a base32 string — that's what an authenticator app needs to enrol.

import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

const ISSUER = "Ekush WML Admin";
// epochTolerance is expressed in seconds. ±30s = one TOTP step on
// either side of the current step, so the effective acceptance window
// is 90s. Generous enough for slow users + clock drift; tight enough
// to limit a stolen-code replay.
const EPOCH_TOLERANCE_SECONDS = 30;

export type TotpEnrollmentBundle = {
  secret: string;
  otpauthUri: string;
  qrDataUrl: string;
};

export function generateTotpSecret(): string {
  return generateSecret();
}

// Build the otpauth URI an authenticator app expects, then render it
// as a data:image/png base64 QR code so the admin can scan it without
// any third-party service.
export async function buildEnrollmentBundle(
  secret: string,
  account: string,
): Promise<TotpEnrollmentBundle> {
  const otpauthUri = generateURI({ issuer: ISSUER, label: account, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 240,
  });
  return { secret, otpauthUri, qrDataUrl };
}

// Strict 6-digit numeric only. Trims any whitespace / dashes the user
// pasted in. Returns null if the input is malformed.
export function normalizeTotpCode(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D+/g, "");
  if (digits.length !== 6) return null;
  return digits;
}

export async function verifyTotpCode(
  secret: string,
  code: string,
): Promise<boolean> {
  const normalized = normalizeTotpCode(code);
  if (!normalized) return false;
  try {
    const result = await verify({
      secret,
      token: normalized,
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
    });
    return result.valid;
  } catch {
    return false;
  }
}
