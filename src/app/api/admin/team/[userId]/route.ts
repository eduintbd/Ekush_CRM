import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUPER_ROLES, STAFF_ROLES } from "@/lib/roles";

export const runtime = "nodejs";

// PATCH body supports two actions:
//   { action: "change_role", role: "MAKER" }
//   { action: "set_status", status: "ACTIVE" | "DEACTIVATED" | "LOCKED" }
// Super Admin only. Cannot modify yourself (prevents lock-out / self-demote).
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  const selfId = (session?.user as any)?.id;
  if (!session || !SUPER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Only Super Admin can change team roles." }, { status: 403 });
  }
  if (params.userId === selfId) {
    return NextResponse.json(
      { error: "You cannot change your own role or status. Ask another Super Admin." },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, role: true, status: true, email: true },
  });
  if (!target || !STAFF_ROLES.includes(target.role)) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }

  const body = await req.json();
  const action = String(body.action || "");

  if (action === "change_role") {
    const next = String(body.role || "").trim();
    if (!STAFF_ROLES.includes(next)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    await prisma.user.update({ where: { id: target.id }, data: { role: next } });
    await prisma.auditLog.create({
      data: {
        userId: selfId,
        userEmail: (session.user as any).email ?? null,
        userRole: role,
        action: "TEAM_ROLE_CHANGE",
        entity: "User",
        entityId: target.id,
        oldValue: JSON.stringify({ role: target.role }),
        newValue: JSON.stringify({ role: next }),
      },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "set_status") {
    const next = String(body.status || "").trim();
    const allowed = ["ACTIVE", "DEACTIVATED", "LOCKED"];
    if (!allowed.includes(next)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: target.id },
      data: {
        status: next,
        // Clearing lockedUntil when moving to ACTIVE unlocks the account.
        ...(next === "ACTIVE" ? { lockedUntil: null, failedLoginCount: 0 } : {}),
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: selfId,
        userEmail: (session.user as any).email ?? null,
        userRole: role,
        action: "TEAM_STATUS_CHANGE",
        entity: "User",
        entityId: target.id,
        oldValue: JSON.stringify({ status: target.status }),
        newValue: JSON.stringify({ status: next }),
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
