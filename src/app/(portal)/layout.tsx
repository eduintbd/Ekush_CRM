import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/topbar";
import { AuthProvider } from "@/components/layout/session-provider";
import { EkushChatbotMini } from "@/components/chatbot/ekush-chatbot-mini";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect("/login");
  }

  if (!session) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <AuthProvider>
      <div className="min-h-screen bg-page-bg">
        <TopBar userName={user?.name} investorCode={user?.investorCode} />
        <main className="max-w-7xl mx-auto px-8 pb-8">{children}</main>

        <ErrorBoundary><EkushChatbotMini userName={user?.name} /></ErrorBoundary>
      </div>
    </AuthProvider>
  );
}
