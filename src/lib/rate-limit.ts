import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import type { LoginRealm } from "@/lib/login-input";

// Failures per (identifier, ipAddress, realm) triple are summed over a
// rolling window. At or above the threshold we hard-block all login
// attempts on that triple for the lockout duration.
//
// Spec from the brief:
//   "5 failed attempts per IP-and-identifier combination → 15-minute
//    lockout."
export const LOGIN_FAIL_THRESHOLD = 5;
export const LOGIN_WINDOW_MINUTES = 15;
export const LOGIN_LOCKOUT_MINUTES = 15;

// Returns the caller's IP from the standard proxy headers Vercel sets,
// falling back to a fixed token so the rate-limit triple still indexes
// cleanly when the header is absent (local dev, server-to-server).
export function getRequestIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for is comma-separated; the first hop is the client.
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

type RateKey = {
  identifier: string;
  ipAddress: string;
  realm: LoginRealm;
};

// Counts failed attempts inside the rolling window. We don't reset the
// counter on a successful login — that's deliberate: a single successful
// login mid-attack would otherwise unlock the door for the attacker.
// Instead the daily cron purges rows older than 24h, and the window
// itself slides forward naturally.
export async function isRateLimited(key: RateKey): Promise<{
  limited: boolean;
  retryAfterSeconds: number;
}> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000);

  const fails = await prisma.loginAttempt.count({
    where: {
      identifier: key.identifier,
      ipAddress: key.ipAddress,
      realm: key.realm,
      success: false,
      createdAt: { gte: since },
    },
  });

  if (fails < LOGIN_FAIL_THRESHOLD) {
    return { limited: false, retryAfterSeconds: 0 };
  }

  // Find the oldest failure inside the window — the lockout expires
  // LOGIN_LOCKOUT_MINUTES after that row, which gives us a precise
  // "retry after N seconds" for the response.
  const oldest = await prisma.loginAttempt.findFirst({
    where: {
      identifier: key.identifier,
      ipAddress: key.ipAddress,
      realm: key.realm,
      success: false,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const lockUntilMs = oldest
    ? oldest.createdAt.getTime() + LOGIN_LOCKOUT_MINUTES * 60 * 1000
    : Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000;

  return {
    limited: true,
    retryAfterSeconds: Math.max(1, Math.ceil((lockUntilMs - Date.now()) / 1000)),
  };
}

// Records a single attempt. Failures count against the threshold;
// successes are stored for audit but never count.
export async function recordLoginAttempt(
  key: RateKey & { success: boolean },
): Promise<void> {
  // Best-effort write — never let a logging failure block a real login.
  try {
    await prisma.loginAttempt.create({
      data: {
        identifier: key.identifier,
        ipAddress: key.ipAddress,
        realm: key.realm,
        success: key.success,
      },
    });
  } catch {
    // Swallow. Worst case we under-count and a brute-forcer gets one
    // extra attempt — the per-User lockedUntil counter still applies.
  }
}
