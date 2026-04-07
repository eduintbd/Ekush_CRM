import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { TopBar } from "@/components/layout/topbar";
import { AuthProvider } from "@/components/layout/session-provider";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (e) {
    redirect("/login");
  }

  if (!session) {
    redirect("/login");
  }

  const user = session.user as any;

  return (
    <AuthProvider>
      <div className="min-h-screen bg-page-bg">
        <TopBar userName={user?.name} investorCode={user?.investorCode} />
        <main className="max-w-7xl mx-auto px-8 pb-8">{children}</main>

        {/* Footer */}
        <footer className="max-w-7xl mx-auto px-8 pb-6">
          <div className="bg-white rounded-[10px] py-6 px-4 text-center">
            <p className="text-[12px] text-text-body">
              Contact us at{" "}
              <a href="mailto:support@ekushwml.com" className="text-navy hover:underline">
                support@ekushwml.com
              </a>{" "}
              or{" "}
              <a href="tel:+8801234567890" className="text-navy hover:underline">
                +88-01234567890
              </a>{" "}
              between 10:00 am – 06:00 pm every Sunday to Thursday
            </p>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}
