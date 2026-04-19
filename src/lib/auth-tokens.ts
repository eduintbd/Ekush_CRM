import crypto from "crypto";

// One-time token helpers used by both the Invitation and PasswordResetToken
// flows. The raw token is only ever returned from generateToken() — the
// DB stores sha256(token) so a leak of the DB doesn't leak live links.

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Constant-time compare of two hex-encoded hashes. Not strictly necessary
// for stored-hash lookups (we findUnique by hash) but keep for defence.
export function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

// Password rules from the spec:
//   min 10 chars · at least one upper, lower, digit, symbol
export function validatePassword(pwd: string): { ok: true } | { ok: false; reason: string } {
  if (typeof pwd !== "string") return { ok: false, reason: "Password is required." };
  if (pwd.length < 10) return { ok: false, reason: "Password must be at least 10 characters." };
  if (!/[A-Z]/.test(pwd)) return { ok: false, reason: "Password must contain an uppercase letter." };
  if (!/[a-z]/.test(pwd)) return { ok: false, reason: "Password must contain a lowercase letter." };
  if (!/\d/.test(pwd)) return { ok: false, reason: "Password must contain a digit." };
  if (!/[^A-Za-z0-9]/.test(pwd)) return { ok: false, reason: "Password must contain a symbol." };
  return { ok: true };
}

// Email must end in the staff domain. Case-insensitive.
export function isStaffEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /@ekushwml\.com$/i.test(email.trim());
}
