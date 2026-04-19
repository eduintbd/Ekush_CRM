import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { hashToken, validatePassword } from "@/lib/auth-tokens";

export const runtime = "nodejs";

// GET /api/auth/accept-invite?token=... — returns { email, fullName, role } so
// the /accept-invite page can show "You're joining as {role}". Hidden behind a
// valid+unused+unexpired token check.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const invite = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, email: true, fullName: true, role: true, acceptedAt: true, expiresAt: true },
  });
  if (!invite) return NextResponse.json({ error: "Invalid or unknown invitation." }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "This invitation has already been used." }, { status: 410 });
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This invitation link has expired. Ask your Super Admin to resend." }, { status: 410 });
  }

  return NextResponse.json({
    email: invite.email,
    fullName: invite.fullName,
    role: invite.role,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const pwdCheck = validatePassword(password);
  if (!pwdCheck.ok) return NextResponse.json({ error: pwdCheck.reason }, { status: 400 });

  const invite = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite) return NextResponse.json({ error: "Invalid invitation." }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "This invitation has already been used." }, { status: 410 });
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This invitation link has expired." }, { status: 410 });
  }

  // Block if a staff account with this email already exists.
  const existing = await prisma.user.findFirst({
    where: { email: invite.email, role: { not: "INVESTOR" } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "A staff account with this email already exists. Try logging in instead." }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: invite.email,
      fullName: invite.fullName,
      passwordHash,
      role: invite.role,
      status: "ACTIVE",
      createdById: invite.invitedById,
    },
    select: { id: true, email: true },
  });

  await prisma.invitation.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      userEmail: user.email,
      userRole: invite.role,
      action: "INVITE_ACCEPTED",
      entity: "User",
      entityId: user.id,
    },
  });

  return NextResponse.json({ success: true, email: user.email });
}
