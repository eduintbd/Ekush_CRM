import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthProvider } from "@/components/layout/session-provider";
import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin/logout-button";
import { ContentNavDropdown } from "@/components/admin/content-nav-dropdown";
import { STAFF_ROLES, SUPER_ROLES, can, type Action } from "@/lib/roles";
import { isProspectsEnabled } from "@/lib/feature-flags";

// True for the first 30 days after the prospect-tier launch. Drives the
// small green "NEW" badge next to the Prospects nav link so existing
// staff notice the new surface. After the 30-day window it auto-hides.
function isProspectsNew(): boolean {
  const launch = process.env.PROSPECTS_TAB_LAUNCH;
  if (!launch) return false;
  const launchDate = new Date(launch);
  if (Number.isNaN(launchDate.getTime())) return false;
  const ageMs = Date.now() - launchDate.getTime();
  return ageMs >= 0 && ageMs <= 30 * 24 * 60 * 60 * 1000;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;

  if (!STAFF_ROLES.includes(role)) {
    redirect("/dashboard");
  }

  const showProspectsTab = isProspectsEnabled();
  const showProspectsNewBadge = showProspectsTab && isProspectsNew();

  return (
    <AuthProvider>
      <div className="min-h-screen bg-page-bg">
        {/* Admin Nav — white with orange accents */}
        <nav className="bg-white shadow-sidebar px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ekush-orange rounded-lg flex items-center justify-center font-bold text-white text-sm">
              E
            </div>
            <span className="font-semibold text-[14px] text-navy font-rajdhani">
              Ekush WML <span className="text-ekush-orange">Admin</span>
            </span>
          </div>
          <div className="flex items-center gap-5 text-[13px] font-medium flex-wrap">
            <Link href="/admin/dashboard" className="text-text-dark hover:text-ekush-orange transition-colors">Dashboard</Link>
            <Link href="/admin/investors" className="text-text-dark hover:text-ekush-orange transition-colors">Investors</Link>
            {showProspectsTab && (
              <Link
                href="/admin/prospects"
                className="text-text-dark hover:text-ekush-orange transition-colors inline-flex items-center gap-1.5"
              >
                Prospects
                {showProspectsNewBadge && (
                  <span className="inline-flex items-center bg-green-600 text-white text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-[3px] leading-none">
                    NEW
                  </span>
                )}
              </Link>
            )}
            <Link href="/admin/statements" className="text-text-dark hover:text-ekush-orange transition-colors">Statements</Link>
            {can(role, "EDIT_DATA_ENTRY" as Action) && (
              <Link href="/admin/nav-entry" className="text-text-dark hover:text-ekush-orange transition-colors">Data Entry</Link>
            )}
            <Link href="/admin/fund-reports" className="text-text-dark hover:text-ekush-orange transition-colors">Fund Reports</Link>
            {/* Knowledge Center CMS surfaces — grouped under one
                "Contents" dropdown so the top bar stays compact as
                we add sections. Fund Fact Sheets sit under Research
                here so the publishing surfaces stay grouped. */}
            <ContentNavDropdown />
            <Link href="/admin/tickets" className="text-text-dark hover:text-ekush-orange transition-colors">Tickets</Link>
            <Link href="/admin/content" className="text-text-dark hover:text-ekush-orange transition-colors">Mail</Link>
            {can(role, "VIEW_AUDIT_LOG" as Action) && (
              <Link href="/admin/audit-log" className="text-text-dark hover:text-ekush-orange transition-colors">Audit Log</Link>
            )}
            {SUPER_ROLES.includes(role) && (
              <Link href="/admin/settings/team" className="text-text-dark hover:text-ekush-orange transition-colors">Team</Link>
            )}
            <Link href="/dashboard" className="text-ekush-orange hover:text-ekush-orange-dark transition-colors">Portal</Link>
            <AdminLogoutButton userName={session.user.name || session.user.email || undefined} />
          </div>
        </nav>
        <main className="p-6 max-w-7xl mx-auto">{children}</main>
      </div>
    </AuthProvider>
  );
}
