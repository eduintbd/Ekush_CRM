"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  PieChart,
  FileText,
  UserPen,
  Award,
  Gift,
  LayoutGrid,
  X,
  type LucideIcon,
} from "lucide-react";

interface ServiceItem {
  href: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

const ITEMS: ServiceItem[] = [
  { href: "/statements", label: "Investment Summary", icon: PieChart, iconColor: "#2DAAB8", iconBg: "#E8F8FA" },
  { href: "/transactions", label: "Transaction History", icon: FileText, iconColor: "#7C3AED", iconBg: "#F3EFFE" },
  { href: "/profile", label: "Profile Management", icon: UserPen, iconColor: "#0EA5E9", iconBg: "#E0F2FE" },
  { href: "/tax-certificate", label: "Tax Certificate", icon: Award, iconColor: "#16A34A", iconBg: "#DCFCE7" },
  { href: "/dividends", label: "Dividend Statement", icon: Gift, iconColor: "#DB2777", iconBg: "#FCE7F3" },
];

export function FloatingServicesMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-start"
    >
      <button
        type="button"
        aria-label={open ? "Close services menu" : "Open services menu"}
        onClick={() => setOpen((v) => !v)}
        className="bg-[#1860a8] hover:bg-[#144c87] text-white w-11 h-11 rounded-r-full shadow-lg flex items-center justify-center transition-colors"
      >
        {open ? <X className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
      </button>

      {open && (
        <div className="ml-2 bg-[#1860a8] text-white rounded-xl shadow-2xl p-4 w-[240px]">
          <p className="text-[13px] font-semibold uppercase tracking-wider mb-3 px-1">
            Services
          </p>
          <ul className="space-y-1">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/15 transition-colors"
                  >
                    <span
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: item.iconBg }}
                    >
                      <Icon className="w-4 h-4" style={{ color: item.iconColor }} />
                    </span>
                    <span className="text-[13px] font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
