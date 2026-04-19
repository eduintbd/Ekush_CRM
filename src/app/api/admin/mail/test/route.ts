import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendMail, getSmtpConfig } from "@/lib/mail/smtp";
import { STAFF_ROLES } from "@/lib/roles";


export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to } = (await req.json().catch(() => ({}))) as { to?: string };
  const cfg = await getSmtpConfig();
  if (!cfg) {
    return NextResponse.json(
      { ok: false, error: "SMTP not configured. Save credentials first." },
      { status: 400 },
    );
  }

  const recipient = to?.trim() || cfg.fromEmail || cfg.user;
  if (!recipient) {
    return NextResponse.json({ ok: false, error: "No recipient address." }, { status: 400 });
  }

  const r = await sendMail({
    to: recipient,
    subject: "SMTP Test — Ekush WML",
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 14px;">
        <p>This is a test email from the Ekush WML admin portal.</p>
        <p>If you received this, your SMTP configuration is working.</p>
        <p style="color: #666; font-size: 12px;">
          Host: ${cfg.host} · Port: ${cfg.port} · Secure: ${cfg.secure ? "yes" : "no"}<br />
          User: ${cfg.user} · From: ${cfg.fromEmail}
        </p>
      </div>
    `,
  });

  if (r.ok) {
    return NextResponse.json({ ok: true, recipient });
  }
  return NextResponse.json({ ok: false, error: r.error, recipient }, { status: 500 });
}
