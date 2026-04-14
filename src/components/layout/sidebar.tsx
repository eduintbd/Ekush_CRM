"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  Calendar,
  Coins,
  PieChart,
  FileText,
  UserPen,
  Landmark,
  Users,
  Award,
  Gift,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions/buy", label: "Buy Units", icon: TrendingUp },
  { href: "/sip", label: "Start SIP", icon: Calendar },
  { href: "/transactions/sell", label: "Sell Units", icon: Coins },
  { href: "/statements", label: "Your Statement", icon: PieChart },
  { href: "/transactions", label: "Transactions", icon: FileText },
  { href: "/profile", label: "Edit Profile", icon: UserPen },
  { href: "/profile/bank", label: "Bank & BO", icon: Landmark },
  { href: "/profile/nominees", label: "Nominee(s)", icon: Users },
  { href: "/statements/tax", label: "Tax Certificate", icon: Award },
  { href: "/statements/dividends", label: "Dividend Option", icon: Gift },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[270px] bg-white shadow-sidebar overflow-hidden overflow-y-auto flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-8 py-8">
        <div className="w-10 h-10 bg-ekush-orange rounded-lg flex items-center justify-center font-bold text-white text-lg shrink-0">
          E
        </div>
        <div>
          <h1 className="font-bold text-[16px] text-navy font-rajdhani">Ekush WML</h1>
          <p className="text-[10px] text-text-muted tracking-wider uppercase">Investor Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/transactions" && pathname === "/transactions") ||
            (item.href === "/statements" && pathname === "/statements") ||
            (item.href !== "/transactions/buy" &&
              item.href !== "/transactions/sell" &&
              item.href !== "/transactions" &&
              item.href !== "/statements" &&
              item.href !== "/statements/tax" &&
              item.href !== "/statements/dividends" &&
              pathname.startsWith(item.href + "/"));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-10 py-[10px] text-[14px] font-medium transition-all duration-300",
                isActive
                  ? "text-ekush-orange"
                  : "text-text-dark hover:text-ekush-orange"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-ekush-orange rounded-l-sm" />
              )}
              <Icon
                className={cn(
                  "w-[18px] h-[18px] shrink-0 transition-colors",
                  isActive ? "text-ekush-orange" : "text-icon-muted"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
