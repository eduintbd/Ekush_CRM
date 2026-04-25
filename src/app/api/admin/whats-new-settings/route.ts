import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { getSession } from "@/lib/auth";
import { requireStaff } from "../knowledge/_guard";

/**
 * Singleton control plane for the What's New side-tab. Holds the one
 * global WhatsApp number the "Call on WhatsApp" CTA on every card
 * opens. Modeled after front-page-popup/route.ts (single id="singleton"
 * row, GET returns the value or null, POST upserts it).
 *
 *   GET  → { whatsappNumber: string | null }
 *   POST → body { whatsappNumber: string | null }
 *          Pass null/empty to clear the number — the public side-tab
 *          then hides its WhatsApp button entirely.
 */

const SINGLETON_ID = "singleton";
const CACHE_TAG = "whats-new";
const PUBLIC_PATH = "/api/public/whats-new";

export async function GET() {
  const guard = await requireStaff();
  if (guard) return guard;

  const row = await prisma.whatsNewSetting.findUnique({
    where: { id: SINGLETON_ID },
    select: { whatsappNumber: true },
  });
  return NextResponse.json({ whatsappNumber: row?.whatsappNumber ?? null });
}

export async function POST(req: NextRequest) {
  const guard = await requireStaff();
  if (guard) return guard;

  const session = await getSession();
  const userId = session?.user.id ?? null;

  const body = (await req.json().catch(() => null)) as
    | { whatsappNumber?: unknown }
    | null;
  if (!body) {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  let whatsappNumber: string | null = null;
  if (typeof body.whatsappNumber === "string") {
    const trimmed = body.whatsappNumber.trim();
    if (trimmed) {
      // Strip everything that isn't a digit so callers tolerate
      // "+88 01713-086101" / "880 1713 086101" / "+8801713086101"
      // and the CRM stores a canonical wa.me-ready string.
      const digits = trimmed.replace(/\D+/g, "");
      if (digits.length < 7 || digits.length > 16) {
        return NextResponse.json(
          {
            error:
              "whatsappNumber must be 7–16 digits (international, no leading +)",
          },
          { status: 400 },
        );
      }
      whatsappNumber = digits;
    }
  }

  await prisma.whatsNewSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, whatsappNumber, updatedBy: userId },
    update: { whatsappNumber, updatedBy: userId },
  });

  revalidatePath(PUBLIC_PATH);
  await flushTag(CACHE_TAG);
  return NextResponse.json({ whatsappNumber });
}
