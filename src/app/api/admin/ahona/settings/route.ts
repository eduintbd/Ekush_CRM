import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { getSession } from "@/lib/auth";
import { requireStaff } from "../../knowledge/_guard";

/**
 * Singleton settings for the Ahona menu-driven chatbot. One row keyed
 * "singleton" holding the kill switches per surface, persona greeting,
 * contact phone + WhatsApp, and working-hours blurb.
 *
 *   GET  → current values (or defaults if the row doesn't exist yet)
 *   POST → upsert all fields. Phone + WhatsApp are normalised to
 *          digits-only so the public client can drop them straight
 *          into tel: / wa.me/ URLs without re-cleaning.
 */

const SINGLETON_ID = "singleton";
const PUBLIC_TAG = "ahona-public";
const PORTAL_TAG = "ahona-portal";
const PUBLIC_PATH = "/api/public/ahona";
const PORTAL_PATH = "/api/portal/ahona";

export async function GET() {
  const guard = await requireStaff();
  if (guard) return guard;

  const row = await prisma.ahonaSettings.findUnique({
    where: { id: SINGLETON_ID },
  });
  return NextResponse.json({ settings: row });
}

export async function POST(req: NextRequest) {
  const guard = await requireStaff();
  if (guard) return guard;

  const session = await getSession();
  const userId = session?.user.id ?? null;

  const body = (await req.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!body) {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const data = {
    enabledOnWebsite: !!body.enabledOnWebsite,
    enabledOnPortal: !!body.enabledOnPortal,
    greetingEn: str(body.greetingEn) || "Hi, I'm Ahona — how can I help?",
    greetingBn:
      str(body.greetingBn) ||
      "নমস্কার, আমি আহনা — কীভাবে সাহায্য করতে পারি?",
    phoneNumber: digits(body.phoneNumber),
    whatsappNumber: digits(body.whatsappNumber),
    workingHoursEn: str(body.workingHoursEn) || null,
    workingHoursBn: str(body.workingHoursBn) || null,
    updatedBy: userId,
  };

  if (data.phoneNumber && (data.phoneNumber.length < 7 || data.phoneNumber.length > 16)) {
    return NextResponse.json(
      { error: "phoneNumber must be 7–16 digits (international, no leading +)" },
      { status: 400 },
    );
  }
  if (data.whatsappNumber && (data.whatsappNumber.length < 7 || data.whatsappNumber.length > 16)) {
    return NextResponse.json(
      { error: "whatsappNumber must be 7–16 digits (international, no leading +)" },
      { status: 400 },
    );
  }

  const settings = await prisma.ahonaSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  });

  revalidatePath(PUBLIC_PATH);
  revalidatePath(PORTAL_PATH);
  await flushTag(PUBLIC_TAG);
  await flushTag(PORTAL_TAG);

  return NextResponse.json({ settings });
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function digits(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const d = v.replace(/\D+/g, "");
  return d || null;
}
