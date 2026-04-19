import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/smtp";
import { passwordResetEmail } from "@/lib/mail/templates";
import { generateToken, hashToken } from "@/lib/auth-tokens";

export const runtime = "nodejs";

// Always returns 200 regardless of whether the email exists — prevents user
// enumeration. Tokens expire in 24h.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ success: true }); // silent no-op

  const user = await prisma.user.findFirst({
    where: { email, status: { not: "DEACTIVATED" } },
    select: { id: true, email: true, fullName: true, status: true, investor: { select: { name: true } } },
  });

  if (user) {
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const base = process.env.NEXTAUTH_URL || "https://ekush.aibd.ai";
    const resetUrl = `${base.replace(/\/$/, "")}/reset-password?token=${rawToken}`;
    const displayName = user.fullName || user.investor?.name || "there";

    const { subject, html, text } = passwordResetEmail({
      fullName: displayName,
      resetUrl,
      expiresIn: "24 hours",
    });
    await sendMail({ to: user.email!, subject, html, text });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: "PASSWORD_RESET_REQUEST",
        entity: "User",
        entityId: user.id,
      },
    });
  }

  // Intentionally vague so attackers can't probe which emails exist.
  return NextResponse.json({ success: true });
}
