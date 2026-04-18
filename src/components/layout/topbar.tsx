"use client";

import {
  Award,
  FileText,
  Gift,
  LayoutDashboard,
  LogOut,
  PieChart,
  User,
  UserPen,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface TopBarProps {
  userName?: string;
  investorCode?: string;
  userImage?: string;
}

interface ServiceItem {
  href: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

const SERVICE_ITEMS: ServiceItem[] = [
  { href: "/statements", label: "Investment Summary", icon: PieChart, iconColor: "#2DAAB8", iconBg: "#E8F8FA" },
  { href: "/transactions", label: "Transaction History", icon: FileText, iconColor: "#7C3AED", iconBg: "#F3EFFE" },
  { href: "/profile", label: "Profile Management", icon: UserPen, iconColor: "#0EA5E9", iconBg: "#E0F2FE" },
  { href: "/tax-certificate", label: "Tax Certificate", icon: Award, iconColor: "#16A34A", iconBg: "#DCFCE7" },
  { href: "/dividends", label: "Dividend Statement", icon: Gift, iconColor: "#DB2777", iconBg: "#FCE7F3" },
];

export function TopBar({ userName, investorCode, userImage }: TopBarProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape; also coordinate with the chatbot
  // so only one floating widget is open at a time.
  useEffect(() => {
    if (!showMenu) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMenu(false);
    };
    const onWidgetOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ source: string }>).detail;
      if (detail?.source && detail.source !== "profile") setShowMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("widget:open", onWidgetOpen);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("widget:open", onWidgetOpen);
    };
  }, [showMenu]);

  const handleToggle = () => {
    const next = !showMenu;
    setShowMenu(next);
    if (next) {
      window.dispatchEvent(new CustomEvent("widget:open", { detail: { source: "profile" } }));
    }
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 bg-white shadow-sidebar">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Brand + Investor Info */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <img src="/logo.png" alt="Ekush" className="h-10 shrink-0" />
          <div>
            <h1 className="font-bold text-[14px] text-navy font-rajdhani leading-tight">
              Welcome to Ekush Wealth Management Limited
            </h1>
            <p className="text-[12px] text-text-dark mt-0.5">
              {userName || "Investor"}
              {investorCode && (
                <span className="text-text-muted ml-2">({investorCode})</span>
              )}
            </p>
          </div>
        </Link>

        {/* Profile Avatar & Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={handleToggle}
            aria-haspopup="menu"
            aria-expanded={showMenu}
            className="w-[50px] h-[50px] rounded-full bg-page-bg border-2 border-transparent hover:border-ekush-orange transition-colors overflow-hidden flex items-center justify-center"
          >
            {userImage ? (
              <img src={userImage} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-text-body" />
            )}
          </button>

          {showMenu && (
            <div
              role="menu"
              className="absolute right-0 top-[60px] z-50 w-[280px] bg-white rounded-xl border border-gray-200 shadow-[0_8px_24px_rgba(15,30,61,0.12)] overflow-hidden"
            >
              {/* User header */}
              <div className="px-4 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-navy flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-text-dark truncate">{userName || "Investor"}</p>
                  {investorCode && (
                    <p className="text-[11px] text-text-muted">ID: {investorCode}</p>
                  )}
                </div>
              </div>

              {/* Services */}
              <div className="py-2">
                <p className="px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Services
                </p>
                <ul role="none" className="px-1">
                  {SERVICE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.href} role="none">
                        <Link
                          href={item.href}
                          role="menuitem"
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-text-dark hover:bg-gray-100 transition-colors"
                        >
                          <span
                            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                            style={{ backgroundColor: item.iconBg }}
                          >
                            <Icon className="w-4 h-4" style={{ color: item.iconColor }} />
                          </span>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Account actions */}
              <div className="py-2 border-t border-gray-100">
                <Link
                  href="/dashboard"
                  role="menuitem"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-[13px] text-text-dark hover:bg-gray-100 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-text-body" />
                  <span className="font-medium">Dashboard</span>
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
