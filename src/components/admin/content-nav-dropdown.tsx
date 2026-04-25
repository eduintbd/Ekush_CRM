"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Single "Contents" button in the admin top-nav that expands to show
 * the four Knowledge Center CMS surfaces (Videos / Articles / Topics /
 * Research). Keeps the nav bar compact — before this, each surface
 * had its own pill so the bar was getting long as we added sections.
 *
 * Interaction contract:
 *   - Click the button → toggle the dropdown.
 *   - Click a link → navigate (dropdown auto-closes because the
 *     component unmounts when the route changes).
 *   - Click outside / press Escape → close.
 *
 * The button lights up orange when the current route is under any of
 * the four child paths, matching the colour convention used by the
 * sibling nav links.
 */

const LINKS = [
  { href: "/admin/videos", label: "Videos" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/learn-topics", label: "Topics" },
  { href: "/admin/research-reports", label: "Research" },
  // Fact Sheets live under Research in the admin nav so all
  // published fund-research surfaces sit together. Still editable
  // at /admin/fund-fact-sheets; just no longer a top-nav pill.
  { href: "/admin/fund-fact-sheets", label: "Fact Sheets" },
] as const;

export function ContentNavDropdown() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isActive = LINKS.some((l) => pathname?.startsWith(l.href));

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close whenever the route changes (Link navigation).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1 transition-colors ${
          isActive
            ? "text-ekush-orange"
            : "text-text-dark hover:text-ekush-orange"
        }`}
      >
        Contents
        <Chevron open={open} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {LINKS.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                role="menuitem"
                className={`block px-4 py-2 text-[13px] hover:bg-[#FFF4EC] ${
                  active
                    ? "bg-[#FFF4EC] font-semibold text-ekush-orange"
                    : "text-text-dark"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
