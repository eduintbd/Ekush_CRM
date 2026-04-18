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

export function QuickActions() {
  const pathname = usePathname();

  return (
    <nav aria-label="Quick actions" className="w-full">
      <ul
        className={cn(
          // Mobile: 2x2 grid, fills the content area
          "grid grid-cols-2 gap-3",
          // Desktop: 4-up flex row, centered, capped width to align with charts above
          "md:flex md:justify-center md:gap-4 md:max-w-[680px] md:mx-auto"
        )}
      >
        {ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href} className="md:w-[150px]">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex flex-col items-center justify-center text-center",
                  "rounded-[15px] bg-navy hover:bg-navy-dark",
                  "px-4 py-5 gap-3 h-[135px] w-full md:h-[135px]",
                  "shadow-[0_4px_12px_rgba(15,30,61,0.18)]",
                  "transition-colors duration-200 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
                  isActive && "ring-1 ring-gold/30"
                )}
              >
                <item.Icon
                  size={46}
                  className="text-gold transition-transform duration-200 ease-out group-hover:scale-105"
                  aria-hidden
                />
                <span className="text-[14px] font-semibold leading-tight text-white">
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
