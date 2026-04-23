"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { VideoPreviewCard } from "./previews";

/**
 * Video create / edit form. Same component serves both because the
 * shape of the inputs is identical — only the submit target differs.
 *
 * The right column shows a live VideoPreviewCard that updates as the
 * admin types. Step 5 will add a "Fetch metadata" button that calls
 * /api/admin/videos/fetch-metadata with the URL and prefills the
 * form. For Step 4 the admin still has to paste each field manually;
 * the button is present but disabled with a tooltip pointing forward.
 */

export type VideoFormInitial = {
  id?: string;
  youtubeUrl: string;
  videoId: string;
  title: string;
  category: string;
  thumbnailUrl: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  publishedAt: string; // YYYY-MM-DD in the picker
  isFeatured: boolean;
  displayOrder: number;
  isPublished: boolean;
};

const CATEGORIES = ["basics", "strategy", "tax", "industry"] as const;

const EMPTY: VideoFormInitial = {
  youtubeUrl: "",
  videoId: "",
  title: "",
  category: "basics",
  thumbnailUrl: "",
  duration: "",
  viewCount: 0,
  likeCount: 0,
  publishedAt: "",
  isFeatured: false,
  displayOrder: 0,
  isPublished: true,
};

export function VideoForm({
  initial,
  mode,
}: {
  initial?: VideoFormInitial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<VideoFormInitial>(initial ?? EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [pending, startTransition] = useTransition();

  // Calls /api/admin/videos/fetch-metadata for the URL currently in
  // the form. On success it overwrites the YouTube-owned fields
  // (title, videoId, thumbnail, duration, counts, published date) and
  // leaves admin-owned fields (category, order, featured, published
  // flag) alone.
  async function handleFetch() {
    setErr(null);
    if (!form.youtubeUrl.trim()) {
      setErr("Paste a YouTube URL first.");
      return;
    }
    setFetching(true);
    try {
      const res = await fetch("/api/admin/videos/fetch-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.youtubeUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(body?.error ?? "Fetch failed");
        return;
      }
      setForm((f) => ({
        ...f,
        youtubeUrl: body.youtubeUrl ?? f.youtubeUrl,
        videoId: body.videoId ?? f.videoId,
        title: body.title ?? f.title,
        thumbnailUrl: body.thumbnailUrl ?? f.thumbnailUrl,
        duration: body.duration ?? f.duration,
        viewCount: body.viewCount ?? f.viewCount,
        likeCount: body.likeCount ?? f.likeCount,
        publishedAt: body.publishedAt
          ? String(body.publishedAt).slice(0, 10)
          : f.publishedAt,
      }));
    } finally {
      setFetching(false);
    }
  }

  const publishedAtISO = useMemo(() => {
    if (!form.publishedAt) return "";
    const d = new Date(form.publishedAt);
    return Number.isNaN(d.getTime()) ? form.publishedAt : d.toISOString();
  }, [form.publishedAt]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const payload = { ...form, publishedAt: publishedAtISO };
    const url =
      mode === "create"
        ? "/api/admin/videos"
        : `/api/admin/videos/${form.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErr(body?.error ?? "Save failed");
      return;
    }
    startTransition(() => {
      router.push("/admin/videos");
      router.refresh();
    });
  }

  async function onDelete() {
    if (!form.id) return;
    if (!confirm("Delete this video? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/videos/${form.id}`, { method: "DELETE" });
    if (!res.ok) {
      setErr("Delete failed");
      return;
    }
    startTransition(() => {
      router.push("/admin/videos");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]"
    >
      {/* Left column: fields */}
      <div className="space-y-4">
        <UrlFetchRow
          value={form.youtubeUrl}
          onChange={(v) => setForm((f) => ({ ...f, youtubeUrl: v }))}
          onFetch={handleFetch}
          fetching={fetching}
        />

        <Field label="Video ID" hint="Auto-filled from the URL. Any 11-char YouTube ID works if you prefer to paste it directly.">
          <input
            type="text"
            value={form.videoId}
            onChange={(e) =>
              setForm((f) => ({ ...f, videoId: e.target.value }))
            }
            className={inputClass}
          />
        </Field>

        <Field label="Title">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Duration" hint="e.g. 14:32">
            <input
              type="text"
              value={form.duration}
              onChange={(e) =>
                setForm((f) => ({ ...f, duration: e.target.value }))
              }
              placeholder="14:32"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Thumbnail URL">
          <input
            type="url"
            value={form.thumbnailUrl}
            onChange={(e) =>
              setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))
            }
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="View count">
            <input
              type="number"
              value={form.viewCount}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  viewCount: Number(e.target.value) || 0,
                }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Like count">
            <input
              type="number"
              value={form.likeCount}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  likeCount: Number(e.target.value) || 0,
                }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Published date">
            <input
              type="date"
              value={form.publishedAt.slice(0, 10)}
              onChange={(e) =>
                setForm((f) => ({ ...f, publishedAt: e.target.value }))
              }
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Display order">
            <input
              type="number"
              value={form.displayOrder}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  displayOrder: Number(e.target.value) || 0,
                }))
              }
              className={inputClass}
            />
          </Field>
          <Toggle
            label="Featured"
            help="Only one video can be featured at a time. Toggling this on auto-demotes any other featured video."
            checked={form.isFeatured}
            onChange={(v) => setForm((f) => ({ ...f, isFeatured: v }))}
          />
          <Toggle
            label="Published"
            help="Hide from the public site without deleting."
            checked={form.isPublished}
            onChange={(v) => setForm((f) => ({ ...f, isPublished: v }))}
          />
        </div>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-ekush-orange px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {mode === "create" ? "Create video" : "Save changes"}
          </button>
          {mode === "edit" ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>

      {/* Right column: live preview */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8A8A]">
          Live preview
        </p>
        <VideoPreviewCard
          title={form.title}
          category={form.category}
          thumbnailUrl={form.thumbnailUrl}
          duration={form.duration}
          viewCount={form.viewCount}
          likeCount={form.likeCount}
          publishedAt={form.publishedAt.slice(0, 10)}
          isFeatured={form.isFeatured}
        />
        <p className="mt-2 text-[11px] text-[#8A8A8A]">
          Matches the ekushwml.com Video Library card at render time.
        </p>
      </div>
    </form>
  );
}

function UrlFetchRow({
  value,
  onChange,
  onFetch,
  fetching,
}: {
  value: string;
  onChange: (v: string) => void;
  onFetch: () => void;
  fetching: boolean;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-text-body">
        YouTube URL
      </label>
      <div className="mt-1 flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          onClick={onFetch}
          disabled={fetching || !value.trim()}
          className="rounded-md border border-ekush-orange bg-white px-4 py-2 text-sm font-semibold text-ekush-orange hover:bg-[#FFF4EC] disabled:opacity-50"
        >
          {fetching ? "Fetching…" : "Fetch"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-text-body">
        {label}
      </span>
      <span className="mt-1 block">{children}</span>
      {hint ? (
        <span className="mt-1 block text-[11px] text-[#8A8A8A]">{hint}</span>
      ) : null}
    </label>
  );
}

function Toggle({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-ekush-orange"
      />
      <span>
        <span className="block text-[13px] font-medium">{label}</span>
        {help ? (
          <span className="mt-0.5 block text-[11px] text-[#8A8A8A]">{help}</span>
        ) : null}
      </span>
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-ekush-orange focus:outline-none";
