import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSmtpConfig, saveSmtpConfig, type SmtpConfig } from "@/lib/mail/smtp";
import { STAFF_ROLES } from "@/lib/roles";


export const runtime = "nodejs";

async function guard() {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) return null;
  return session;
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cfg = await getSmtpConfig();
  if (!cfg) return NextResponse.json({ configured: false });
  // Redact password on GET
  return NextResponse.json({
    configured: true,
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: cfg.user,
    pass: "",
    fromEmail: cfg.fromEmail,
    fromName: cfg.fromName,
  });
}

export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Partial<SmtpConfig>;
  const prev = await getSmtpConfig();

  const next: SmtpConfig = {
    host: body.host ?? prev?.host ?? "",
    port: Number(body.port ?? prev?.port ?? 465),
    secure: body.secure ?? prev?.secure ?? true,
    user: body.user ?? prev?.user ?? "",
    // If password is empty, keep the previous one (GET redacts pass)
    pass: body.pass && body.pass.length > 0 ? body.pass : prev?.pass ?? "",
    fromEmail: body.fromEmail ?? prev?.fromEmail ?? body.user ?? "",
    fromName: body.fromName ?? prev?.fromName ?? "Ekush WML",
  };

  if (!next.host || !next.user || !next.pass) {
    return NextResponse.json(
      { error: "Host, username and password are required." },
      { status: 400 },
    );
  }

  await saveSmtpConfig(next);
  return NextResponse.json({ success: true });
}
