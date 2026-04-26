import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { getSession } from "@/lib/auth";
import { isProspectsEnabled } from "@/lib/feature-flags";
import { ProspectLogoutButton } from "./logout-button";

// Slim dedicated layout for the Tier-1 dashboard. Deliberately avoids
// the investor portal's TopBar / Ahona widget — those imply portfolio
// data prospects don't have. Visual style mirrors the investor portal
// (page-bg, ekush-orange) so the brand remains coherent across tiers.

export default async function ProspectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isProspectsEnabled()) notFound();

  const session = await getSession();
  if (!session?.user) redirect("/login");

  // Hard-bounce wrong-tier sessions — middleware already does this for
  // most paths but a logged-in investor following an old prospect
  // bookmark hits the layout first.
  if (session.user.tier !== "PROSPECT") redirect("/dashboard");

  const name = session.user.name ?? "Prospect";

  return (
    <div className="min-h-screen bg-page-bg font-poppins">
      <header className="bg-navy">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/prospect/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ekush-orange rounded-[5px] flex items-center justify-center font-bold text-white text-base shadow-card">
              E
            </div>
            <div>
              <h1 className="text-base font-bold text-white font-rajdhani leading-tight">
                Ekush WML
              </h1>
              <p className="text-[10px] text-white/60 tracking-wider uppercase leading-tight">
                Prospect Portal
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline text-white/80">Hi, {name}</span>
            <ProspectLogoutButton>
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </ProspectLogoutButton>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
