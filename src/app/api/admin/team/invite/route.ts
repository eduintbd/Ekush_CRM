import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/smtp";
import { staffInviteEmail } from "@/lib/mail/templates";
import { generateToken, hashToken, isStaffEmail } from "@/lib/auth-tokens";
import { SUPER_ROLES, STAFF_ROLES, ROLE_LABELS, type UserRole } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !SUPER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Only Super Admin can invite team members." }, { status: 403 });
  }

  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.fullName || "").trim();
  const targetRole = String(body.role || "").trim();
  const note = body.note ? String(body.note).trim() : null;

  if (!email || !fullName || !targetRole) {
    return NextResponse.json({ error: "Full name, email, and role are required." }, { status: 400 });
  }
  if (!isStaffEmail(email)) {
    return NextResponse.json({ error: "Email must be on the @ekushwml.com domain." }, { status: 400 });
  }
  if (!STAFF_ROLES.includes(targetRole)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  // Block duplicates: existing active staff user, or an unexpired outstanding invite.
  const existingUser = await prisma.user.findFirst({
    where: { email, role: { in: [...STAFF_ROLES] } },
    select: { id: true, status: true },
  });
  if (existingUser && existingUser.status !== "DEACTIVATED") {
    return NextResponse.json(
      { error: "A team member with this email already exists." },
      { status: 409 },
    );
  }
  const outstanding = await prisma.invitation.findFirst({
    where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (outstanding) {
    return NextResponse.json(
      { error: "An outstanding invitation already exists for this email." },
      { status: 409 },
    );
  }

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const invite = await prisma.invitation.create({
    data: {
      email,
      fullName,
      role: targetRole,
      tokenHash,
      expiresAt,
      note,
      invitedById: (session.user as any).id,
    },
  });

  const base = process.env.NEXTAUTH_URL || "https://ekush.aibd.ai";
  const acceptUrl = `${base.replace(/\/$/, "")}/accept-invite?token=${rawToken}`;
  const inviterName = (session.user as any).name || (session.user as any).email || "Ekush Admin";

  const { subject, html, text } = staffInviteEmail({
    fullName,
    role: ROLE_LABELS[targetRole as UserRole] ?? targetRole,
    acceptUrl,
    expiresIn: "24 hours",
    inviterName,
    note: note ?? undefined,
  });

  const result = await sendMail({ to: email, subject, html, text });

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      userEmail: (session.user as any).email ?? null,
      userRole: role,
      action: "TEAM_INVITE",
      entity: "Invitation",
      entityId: invite.id,
      newValue: JSON.stringify({ email, fullName, role: targetRole }),
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: `Invitation saved but email failed: ${result.error}`, invitationId: invite.id },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true, invitationId: invite.id });
}
