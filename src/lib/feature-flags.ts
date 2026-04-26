// Tiny env-flag helpers. Phase-3 ships the prospect tier gated by
// PROSPECTS_ENABLED so the routes 404 in production until you flip
// the flag in Vercel and redeploy. Same pattern can be reused for
// future gradual rollouts.

import { NextResponse } from "next/server";

export function isProspectsEnabled(): boolean {
  // Default OFF — must be explicitly turned on per environment.
  return process.env.PROSPECTS_ENABLED === "true";
}

// Returns a 404 NextResponse when the flag is off. Routes call this at
// the very top of POST/GET so an attacker cannot tell from the response
// shape that the route exists yet.
export function disabledResponse(): NextResponse {
  return new NextResponse("Not Found", { status: 404 });
}
