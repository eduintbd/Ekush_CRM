"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

type IconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean;
};

type IconComponent = (props: IconProps) => ReactElement;

function GoldBarsIcon({ size = 24, strokeWidth = 1.5, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {/* sparkle dots above the stack */}
      <circle cx="6.5" cy="4" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="2.8" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="4" r="0.6" fill="currentColor" stroke="none" />
      {/* top bar (smallest) */}
      <path d="M9 8 L15 8 L16 12 L8 12 Z" />
      {/* middle bar */}
      <path d="M7 13 L17 13 L18 17 L6 17 Z" />
      {/* bottom bar (widest) */}
      <path d="M5 18 L19 18 L20 22 L4 22 Z" />
    </svg>
  );
}

function TakaIcon({ size = 24, strokeWidth = 1.5, className, ...rest }: IconProps) {
  // Use the stroke width to bias the font weight so the symbol visually
  // tracks the active/inactive heaviness of the lucide icons.
  const fontWeight = strokeWidth >= 2 ? 800 : 600;
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
        y="18"
        textAnchor="middle"
        fontSize="20"
        fontWeight={fontWeight}
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

  return (
    <nav
      aria-label="Quick actions"
      className="bg-white w-full"
    >
      <ul
        className={cn(
          // Mobile: 2x2 grid, no dividers
          "grid grid-cols-2 gap-y-6",
          // Desktop: horizontal row, generous vertical padding
          "md:flex md:justify-around md:items-center md:gap-0 md:py-8"
        )}
      >
        {ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const tone = isActive ? "text-gold" : "text-brand";
          const hover = isActive ? "" : "hover:text-gold";
          return (
            <li
              key={item.href}
              className={cn(
                "relative flex justify-center",
                // Vertical divider on md+, hidden on mobile
                "md:[&:not(:last-child)]:after:content-[''] md:[&:not(:last-child)]:after:absolute",
                "md:[&:not(:last-child)]:after:right-0 md:[&:not(:last-child)]:after:top-1/2",
                "md:[&:not(:last-child)]:after:-translate-y-1/2 md:[&:not(:last-child)]:after:h-[65%]",
                "md:[&:not(:last-child)]:after:w-px md:[&:not(:last-child)]:after:bg-gray-200",
                "md:flex-1"
              )}
            >
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex flex-col items-center justify-center gap-2 px-4 py-2 rounded-md",
                  "transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                  tone,
                  hover
                )}
              >
                <item.Icon
                  size={28}
                  strokeWidth={isActive ? 2 : 1.5}
                  className="transition-colors duration-200"
                  aria-hidden
                />
                <span className="text-[13px] font-medium leading-tight text-center transition-colors duration-200">
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
