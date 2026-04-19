import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { hashToken, validatePassword } from "@/lib/auth-tokens";

export const runtime = "nodejs";

// GET = validate token (returns { email })
// POST = consume token and set a new password.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { usedAt: true, expiresAt: true, user: { select: { email: true } } },
  });
  if (!row) return NextResponse.json({ error: "Invalid or unknown token." }, { status: 404 });
  if (row.usedAt) return NextResponse.json({ error: "This reset link has already been used." }, { status: 410 });
  if (row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This reset link has expired." }, { status: 410 });
  }
  return NextResponse.json({ email: row.user.email });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const pwdCheck = validatePassword(password);
  if (!pwdCheck.ok) return NextResponse.json({ error: pwdCheck.reason }, { status: 400 });

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row) return NextResponse.json({ error: "Invalid or unknown token." }, { status: 404 });
  if (row.usedAt) return NextResponse.json({ error: "This reset link has already been used." }, { status: 410 });
  if (row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This reset link has expired." }, { status: 410 });
  }

  const passwordHash = await hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      userId: row.userId,
      action: "PASSWORD_RESET",
      entity: "User",
      entityId: row.userId,
    },
  });

  return NextResponse.json({ success: true });
}
