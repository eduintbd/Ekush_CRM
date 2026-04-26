import { createClient } from "./supabase/server";

export type AppTier = "INVESTOR" | "PROSPECT";

export type AppSession = {
  user: {
    id: string;
    role: string;
    status: string;
    // Realm distinguishes the two auth tiers. Defaults to "INVESTOR" so
    // existing investor sessions read as INVESTOR even if they predate
    // the tier claim being added to user_metadata.
    tier: AppTier;
    investorId?: string;
    investorCode?: string;
    // Set when the session belongs to a Tier-1 prospect. Mutually
    // exclusive with investorId in normal operation.
    prospectId?: string;
    phone?: string;
    name?: string;
    email?: string;
  };
} | null;

/**
 * Returns the current session from Supabase Auth.
 * Drop-in replacement for getServerSession(authOptions).
 * User metadata (role, status, investorId, investorCode, tier,
 * prospectId, phone) is stored in Supabase user_metadata at login time.
 */
export async function getSession(): Promise<AppSession> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const tierRaw = (meta.tier as string | undefined)?.toUpperCase();
  const tier: AppTier = tierRaw === "PROSPECT" ? "PROSPECT" : "INVESTOR";

  return {
    user: {
      id: (meta.prismaUserId as string) ?? user.id,
      role: (meta.role as string) ?? (tier === "PROSPECT" ? "PROSPECT" : "INVESTOR"),
      status: (meta.status as string) ?? "ACTIVE",
      tier,
      investorId: meta.investorId as string | undefined,
      investorCode: meta.investorCode as string | undefined,
      prospectId: meta.prospectId as string | undefined,
      phone: meta.phone as string | undefined,
      name: meta.name as string | undefined,
      email: user.email,
    },
  };
}
