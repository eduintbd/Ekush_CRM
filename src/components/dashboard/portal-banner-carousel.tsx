"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Investor portal /dashboard hero banner carousel. Renders one slide
// per admin-published LearnTopic with showInPortalBanner=true. When
// the input array has 2+ slides we auto-rotate every 6s and expose
// dot indicators bottom-right. With a single slide the rotation is
// disabled (no dots, no timer). With zero slides this component
// returns null — the parent dashboard then renders the static
// <TaxRebateBanner /> as the fallback.
//
// Image guidance (admin-side): 1600 × 485 px (3.3:1). The navy
// gradient overlay covers the left 65% of the canvas; copy + CTA
// sit there. Right side stays photo-clear.

export type PortalBannerItem = {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  ctaUrl: string | null;
  ctaLabel: string | null;
};

const ROTATE_MS = 6000;

export function PortalBannerCarousel({ items }: { items: PortalBannerItem[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    const t = setInterval(() => {
      setActive((i) => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [items.length, paused]);

  if (items.length === 0) return null;

  return (
    <section
      role="region"
      aria-label="Portal announcements"
      className="relative w-full overflow-hidden rounded-2xl bg-navy shadow-[0_4px_14px_rgba(15,30,61,0.20)] aspect-auto min-h-[220px] md:aspect-[3.3/1] md:min-h-[260px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {items.map((item, idx) => {
        const isActive = idx === active;
        return (
          <div
            key={item.id}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-700 ${
              isActive ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Background image */}
            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-no-repeat bg-[position:right_top]"
              style={{ backgroundImage: `url(${item.imageUrl})` }}
            />

            {/* Navy gradient overlay — same stops as the legacy
                TaxRebateBanner. Desktop is wider; mobile darker so
                the copy stays legible against the photo. */}
            <div
              aria-hidden
              className="hidden md:block absolute inset-0 pointer-events-none z-[1]"
              style={{
                background:
                  "linear-gradient(to right, rgba(15,30,61,0.92) 0%, rgba(15,30,61,0.75) 40%, rgba(15,30,61,0.15) 65%, rgba(15,30,61,0) 100%)",
              }}
            />
            <div
              aria-hidden
              className="block md:hidden absolute inset-0 pointer-events-none z-[1]"
              style={{
                background:
                  "linear-gradient(to right, rgba(15,30,61,0.94) 0%, rgba(15,30,61,0.85) 55%, rgba(15,30,61,0.45) 80%, rgba(15,30,61,0.15) 100%)",
              }}
            />

            {/* Copy + CTA */}
            <div className="relative z-[2] h-full flex items-center px-6 md:px-10">
              <div className="max-w-[60%] md:max-w-[55%] text-white">
                <h2 className="font-rajdhani text-[22px] md:text-[30px] font-bold leading-tight">
                  {item.title}
                </h2>
                {item.summary ? (
                  <p className="mt-2 text-[13px] md:text-[15px] text-white/80 line-clamp-3">
                    {item.summary}
                  </p>
                ) : null}
                {item.ctaUrl && item.ctaLabel ? (
                  <Link
                    href={item.ctaUrl}
                    className="inline-flex items-center mt-4 px-5 py-2 rounded-md bg-gold text-navy text-[13px] font-semibold hover:bg-gold-dark transition-colors"
                  >
                    {item.ctaLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}

      {items.length > 1 ? (
        <div
          className="absolute bottom-3 right-4 z-[3] flex gap-1.5"
          role="tablist"
          aria-label="Banner slide indicators"
        >
          {items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={idx === active}
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setActive(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === active ? "w-6 bg-white" : "w-2 bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
