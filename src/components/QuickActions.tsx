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

// Two-color icon by design: cream cart frame + gold growth bars
// and arrow inside the basket. Hardcoded fills/strokes — the parent
// tile's text-gold class drives `currentColor`, but we want a
// fixed two-tone palette here so the cart and bars stay distinct
// regardless of the row's color treatment.
function BuyCartIcon({ size = 24, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      {...rest}
    >
      {/* Cart frame + wheels — cream outline */}
      <g
        fill="none"
        stroke="#F5F1E8"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Handle: short hook from upper-left into the basket lip */}
        <path d="M 14 22 L 26 22 L 32 38" />
        {/* Basket: trapezoid (wider at top, narrower at bottom) */}
        <path d="M 32 38 L 80 38 L 76 64 L 38 64 Z" />
        {/* Wheels */}
        <circle cx="44" cy="74" r="5" />
        <circle cx="70" cy="74" r="5" />
      </g>

      {/* Three gold bars inside the basket, ascending heights */}
      <g fill="#F5C518">
        <rect x="44" y="54" width="6" height="8" />
        <rect x="54" y="48" width="6" height="14" />
        <rect x="64" y="42" width="6" height="20" />
      </g>

      {/* Up arrow — gold, anchored at the top-right of the tallest bar */}
      <g
        fill="none"
        stroke="#F5C518"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 78 38 L 78 24" />
        <path d="M 72 30 L 78 24 L 84 30" />
      </g>
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
  { href: "/transactions/buy", labelTop: "Buy", labelBottom: "Units", Icon: BuyCartIcon },
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
                data-active={isActive ? "true" : undefined}
                data-shortcut="true"
                className={cn(
                  // Named group so the inner span/icon can react to this link's hover state
                  "group/item flex flex-col items-center justify-center text-center",
                  // Fixed dimensions so width never shifts between states
                  "h-[120px] md:h-[90px] w-full",
                  "px-2.5 py-2.5 gap-1.5",
                  "rounded-[13px] border border-transparent",
                  "transition-[background-color,border-color,box-shadow] duration-200 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",

                  // Base committed / idle chrome
                  isActive
                    ? "bg-navy shadow-[0_4px_10px_rgba(15,30,61,0.18)]"
                    : "bg-transparent shadow-none",

                  // Hover preview for an uncommitted card — slightly lighter navy.
                  // The committed card keeps its 0F1E3D bg on self-hover (already applied above).
                  !isActive &&
                    "hover:bg-[#1B2D56] hover:shadow-[0_4px_10px_rgba(15,30,61,0.18)]",

                  // ── Exclusive-active rule ──────────────────────────────────────────
                  // When the row contains a hovered link AND this committed card
                  // is itself not hovered, demote it back to idle chrome so only
                  // one tile ever appears navy at any moment.
                  isActive &&
                    "group-has-[[data-shortcut]:hover]/actions:[&:not(:hover)]:!bg-transparent group-has-[[data-shortcut]:hover]/actions:[&:not(:hover)]:!shadow-none"
                )}
              >
                <item.Icon
                  size={26}
                  className={cn(
                    "text-gold transition-transform duration-200 ease-out",
                    // Subtle scale-up follows whichever tile currently looks navy
                    isActive && "scale-110",
                    !isActive && "group-hover/item:scale-110",
                    // Demote scale on the committed card while the cursor previews another
                    isActive &&
                      "group-has-[[data-shortcut]:hover]/actions:group-[&:not(:hover)]/item:!scale-100"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[11.5px] leading-tight font-medium transition-colors duration-200 ease-out",
                    // Default label color
                    isActive ? "text-white" : "text-brand",
                    // Hover preview flips an uncommitted label to white
                    !isActive && "group-hover/item:text-white",
                    // Demote the committed label back to brand blue while the cursor previews another
                    isActive &&
                      "group-has-[[data-shortcut]:hover]/actions:group-[&:not(:hover)]/item:!text-brand"
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
