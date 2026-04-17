import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRecipients, saveRecipients } from "@/lib/mail/digest";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !ADMIN_ROLES.includes(role)) return null;
  return session;
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const recipients = await getRecipients();
  return NextResponse.json({ recipients });
}

export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { recipients?: string[] };
  const list = Array.isArray(body.recipients) ? body.recipients : [];
  await saveRecipients(list);
  const saved = await getRecipients();
  return NextResponse.json({ recipients: saved });
}
