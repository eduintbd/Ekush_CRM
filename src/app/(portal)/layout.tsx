import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/topbar";
import { AuthProvider } from "@/components/layout/session-provider";
import { EkushChatbot } from "@/components/chatbot/ekush-chatbot";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <AuthProvider>
      <div className="min-h-screen bg-page-bg">
        <TopBar userName={user?.name} investorCode={user?.investorCode} />
        <main className="max-w-7xl mx-auto px-8 pb-8">{children}</main>

        <ErrorBoundary><EkushChatbot /></ErrorBoundary>

        {/* Footer */}
        <footer className="max-w-7xl mx-auto px-8 pb-6">
          <div className="bg-white rounded-[10px] py-6 px-4 text-center">
            <p className="text-[12px] text-text-body">
              Contact us at{" "}
              <a href="mailto:info@ekushwml.com" className="text-navy hover:underline">
                info@ekushwml.com
              </a>{" "}
              or{" "}
              <a href="tel:+8801713086101" className="text-navy hover:underline">
                +8801713086101
              </a>{" "}
              and{" "}
              <a href="tel:+88001906440541" className="text-navy hover:underline">
                +88001906440541
              </a>{" "}
              between 10:00 am – 06:00 pm every Sunday to Thursday
            </p>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}
