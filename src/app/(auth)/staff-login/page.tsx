import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";
import { StaffLoginClient } from "./staff-login-client";

// Dedicated staff entry point — bookmarkable URL for the small admin
// team (SUPER_ADMIN / MAKER / CHECKER / VIEWER). The investor /login
// page is intentionally NOT touched; staff who happen to also have an
// investor code can still log in there if they prefer.
//
// If a staff session is already active, send them straight to the
// admin dashboard. If an investor session is active, send them to the
// investor portal — they pressed the wrong URL.

export default async function StaffLoginPage() {
  const session = await getSession().catch(() => null);
  if (session?.user) {
    if (STAFF_ROLES.includes(session.user.role)) {
      redirect("/admin/dashboard");
    }
    if (session.user.tier === "PROSPECT") {
      redirect("/prospect/dashboard");
    }
    redirect("/dashboard");
  }
  return <StaffLoginClient />;
}
