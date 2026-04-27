"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Investor portal /dashboard hero banner carousel.
//
// One slide per uploaded image. If a single LearnTopic carries multiple
// images, every image becomes its own slide. With 2+ slides the
// carousel auto-rotates every 6 s and exposes dot indicators
// bottom-right. With a single slide it stays static (no dots, no
// timer). With zero slides this component returns null and the parent
// dashboard falls back to the static <TaxRebateBanner />.
//
// Styling intentionally MINIMAL: the slide renders only the image,
// edge-to-edge, fitted with object-cover. No gradient, no title
// overlay, no CTA pill — admins bake any text they want directly into
// the image. Optional click-through is honoured via the per-image
// `ctaUrl` field; when null, the slide is a plain non-interactive
// image.

export type PortalBannerItem = {
  // Stable key — usually "<topicId>:<imageIndex>" since one topic can
  // emit multiple slides.
  key: string;
  imageUrl: string;
  // Optional click target. Wraps the slide in a <Link> when set.
  ctaUrl: string | null;
  // Used as alt text for accessibility. The topic title is a sane
  // default; admins don't need to author it separately.
  alt: string;
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
      className="relative w-full overflow-hidden rounded-2xl bg-page-bg shadow-[0_4px_14px_rgba(15,30,61,0.12)] aspect-auto min-h-[220px] md:aspect-[3.3/1] md:min-h-[260px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {items.map((item, idx) => {
        const isActive = idx === active;
        const slide = (
          <div
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-700 ${
              isActive ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.alt}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        );
        return item.ctaUrl ? (
          <Link key={item.key} href={item.ctaUrl} aria-label={item.alt}>
            {slide}
          </Link>
        ) : (
          <div key={item.key}>{slide}</div>
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
              key={item.key}
              type="button"
              role="tab"
              aria-selected={idx === active}
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setActive(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === active
                  ? "w-6 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
                  : "w-2 bg-white/70 hover:bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
