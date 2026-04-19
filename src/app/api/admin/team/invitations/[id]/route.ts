import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/smtp";
import { staffInviteEmail } from "@/lib/mail/templates";
import { generateToken, hashToken } from "@/lib/auth-tokens";
import { SUPER_ROLES, ROLE_LABELS, type UserRole } from "@/lib/roles";

export const runtime = "nodejs";

// POST = resend (rotates token + email); DELETE = revoke invite.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !SUPER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Only Super Admin can resend invitations." }, { status: 403 });
  }

  const invite = await prisma.invitation.findUnique({ where: { id: params.id } });
  if (!invite) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  if (invite.acceptedAt) {
    return NextResponse.json({ error: "Invitation already accepted." }, { status: 400 });
  }

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.invitation.update({
    where: { id: invite.id },
    data: { tokenHash, expiresAt },
  });

  const base = process.env.NEXTAUTH_URL || "https://ekush.aibd.ai";
  const acceptUrl = `${base.replace(/\/$/, "")}/accept-invite?token=${rawToken}`;
  const inviterName = (session.user as any).name || (session.user as any).email || "Ekush Admin";

  const { subject, html, text } = staffInviteEmail({
    fullName: invite.fullName,
    role: ROLE_LABELS[invite.role as UserRole] ?? invite.role,
    acceptUrl,
    expiresIn: "24 hours",
    inviterName,
    note: invite.note ?? undefined,
  });
  const result = await sendMail({ to: invite.email, subject, html, text });

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      userEmail: (session.user as any).email ?? null,
      userRole: role,
      action: "TEAM_INVITE_RESEND",
      entity: "Invitation",
      entityId: invite.id,
    },
  });

  return NextResponse.json(result.ok ? { success: true } : { error: result.error }, {
    status: result.ok ? 200 : 500,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !SUPER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Only Super Admin can revoke invitations." }, { status: 403 });
  }
  const invite = await prisma.invitation.findUnique({ where: { id: params.id } });
  if (!invite) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  if (invite.acceptedAt) {
    return NextResponse.json({ error: "Invitation already accepted — cannot revoke." }, { status: 400 });
  }
  await prisma.invitation.delete({ where: { id: invite.id } });
  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      userEmail: (session.user as any).email ?? null,
      userRole: role,
      action: "TEAM_INVITE_REVOKE",
      entity: "Invitation",
      entityId: invite.id,
    },
  });
  return NextResponse.json({ success: true });
}
