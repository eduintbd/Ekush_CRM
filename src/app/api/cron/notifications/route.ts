import { NextRequest, NextResponse } from "next/server";
import { runDigest } from "@/lib/mail/digest";
import { STAFF_ROLES } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Invoked twice daily by Vercel Cron (see vercel.json):
//   04:00 UTC = 10:00 BDT (morning digest)
//   10:00 UTC = 16:00 BDT (afternoon digest)
// Vercel attaches `Authorization: Bearer $CRON_SECRET` automatically.
// Manual invocation is allowed for an authenticated admin — handy for
// a "Send digest now" button if we ever add one.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";

  const isCron = secret && auth === `Bearer ${secret}`;

  if (!isCron) {
    // Fall through to admin-session check
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    const role = (session?.user as any)?.role;
        if (!session || !STAFF_ROLES.includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runDigest();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Digest failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
