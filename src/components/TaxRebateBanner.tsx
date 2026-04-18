import Link from "next/link";

// Photo lives at public/images/tax-rebate-banner.png and is served at /images/tax-rebate-banner.png.
// If the file is missing, the navy fallback color (bg-navy) shows through — no placeholder is imported.
const BANNER_IMAGE = "/images/tax-rebate-banner.png";

// Buy Units route — must mirror QuickActions.tsx
const BUY_UNITS_HREF = "/transactions/buy";

export default function TaxRebateBanner() {
  return (
    <section
      role="region"
      aria-label="Tax rebate promotion — invest to save on income tax."
      className="relative w-full overflow-hidden rounded-2xl bg-navy shadow-[0_4px_14px_rgba(15,30,61,0.20)] aspect-[3.3/1] min-h-[200px] md:min-h-[180px] font-bengali"
      style={{
        backgroundImage: `url(${BANNER_IMAGE})`,
        backgroundSize: "cover",
        // Bias 10% closer to the top so the model's head stops getting clipped by the rounded corner.
        backgroundPosition: "right 5%",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#0F1E3D",
      }}
    >
      {/* Per-component scoped styles — keyframes + reduced-motion override */}
      <style>{`
        @keyframes goldDotPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
        .gold-dot { animation: goldDotPulse 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gold-dot { animation: none; }
        }
      `}</style>

      {/* Gradient overlay — desktop (extended for the narrower feature-card width). */}
      <div
        aria-hidden
        className="hidden md:block absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(to right, rgba(15,30,61,0.90) 0%, rgba(15,30,61,0.75) 35%, rgba(15,30,61,0.35) 55%, rgba(15,30,61,0) 68%)",
        }}
      />
      {/* Gradient overlay — mobile (denser middle band so text stays legible). */}
      <div
        aria-hidden
        className="block md:hidden absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(to right, rgba(15,30,61,0.90) 0%, rgba(15,30,61,0.75) 45%, rgba(15,30,61,0.35) 60%, rgba(15,30,61,0) 75%)",
        }}
      />

      {/* Text column — left side, vertically centered */}
      <div className="relative z-[2] flex h-full items-center">
        <div className="pl-6 md:pl-6 pr-4 py-4 max-w-[58%]">
          {/* Eyebrow pill */}
          <span
            className="inline-block rounded-md text-[13px] md:text-[14px] font-medium"
            style={{
              color: "#F5B800",
              border: "1px solid rgba(245,184,0,0.5)",
              padding: "4px 11px",
              marginBottom: "10px",
            }}
          >
            আয়কর রিবেট · আয়কর আইন ২০২৩
          </span>

          {/* Headline */}
          <h3
            className="text-white font-semibold text-[21px] md:text-[26px] leading-[1.2]"
            style={{ marginBottom: "6px" }}
          >
            ৭৫,০০০ টাকা পর্যন্ত{" "}
            <span style={{ color: "#F5B800", fontWeight: 700 }}>কর সাশ্রয়</span>{" "}
            করুন
          </h3>

          {/* Subheadline */}
          <p
            className="text-white/90 text-[14px] md:text-[16px] leading-[1.4]"
            style={{ maxWidth: "480px", marginBottom: "12px" }}
          >
            একুশ ম্যানেজড ফান্ডে ৫ লক্ষ টাকা বিনিয়োগ করে চলতি অর্থবছরে আয়কর রিবেট গ্রহণ করুন।
          </p>

          {/* Footer row: CTA + deadline */}
          <div className="flex flex-wrap items-center gap-x-[14px] gap-y-2">
            <Link
              href={BUY_UNITS_HREF}
              className="inline-flex items-center rounded-md font-semibold text-[15px] md:text-[17px] transition-colors duration-[180ms] hover:bg-[#FFCA28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              style={{
                backgroundColor: "#F5B800",
                color: "#0F1E3D",
                padding: "10px 20px",
              }}
            >
              বিনিয়োগ শুরু করুন →
            </Link>

            <span
              className="inline-flex items-center gap-2 text-[14px] md:text-[14px] font-medium"
              style={{ color: "#F5B800" }}
            >
              <span
                aria-hidden
                className="gold-dot inline-block rounded-full"
                style={{
                  width: "6px",
                  height: "6px",
                  backgroundColor: "#F5B800",
                }}
              />
              শেষ সময়: ৩০ জুন ২০২৬
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
