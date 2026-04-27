import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/roles";
import { TwoFactorEnrollmentClient } from "./2fa-client";

// Phase 9 — TOTP enrollment surface for staff users.
//
// Reads the current UserTotp state server-side so the page can branch
// between three states: no row at all (start), row but enrolledAt
// null (mid-enrollment, show "you started — finish or restart"),
// and enrolledAt set (already enrolled, show a tombstone with a
// reminder that resets are SUPER_ADMIN-only).

export const dynamic = "force-dynamic";

export default async function TwoFactorEnrollmentPage() {
  const session = await getSession();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
    redirect("/login");
  }

  const totp = await prisma.userTotp.findUnique({
    where: { userId: session.user.id },
    select: { enrolledAt: true },
  });

  return (
    <TwoFactorEnrollmentClient
      alreadyEnrolled={Boolean(totp?.enrolledAt)}
      mid={Boolean(totp && !totp.enrolledAt)}
      account={session.user.email ?? session.user.name ?? "Admin"}
    />
  );
}
