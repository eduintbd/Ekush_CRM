"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  FileText,
  Gift,
  PieChart,
  Receipt,
  UserPen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Six service tiles surfaced on the dashboard, mirroring the
 * QuickActions banner style (navy fill / gold icon / white labels)
 * so the page reads as one coherent action surface — top row is the
 * money-moving actions (buy / SIP / progress / sell), bottom row is
 * the records-and-reports actions.
 *
 * Items here are intentionally a duplicate of TopBar.SERVICE_ITEMS
 * (same icon, label, href set) — the visual treatment is different
 * enough that pulling from one source would force one of the two
 * surfaces into a compromise. If a third surface needs the same
 * list, factor it then.
 */

interface ShortcutItem {
  href: string;
  labelTop: string;
  labelBottom: string;
  Icon: LucideIcon;
}

const ITEMS: ShortcutItem[] = [
  { href: "/statements", labelTop: "Investment", labelBottom: "Summary", Icon: PieChart },
  { href: "/transactions", labelTop: "Transaction", labelBottom: "History", Icon: FileText },
  { href: "/profile", labelTop: "Profile", labelBottom: "Management", Icon: UserPen },
  { href: "/unit-certificate", labelTop: "Unit", labelBottom: "Certificate", Icon: Receipt },
  { href: "/tax-certificate", labelTop: "Tax", labelBottom: "Certificate", Icon: Award },
  { href: "/dividends", labelTop: "Dividend", labelBottom: "Statement", Icon: Gift },
];

export function ServiceShortcuts() {
  const pathname = usePathname();

  return (
    <nav aria-label="Investor services" className="w-full">
      <ul
        className={cn(
          // Mobile: 2-up; tablet: 3-up; desktop: 6-up centered
          "grid grid-cols-2 gap-2.5 sm:grid-cols-3",
          "md:flex md:justify-center md:gap-2.5 md:max-w-[640px] md:mx-auto",
        )}
      >
        {ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href} className="md:w-[100px]">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                data-active={isActive ? "true" : undefined}
                data-shortcut="true"
                className={cn(
                  "group/item flex flex-col items-center justify-center text-center",
                  "h-[120px] md:h-[90px] w-full",
                  "px-2.5 py-2.5 gap-1.5",
                  "rounded-[13px] border border-transparent",
                  "transition-[background-color,border-color,box-shadow] duration-200 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
                  isActive
                    ? "bg-navy shadow-[0_4px_10px_rgba(15,30,61,0.18)]"
                    : "bg-transparent shadow-none",
                  !isActive &&
                    "hover:bg-[#1B2D56] hover:shadow-[0_4px_10px_rgba(15,30,61,0.18)]",
                  // Exclusive-active: while another tile is hovered, the
                  // committed tile demotes to idle so only one tile reads
                  // navy at a time. Mirrors QuickActions.
                  isActive &&
                    "group-has-[[data-shortcut]:hover]/actions:[&:not(:hover)]:!bg-transparent group-has-[[data-shortcut]:hover]/actions:[&:not(:hover)]:!shadow-none",
                )}
              >
                <item.Icon
                  size={26}
                  className={cn(
                    "text-gold transition-transform duration-200 ease-out",
                    isActive && "scale-110",
                    !isActive && "group-hover/item:scale-110",
                    isActive &&
                      "group-has-[[data-shortcut]:hover]/actions:group-[&:not(:hover)]/item:!scale-100",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[11.5px] leading-tight font-medium transition-colors duration-200 ease-out",
                    isActive ? "text-white" : "text-brand",
                    !isActive && "group-hover/item:text-white",
                    isActive &&
                      "group-has-[[data-shortcut]:hover]/actions:group-[&:not(:hover)]/item:!text-brand",
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
