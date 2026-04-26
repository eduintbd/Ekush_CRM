// POST /api/prospects/logout
//
// Mirror of /api/auth/logout but namespaced for the prospect route
// surface. Both realms share the same Supabase Auth cookie, so calling
// either endpoint clears the same session — keeping a separate route
// gives the prospect UI a clean URL and lets us add tier-specific
// post-logout side effects later (e.g. clear a marketing cookie) without
// touching the investor flow.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isProspectsEnabled, disabledResponse } from "@/lib/feature-flags";

export async function POST() {
  if (!isProspectsEnabled()) return disabledResponse();
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
