import Link from "next/link";
import { MessageCircle, ArrowRight } from "lucide-react";
import { isProspectsEnabled } from "@/lib/feature-flags";
import { OpenAccountCta } from "@/components/auth/open-account-cta";

export default function HomePage() {
  const prospectsOn = isProspectsEnabled();
  return (
    <div className="min-h-screen flex flex-col font-poppins">
      {/* Header */}
      <header className="bg-navy sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ekush-orange rounded-[5px] flex items-center justify-center font-bold text-white text-lg shadow-card">
              E
            </div>
            <div>
              <h1 className="text-lg font-bold text-white font-rajdhani">Ekush WML</h1>
              <p className="text-[10px] text-white/60 tracking-wider uppercase">Wealth Management Ltd</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-[14px]">
            <a href="https://ekushwml.com/company-overview" className="text-white/80 hover:text-ekush-orange transition-colors">About</a>
            <a href="https://ekushwml.com/" className="text-white/80 hover:text-ekush-orange transition-colors">Funds</a>
            <a href="https://ekushwml.com/" className="text-white/80 hover:text-ekush-orange transition-colors">Knowledge</a>
            <Link
              href="/login"
              className="bg-ekush-orange text-white px-6 py-2.5 rounded-[5px] font-semibold hover:bg-ekush-orange-dark transition-all duration-300 shadow-card"
            >
              Sign In
            </Link>
          </nav>
          <Link href="/login" className="md:hidden bg-ekush-orange text-white px-4 py-2 rounded-[5px] text-sm font-semibold">
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative bg-navy text-white overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-ekush-orange rounded-full blur-[120px]" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-ekush-orange rounded-full blur-[150px]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
            <div className="max-w-3xl">
              <p className="text-ekush-orange text-sm font-semibold tracking-[2px] uppercase mb-4 font-rajdhani">
                Investor Portal
              </p>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 font-rajdhani">
                Empowering Brighter Future Through{" "}
                <span className="text-ekush-orange">
                  Trusted Wealth Management
                </span>
              </h2>
              <p className="text-lg text-white/60 mb-10 leading-relaxed max-w-2xl">
                Track your mutual fund investments, view real-time portfolio data,
                manage transactions, and access your documents — all in one secure portal.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="bg-ekush-orange text-white px-8 py-3.5 rounded-[5px] font-bold text-[16px] hover:bg-ekush-orange-dark transition-all duration-300 shadow-card"
                >
                  Access Your Portal
                </Link>
                <a
                  href="https://ekushwml.com/"
                  className="border-2 border-white/20 text-white px-8 py-3.5 rounded-[5px] font-semibold text-[16px] hover:border-ekush-orange/50 hover:text-ekush-orange transition-all duration-300"
                >
                  Visit Website
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Two-tier CTAs */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 mb-12">
          <div
            className={`grid gap-4 ${
              prospectsOn ? "md:grid-cols-2" : "md:grid-cols-1 max-w-md mx-auto"
            }`}
          >
            {prospectsOn && (
              <Link
                href="/whatsapp-signup"
                className="group bg-white rounded-card shadow-card p-6 hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-ekush-orange/40"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-11 h-11 rounded-[8px] bg-ekush-orange/10 text-ekush-orange flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-body group-hover:text-ekush-orange transition-colors" />
                </div>
                <h3 className="text-[16px] font-bold text-text-dark font-rajdhani mb-1">
                  Get fund updates on WhatsApp
                </h3>
                <p className="text-[13px] text-text-body leading-relaxed">
                  Lightweight signup &mdash; no KYC. Receive NAV updates,
                  factsheets, and advisor outreach.
                </p>
              </Link>
            )}

            <OpenAccountCta variant="full" />
          </div>
        </div>

        {/* Fund Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Ekush First Unit Fund", code: "EFUF", nav: "14.635", ret: "108.33%", since: "2020-05-28", type: "Balanced" },
              { name: "Ekush Growth Fund", code: "EGF", nav: "12.448", ret: "37.29%", since: "2022-02-13", type: "Growth" },
              { name: "Ekush Stable Return Fund", code: "ESRF", nav: "14.240", ret: "42.40%", since: "2023-03-05", type: "Stable" },
            ].map((fund) => (
              <div
                key={fund.code}
                className="bg-white rounded-card shadow-card p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-semibold tracking-[1px] uppercase text-ekush-orange bg-ekush-orange/10 px-3 py-1 rounded-full">
                    {fund.type}
                  </span>
                  <span className="text-[11px] text-text-body">{fund.code}</span>
                </div>
                <h4 className="text-[16px] font-bold text-text-dark font-rajdhani">{fund.name}</h4>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[12px] text-text-body">NAV (2026-03-29)</span>
                    <span className="text-[20px] font-bold text-text-dark">{fund.nav}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[12px] text-text-body">Return Since Inception</span>
                    <span className="text-[16px] font-bold text-green-600">{fund.ret}</span>
                  </div>
                  <p className="text-[11px] text-text-body">Since {fund.since}</p>
                </div>
                <div className="flex gap-2 mt-5">
                  <Link href="/login" className="flex-1 text-center bg-ekush-orange text-white py-2.5 rounded-[5px] text-[13px] font-semibold hover:bg-ekush-orange-dark transition-all duration-300">
                    Invest Now
                  </Link>
                  <a href={`https://ekushwml.com/fund/${fund.code.toLowerCase()}`} className="flex-1 text-center border border-input-border text-text-dark py-2.5 rounded-[5px] text-[13px] font-semibold hover:border-ekush-orange hover:text-ekush-orange transition-all duration-300">
                    Details
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-page-bg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { number: "700+", label: "Total Clients" },
                { number: "655+", label: "Individual Clients" },
                { number: "45+", label: "Corporate Clients" },
                { number: "3", label: "Active Funds" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-4xl font-bold text-ekush-orange font-rajdhani">{stat.number}</p>
                  <p className="text-[13px] text-text-body mt-1 tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white py-20 border-t border-input-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-ekush-orange text-sm font-semibold tracking-[2px] uppercase mb-2 font-rajdhani">Portal Features</p>
              <h3 className="text-3xl font-bold text-text-dark font-rajdhani">
                Everything You Need in One Place
              </h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Real-Time Portfolio", desc: "View holdings, NAV, and returns updated daily with detailed LS/SIP breakdown" },
                { title: "Online Transactions", desc: "Place buy/sell orders, manage SIP plans, and track order status in real-time" },
                { title: "Tax & Statements", desc: "Download portfolio statements, tax certificates, and capital gain reports as PDF" },
                { title: "Secure & Compliant", desc: "Two-factor authentication, e-KYC, and full BSEC compliance built-in" },
              ].map((feature) => (
                <div key={feature.title} className="bg-page-bg rounded-card p-6 border border-input-border/30 hover:shadow-card hover:-translate-y-1 transition-all duration-300">
                  <div className="w-10 h-10 bg-ekush-orange rounded-[5px] flex items-center justify-center mb-4">
                    <div className="w-5 h-5 bg-white/30 rounded-full" />
                  </div>
                  <h4 className="font-bold text-text-dark mb-2 font-rajdhani">{feature.title}</h4>
                  <p className="text-[13px] text-text-body leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-navy text-white/60 pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-ekush-orange rounded-[5px] flex items-center justify-center font-bold text-white text-sm">E</div>
                <span className="font-bold text-white text-sm font-rajdhani">Ekush WML</span>
              </div>
              <p className="text-[13px] leading-relaxed">
                Client-focused wealth management solutions — from mutual funds to personalized strategies.
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-white text-sm mb-3 font-rajdhani">Quick Links</h5>
              <div className="space-y-2 text-[13px]">
                <a href="https://ekushwml.com/" className="block hover:text-ekush-orange transition-colors">Company Overview</a>
                <a href="https://ekushwml.com/" className="block hover:text-ekush-orange transition-colors">Our Leadership</a>
                <a href="https://ekushwml.com/" className="block hover:text-ekush-orange transition-colors">Investment Philosophy</a>
              </div>
            </div>
            <div>
              <h5 className="font-semibold text-white text-sm mb-3 font-rajdhani">Our Funds</h5>
              <div className="space-y-2 text-[13px]">
                <a href="https://ekushwml.com/fund/first-unit-fund" className="block hover:text-ekush-orange transition-colors">Ekush First Unit Fund</a>
                <a href="https://ekushwml.com/fund/growth-fund" className="block hover:text-ekush-orange transition-colors">Ekush Growth Fund</a>
                <a href="https://ekushwml.com/fund/stable-return-fund" className="block hover:text-ekush-orange transition-colors">Ekush Stable Return Fund</a>
              </div>
            </div>
            <div>
              <h5 className="font-semibold text-white text-sm mb-3 font-rajdhani">Contact</h5>
              <div className="space-y-2 text-[13px]">
                <p>+8801713086101</p>
                <p>contact@ekushwml.com</p>
                <p>Niketon, Gulshan 01, Dhaka-1212</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-[12px]">Licensed by Bangladesh Securities and Exchange Commission (BSEC)</p>
            <p className="text-[11px] text-white/40">&copy; 2021-{new Date().getFullYear()} Ekush Wealth Management Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
