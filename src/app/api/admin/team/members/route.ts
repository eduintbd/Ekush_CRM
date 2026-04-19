import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lists staff users + outstanding invitations so the Team page shows a single
// unified view (Active / Invited / Locked / Deactivated).
export async function GET() {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [users, invitations] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [...STAFF_ROLES] } },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invitation.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ users, invitations });
}
