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
  const [open, setOpen] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="fixed right-0 top-6 z-50 flex items-start justify-end"
    >
      {!open && (
        <button
          type="button"
          aria-label="Open services menu"
          onClick={() => setOpen(true)}
          className="bg-white hover:bg-gray-50 text-text-dark border border-gray-200 w-11 h-11 rounded-l-full shadow-lg flex items-center justify-center transition-colors"
        >
          <LayoutGrid className="w-5 h-5" />
        </button>
      )}

      {open && (
        <div className="bg-white text-text-dark rounded-l-xl shadow-2xl border border-gray-200 p-4 w-[323px] relative">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-text-dark">
              Services
            </p>
            <button
              type="button"
              aria-label="Close services menu"
              onClick={() => setOpen(false)}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-text-body" />
            </button>
          </div>
          <ul className="space-y-1">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-gray-100 transition-colors text-text-dark"
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
