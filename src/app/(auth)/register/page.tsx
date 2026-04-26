import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RegisterClient, type RegisterPrefill } from "./register-client";

// Phase 7 — server wrapper for the existing 4-step KYC flow.
//
// When a Tier-1 prospect is logged in, we resolve their Prospect row
// and hand the name / phone / email to the client component as
// initialProfile so Step 1 starts populated. The client side renders
// a small "we pre-filled your details" banner when it sees a non-empty
// prefill bundle.
//
// Anonymous visitors and investor-tier sessions get the form blank,
// preserving the pre-Phase-7 experience byte-for-byte.

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await getSession().catch(() => null);

  let initialProfile: RegisterPrefill | null = null;
  let prospectId: string | null = null;

  if (session?.user?.tier === "PROSPECT" && session.user.prospectId) {
    const prospect = await prisma.prospect
      .findUnique({
        where: { id: session.user.prospectId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          deletedAt: true,
        },
      })
      .catch(() => null);

    if (prospect && !prospect.deletedAt) {
      prospectId = prospect.id;
      initialProfile = {
        name: prospect.name,
        // Phone is canonical 10/11-digit national form (no country
        // code) — same shape the existing form expects.
        phone: prospect.phone,
        email: prospect.email ?? "",
      };
    }
  }

  return <RegisterClient initialProfile={initialProfile} prospectId={prospectId} />;
}
