"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

type IconProps = {
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
};

type IconComponent = (props: IconProps) => ReactElement;

function GoldBarsIcon({ size = 24, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      {...rest}
    >
      {/* sparkle dots above the stack */}
      <circle cx="6.5" cy="3.5" r="0.7" />
      <circle cx="12" cy="2.4" r="0.7" />
      <circle cx="17.5" cy="3.5" r="0.7" />
      {/* top bar (smallest) */}
      <path d="M9 7.5 L15 7.5 L16 11.5 L8 11.5 Z" />
      {/* middle bar */}
      <path d="M7 12.5 L17 12.5 L18 16.5 L6 16.5 Z" />
      {/* bottom bar (widest) */}
      <path d="M5 17.5 L19 17.5 L20 21.5 L4 21.5 Z" />
    </svg>
  );
}

function TakaIcon({ size = 24, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...rest}
    >
      <text
        x="12"
        y="19"
        textAnchor="middle"
        fontSize="22"
        fontWeight={800}
        fill="currentColor"
        fontFamily="'Noto Sans Bengali', 'SolaimanLipi', system-ui, sans-serif"
      >
        ৳
      </text>
    </svg>
  );
}

interface ActionItem {
  href: string;
  label: string;
  Icon: IconComponent;
}

const ITEMS: ActionItem[] = [
  { href: "/transactions/buy", label: "Buy Units", Icon: GoldBarsIcon },
  { href: "/sip", label: "Start SIP", Icon: CalendarClock as unknown as IconComponent },
  { href: "/goals", label: "Progress Report", Icon: BarChart3 as unknown as IconComponent },
  { href: "/transactions/sell", label: "Sell Units", Icon: TakaIcon },
];

export type QuickActionsActiveStyle = "glow" | "invert";

interface QuickActionsProps {
  activeStyle?: QuickActionsActiveStyle;
}

export function QuickActions({ activeStyle = "glow" }: QuickActionsProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Quick actions" className="w-full">
      <ul
        className={cn(
          // Mobile: 2x2 grid, slightly taller cards
          "grid grid-cols-2 gap-3",
          // Desktop: 4-up centered row, total ~470px wide
          "md:flex md:justify-center md:gap-3 md:max-w-[470px] md:mx-auto"
        )}
      >
        {ITEMS.map((item) => {
          const isActive = pathname === item.href;

          // Per-style chrome
          const baseChrome =
            "rounded-[12px] border transition-all duration-200 ease-out";
          let chrome = "";
          let iconTone = "text-gold";
          let labelTone = "text-white";

          if (isActive && activeStyle === "invert") {
            chrome =
              "bg-white border-gold shadow-[0_2px_6px_rgba(15,30,61,0.10)]";
            iconTone = "text-navy";
            labelTone = "text-navy font-bold";
          } else if (isActive && activeStyle === "glow") {
            chrome =
              "bg-navy border-2 border-gold shadow-[0_0_16px_rgba(245,184,0,0.4)]";
            labelTone = "text-white font-bold";
          } else {
            // Inactive — same for both styles
            chrome =
              "bg-navy border-transparent hover:bg-navy-dark shadow-[0_3px_8px_rgba(15,30,61,0.18)]";
          }

          return (
            <li key={item.href} className="md:w-[110px]">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex flex-col items-center justify-center text-center",
                  "h-[140px] md:h-[110px] w-full",
                  "px-3 py-3 gap-2",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
                  baseChrome,
                  chrome
                )}
              >
                <item.Icon
                  size={30}
                  className={cn(
                    "transition-transform duration-200 ease-out",
                    iconTone,
                    isActive && activeStyle === "glow" && "scale-110"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[12.5px] leading-tight font-medium",
                    labelTone
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
