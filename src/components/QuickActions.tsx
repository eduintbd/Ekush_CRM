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
  labelTop: string;
  labelBottom: string;
  Icon: IconComponent;
}

const ITEMS: ActionItem[] = [
  { href: "/transactions/buy", labelTop: "Buy", labelBottom: "Units", Icon: GoldBarsIcon },
  { href: "/sip", labelTop: "Start", labelBottom: "SIP", Icon: CalendarClock as unknown as IconComponent },
  { href: "/goals", labelTop: "Progress", labelBottom: "Report", Icon: BarChart3 as unknown as IconComponent },
  { href: "/transactions/sell", labelTop: "Sell", labelBottom: "Units", Icon: TakaIcon },
];

export function QuickActions() {
  const pathname = usePathname();

  // On the dashboard root, default Buy Units to active.
  const isItemActive = (href: string) => {
    if (pathname === "/dashboard" && href === "/transactions/buy") return true;
    return pathname === href;
  };

  return (
    <nav aria-label="Quick actions" className="w-full">
      <ul
        className={cn(
          // Mobile: 2x2 grid, slightly larger tap targets
          "grid grid-cols-2 gap-2.5",
          // Desktop: 4-up centered row, ~390px total
          "md:flex md:justify-center md:gap-2.5 md:max-w-[400px] md:mx-auto"
        )}
      >
        {ITEMS.map((item) => {
          const isActive = isItemActive(item.href);

          return (
            <li key={item.href} className="md:w-[90px]">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex flex-col items-center justify-center text-center",
                  // Fixed dimensions so width does not shift between states
                  "h-[120px] md:h-[90px] w-full",
                  "px-2.5 py-2.5 gap-1.5",
                  "rounded-[13px] border border-transparent",
                  "transition-[background-color,border-color,box-shadow,color] duration-200 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
                  isActive
                    ? "bg-navy shadow-[0_4px_10px_rgba(15,30,61,0.18)]"
                    : "bg-transparent shadow-none"
                )}
              >
                <item.Icon
                  size={26}
                  className="text-gold"
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[11.5px] leading-tight font-medium transition-colors duration-200 ease-out",
                    isActive
                      ? "text-white"
                      : "text-brand group-hover:text-gold"
                  )}
                >
                  {item.labelTop}
                  <br />
                  {item.labelBottom}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
