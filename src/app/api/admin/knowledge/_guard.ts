import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";

/**
 * Shared auth check for every /api/admin/knowledge/* handler.
 * Returns `null` when the caller is a signed-in staff user, or a
 * ready-to-return 401 response otherwise.
 *
 * Exported from a route-adjacent module (not src/lib) so it stays
 * scoped to this feature — if we ever widen the role check it
 * shouldn't leak into unrelated admin areas.
 */
export async function requireStaff(): Promise<NextResponse | null> {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !role || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
