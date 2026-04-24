/**
 * Live-preview cards for the Knowledge Center admin forms. These
 * intentionally mirror the rebuild's public cards on ekushwml.com's
 * /knowledge page so admins see exactly what will render after
 * save. Styling is a pragmatic copy, not a shared source — the
 * admin panel can't import from the rebuild repo. Keep visual
 * drift ≤ ~10% between this file and
 * ekushwml-rebuild/web/src/components/knowledge/*
 *
 * Every preview is a pure presentational component. No state, no
 * fetches. Forms pass in-memory values; save flows elsewhere.
 */

type VideoPreviewProps = {
  title: string;
  category: string;
  thumbnailUrl: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  isFeatured: boolean;
};

export function VideoPreviewCard(v: VideoPreviewProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-black ${
        v.isFeatured ? "aspect-[16/11]" : "aspect-[16/9]"
      }`}
    >
      {v.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={v.thumbnailUrl}
          alt={v.title}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
          Paste a YouTube URL to load thumbnail
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      {v.duration ? (
        <span className="absolute right-3 top-3 z-10 rounded bg-black/75 px-2 py-1 text-[11px] font-semibold text-white">
          {v.duration}
        </span>
      ) : null}
      <span
        aria-hidden
        className={`absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FF0000] text-white shadow-lg ${
          v.isFeatured ? "h-[72px] w-[72px]" : "h-14 w-14"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-6 w-6">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <div className="absolute inset-x-0 bottom-0 z-10 p-5 text-white">
        <span className="mb-2 inline-block rounded bg-[#FF0000] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          {v.isFeatured ? "Featured · " : ""}
          {v.category || "Category"}
        </span>
        <h3
          className={`leading-snug ${
            v.isFeatured ? "text-[22px]" : "text-[15px]"
          }`}
        >
          {v.title || "Title will appear here"}
        </h3>
        {v.isFeatured ? (
          <div className="mt-1.5 flex gap-3 text-[11px] opacity-90">
            <span>{v.viewCount.toLocaleString()} views</span>
            <span>{v.likeCount.toLocaleString()} likes</span>
            <span>{v.publishedAt || "—"}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ArticlePreviewProps = {
  title: string;
  excerpt: string;
  coverImageUrl: string;
  publisher: string;
  category: string;
  publishedAt: string;
  readTimeMinutes: number;
};

const PUBLISHER_DOT: Record<string, { dot: string; label: string }> = {
  tbs: { dot: "#0A4D3C", label: "The Business Standard" },
  financial_express: { dot: "#C8102E", label: "Financial Express" },
  daily_star: { dot: "#0E2942", label: "The Daily Star" },
  prothom_alo: { dot: "#D4191F", label: "Prothom Alo" },
  other: { dot: "#8A8A8A", label: "Other" },
};

export function ArticlePreviewCard(a: ArticlePreviewProps) {
  const p = PUBLISHER_DOT[a.publisher] ?? PUBLISHER_DOT.other;
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#EEE6DD] bg-white">
      <div className="relative aspect-[16/10] bg-[#F5EFE6]">
        {a.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#8A8A8A]">
            Paste a URL or upload a cover
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide shadow-sm">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: p.dot }}
          />
          {p.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-[#8A8A8A]">
          {a.publishedAt || "YYYY-MM-DD"} ·{" "}
          {a.category ? a.category : "category"}
        </div>
        <h3 className="mb-2 text-[17px] leading-snug">
          {a.title || "Article headline will appear here"}
        </h3>
        <p className="flex-1 text-[13px] leading-[1.55] text-[#4A4A4A]">
          {a.excerpt || "Excerpt preview …"}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-[#EEE6DD] pt-3 text-[12px] text-[#8A8A8A]">
          <span>{a.readTimeMinutes || 1} min read</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF4EC] text-[#F27023]">
            →
          </span>
        </div>
      </div>
    </div>
  );
}

type LearnTopicPreviewProps = {
  title: string;
  summary: string;
  iconKey: string;
};

export function LearnTopicPreviewRow({
  title,
  summary,
  iconKey,
}: LearnTopicPreviewProps) {
  return (
    <div className="flex items-center gap-5 rounded-xl border border-[#EEE6DD] bg-white px-6 py-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#FFF4EC] text-[#F27023]">
        <IconFor iconKey={iconKey} />
      </span>
      <div className="flex-1">
        <p className="text-[16px] font-semibold">{title || "Topic title"}</p>
        <p className="mt-[3px] text-[13px] text-[#8A8A8A]">
          {summary || "One-line summary appears here"}
        </p>
      </div>
      <span className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-[#F27023] text-[#F27023]">
        +
      </span>
    </div>
  );
}

function IconFor({ iconKey }: { iconKey: string }) {
  // Inline SVGs so the admin preview doesn't need to share a sprite
  // with the rebuild. Paths are copies of the rebuild's knowledge-icons.
  const common = {
    viewBox: "0 0 24 24",
    className: "h-5 w-5",
    "aria-hidden": true as const,
  };
  switch (iconKey) {
    case "layers":
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2 1 8l11 6 11-6-11-6zm-7 9L1 13l11 6 11-6-4-2-7 3.8L5 11zm0 5L1 18l11 6 11-6-4-2-7 3.8L5 16z" />
        </svg>
      );
    case "bank":
      return (
        <svg {...common} fill="currentColor">
          <path d="M4 10h2v7H4v-7zm4 0h2v7H8v-7zm6 0h2v7h-2v-7zm4 0h2v7h-2v-7zM2 20h20v2H2v-2zM12 1 2 6v2h20V6L12 1z" />
        </svg>
      );
    case "chart":
      return (
        <svg
          {...common}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v18h18M7 15l4-4 4 4 5-6" />
        </svg>
      );
    case "cube":
    default:
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2 2 7v10l10 5 10-5V7L12 2zm0 2.2 7.5 3.8L12 11.8 4.5 8 12 4.2zM4 9.7l7 3.5v7.6l-7-3.5V9.7zm16 7.6-7 3.5v-7.6l7-3.5v7.6z" />
        </svg>
      );
  }
}
