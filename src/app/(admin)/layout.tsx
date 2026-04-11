import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthProvider } from "@/components/layout/session-provider";
import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin/logout-button";

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
  const adminRoles = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPPORT", "SUPER_ADMIN"];

  if (!adminRoles.includes(role)) {
    redirect("/dashboard");
  }

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
            <Link href="/admin/requests" className="text-text-dark hover:text-ekush-orange transition-colors">Requests</Link>
            <Link href="/admin/approvals" className="text-text-dark hover:text-ekush-orange transition-colors">Approvals</Link>
            <Link href="/admin/statements" className="text-text-dark hover:text-ekush-orange transition-colors">Statements</Link>
            <Link href="/admin/nav-entry" className="text-text-dark hover:text-ekush-orange transition-colors">NAV Entry</Link>
            <Link href="/admin/fund-reports" className="text-text-dark hover:text-ekush-orange transition-colors">Fund Reports</Link>
            <Link href="/admin/comparisons" className="text-text-dark hover:text-ekush-orange transition-colors">Comparisons</Link>
            <Link href="/admin/tickets" className="text-text-dark hover:text-ekush-orange transition-colors">Tickets</Link>
            <Link href="/admin/content" className="text-text-dark hover:text-ekush-orange transition-colors">Content</Link>
            <Link href="/admin/audit-log" className="text-text-dark hover:text-ekush-orange transition-colors">Audit Log</Link>
            <Link href="/dashboard" className="text-ekush-orange hover:text-ekush-orange-dark transition-colors">Portal</Link>
            <AdminLogoutButton userName={session.user.name || session.user.email || undefined} />
          </div>
        </nav>
        <main className="p-6 max-w-7xl mx-auto">{children}</main>
      </div>
    </AuthProvider>
  );
}
