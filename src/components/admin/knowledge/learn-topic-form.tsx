"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LearnTopicPreviewRow } from "./previews";
import { TiptapEditor } from "./tiptap-editor";

/**
 * LearnTopic create / edit form. The body is edited with TipTap
 * (StarterKit) and stored as HTML — see tiptap-editor.tsx for
 * the toolbar subset we expose.
 *
 * The preview shows the collapsed list row (the "Basic of Mutual
 * Fund" card as it appears in its closed state). Clicking it on
 * the live site expands to show the body — replicating that inside
 * admin would duplicate a lot of markup for a small UX win, so we
 * defer to the existing /knowledge preview pane on the rebuild.
 */

export type LearnTopicFormInitial = {
  id?: string;
  title: string;
  summary: string;
  body: string; // HTML
  iconKey: string;
  images: string[];
  category: string;
  displayOrder: number;
  isPublished: boolean;
  // Surface visibility — independent flags. A topic can show on the
  // /knowledge Topic tab, in the floating What's New carousel, or both.
  showOnTopic: boolean;
  // What's New side-tab opt-in. Topics with showInWhatsNew = true
  // (and isPublished = true) appear in the rebuild's What's New
  // floating carousel. whatsNewOrder controls slot order — lower
  // first, null falls to the end (sorted by createdAt desc).
  showInWhatsNew: boolean;
  whatsNewOrder: number | null;
  // Optional CTA pinned to the What's New slide ("Open Portal" → URL).
  // Both fields together or both null; the form blocks half-built
  // states so the API parser never has to.
  ctaUrl: string | null;
  ctaLabel: string | null;
};

const ICONS = [
  { value: "cube", label: "Cube" },
  { value: "layers", label: "Layers" },
  { value: "bank", label: "Bank" },
  { value: "chart", label: "Chart" },
] as const;

const CATEGORIES = [
  { value: "basics", label: "Basics" },
  // faq + myth_buster kept for forward compatibility — today they're
  // still served from the rebuild's static knowledge.json.
  { value: "faq", label: "FAQ (unused today)" },
  { value: "myth_buster", label: "Myth Buster (unused today)" },
] as const;

const EMPTY: LearnTopicFormInitial = {
  title: "",
  summary: "",
  body: "",
  iconKey: "cube",
  images: [],
  category: "basics",
  displayOrder: 0,
  isPublished: true,
  showOnTopic: true,
  showInWhatsNew: false,
  whatsNewOrder: null,
  ctaUrl: null,
  ctaLabel: null,
};

const MAX_IMAGES = 10;

export function LearnTopicForm({
  initial,
  mode,
  pinnedImageUrl: pinnedImageUrlInitial = null,
}: {
  initial?: LearnTopicFormInitial;
  mode: "create" | "edit";
  pinnedImageUrl?: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<LearnTopicFormInitial>(initial ?? EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  // Which image URL (if any) is currently the homepage popup. Null
  // means nothing pinned site-wide. Mutating from here POSTs to the
  // singleton endpoint, which is cross-topic — pinning image A in
  // topic X auto-unpins whatever image was previously live, even if
  // that image belonged to a different topic.
  const [pinnedImageUrl, setPinnedImageUrl] = useState<string | null>(
    pinnedImageUrlInitial,
  );
  const [pinning, setPinning] = useState(false);

  async function setPopupImage(url: string | null) {
    setErr(null);
    setPinning(true);
    try {
      const res = await fetch("/api/admin/front-page-popup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErr(body?.error ?? "Pin failed");
        return;
      }
      setPinnedImageUrl(url);
    } finally {
      setPinning(false);
    }
  }

  // Multi-image upload. Each selected file is POSTed to the upload
  // endpoint serially and appended to `images`. Serial (not parallel)
  // so that progressive state updates don't race each other and the
  // final array order matches file-picker order.
  async function onUploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (form.images.length + 1 > MAX_IMAGES) {
          setErr(`Max ${MAX_IMAGES} images per topic.`);
          return;
        }
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/learn-topics/upload-image", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setErr(body?.error ?? "Upload failed");
          return;
        }
        const body = await res.json();
        setForm((f) => ({ ...f, images: [...f.images, body.url] }));
      }
    } finally {
      setUploading(false);
    }
  }

  function addImageUrl(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      setErr("Image URL must start with http:// or https://");
      return;
    }
    if (form.images.length >= MAX_IMAGES) {
      setErr(`Max ${MAX_IMAGES} images per topic.`);
      return;
    }
    setErr(null);
    setForm((f) => ({ ...f, images: [...f.images, trimmed] }));
  }

  function removeImage(idx: number) {
    const removed = form.images[idx];
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== idx),
    }));
    // Prevent orphan popups: if admin deletes the image currently
    // live on the homepage, clear the singleton too. The
    // fire-and-forget call is fine — if the POST fails, the pin
    // still shows on the homepage until admin tries again.
    if (removed && removed === pinnedImageUrl) {
      void setPopupImage(null);
    }
  }

  function moveImage(idx: number, dir: -1 | 1) {
    setForm((f) => {
      const next = [...f.images];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return f;
      [next[idx], next[j]] = [next[j], next[idx]];
      return { ...f, images: next };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const url =
      mode === "create"
        ? "/api/admin/learn-topics"
        : `/api/admin/learn-topics/${form.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErr(body?.error ?? "Save failed");
      return;
    }
    startTransition(() => {
      router.push("/admin/learn-topics");
      router.refresh();
    });
  }

  async function onDelete() {
    if (!form.id) return;
    if (!confirm("Delete this topic?")) return;
    const res = await fetch(`/api/admin/learn-topics/${form.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setErr("Delete failed");
      return;
    }
    startTransition(() => {
      router.push("/admin/learn-topics");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Title">
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className={inputClass}
        />
      </Field>

      <Field
        label="Summary"
        hint="One-line shown in the collapsed list row, e.g. 'Read · 4 min · The pooling model…'"
      >
        <input
          type="text"
          value={form.summary}
          onChange={(e) =>
            setForm((f) => ({ ...f, summary: e.target.value }))
          }
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Icon">
          <select
            value={form.iconKey}
            onChange={(e) =>
              setForm((f) => ({ ...f, iconKey: e.target.value }))
            }
            className={inputClass}
          >
            {ICONS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
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
      </div>

      <Field
        label={`Cover images (${form.images.length}/${MAX_IMAGES})`}
        hint="Optional. Upload one or more images — the basics card shows the first one by default; 2+ images turn the card into a swipeable deck. Empty list → icon fallback."
      >
        <ImageGalleryEditor
          images={form.images}
          uploading={uploading}
          onUpload={(files) => void onUploadFiles(files)}
          onAddUrl={addImageUrl}
          onRemove={removeImage}
          onMove={moveImage}
          maxImages={MAX_IMAGES}
          pinnedImageUrl={pinnedImageUrl}
          onPinToggle={(url) => void setPopupImage(url)}
          pinBusy={pinning}
        />
      </Field>

      <Field label="Body">
        <TiptapEditor
          value={form.body}
          onChange={(html) => setForm((f) => ({ ...f, body: html }))}
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 p-3">
        <input
          type="checkbox"
          checked={form.isPublished}
          onChange={(e) =>
            setForm((f) => ({ ...f, isPublished: e.target.checked }))
          }
          className="mt-1 h-4 w-4 accent-ekush-orange"
        />
        <span>
          <span className="block text-[13px] font-medium">Published</span>
          <span className="mt-0.5 block text-[11px] text-[#8A8A8A]">
            Drafts are saved to the database but hidden from /knowledge.
          </span>
        </span>
      </label>

      <div className="rounded-md border border-gray-200 p-3">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
          Where to show this topic
        </p>

        <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={form.showOnTopic}
            onChange={(e) =>
              setForm((f) => ({ ...f, showOnTopic: e.target.checked }))
            }
            className="mt-1 h-4 w-4 accent-ekush-orange"
          />
          <span className="flex-1">
            <span className="block text-[13px] font-medium">
              Show on Topic
            </span>
            <span className="mt-0.5 block text-[11px] text-[#8A8A8A]">
              Topic appears under &ldquo;Basic of Mutual Fund&rdquo; on the
              public /knowledge page. Requires Published.
            </span>
          </span>
        </label>

        <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={form.showInWhatsNew}
            onChange={(e) =>
              setForm((f) => ({ ...f, showInWhatsNew: e.target.checked }))
            }
            className="mt-1 h-4 w-4 accent-ekush-orange"
          />
          <span className="flex-1">
            <span className="block text-[13px] font-medium">
              Show in What&rsquo;s New
            </span>
            <span className="mt-0.5 block text-[11px] text-[#8A8A8A]">
              Topic appears in the floating &ldquo;What&rsquo;s new&rdquo; tab
              on every page of ekushwml.com. Requires Published + at least one
              image.
            </span>
          </span>
        </label>

        {form.showInWhatsNew ? (
          <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
            <label className="flex items-center gap-3">
              <span className="w-32 text-[12px] text-[#4A4A4A]">
                Display order
              </span>
              <input
                type="number"
                step="1"
                value={form.whatsNewOrder ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    whatsNewOrder: v === "" ? null : Number(v),
                  }));
                }}
                placeholder="(unordered — sorted by date)"
                className="w-56 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-ekush-orange focus:outline-none"
              />
              <span className="text-[11px] text-[#8A8A8A]">
                Lower number first. Leave blank to sort by date.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[12px] font-medium text-text-body">
                  CTA label
                </span>
                <input
                  type="text"
                  value={form.ctaLabel ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      ctaLabel: e.target.value === "" ? null : e.target.value,
                    }))
                  }
                  placeholder="e.g. Open Portal"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-[12px] font-medium text-text-body">
                  CTA URL
                </span>
                <input
                  type="url"
                  value={form.ctaUrl ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      ctaUrl: e.target.value === "" ? null : e.target.value,
                    }))
                  }
                  placeholder="https://…"
                  className={inputClass}
                />
              </label>
            </div>
            <p className="text-[11px] text-[#8A8A8A]">
              Both fields are required together. Leave both empty to hide the
              CTA on this slide.
            </p>
          </div>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8A8A]">
          List-row preview
        </p>
        <LearnTopicPreviewRow
          title={form.title}
          summary={form.summary}
          iconKey={form.iconKey}
          imageUrl={form.images[0]}
        />
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-ekush-orange px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {mode === "create" ? "Create topic" : "Save changes"}
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
    </form>
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

const inputClass =
  "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-ekush-orange focus:outline-none";

/**
 * Multi-image editor used inside the LearnTopic form. Composition:
 *   - Horizontal list of thumbnails (admin-uploaded or pasted).
 *     Each thumb has ← → reorder buttons and a ✕ remove button.
 *   - A URL input + Add button to paste a remote https link.
 *   - A multi-file Upload button that pushes selected files to
 *     /api/admin/learn-topics/upload-image serially.
 *
 * Uses plain <img> (not next/image) because these preview thumbs are
 * temporary admin-only views where layout-shift doesn't matter.
 */
function ImageGalleryEditor({
  images,
  uploading,
  onUpload,
  onAddUrl,
  onRemove,
  onMove,
  maxImages,
  pinnedImageUrl,
  onPinToggle,
  pinBusy,
}: {
  images: string[];
  uploading: boolean;
  onUpload: (files: FileList | null) => void;
  onAddUrl: (url: string) => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  maxImages: number;
  pinnedImageUrl: string | null;
  onPinToggle: (url: string | null) => void;
  pinBusy: boolean;
}) {
  const [urlDraft, setUrlDraft] = useState("");
  const atLimit = images.length >= maxImages;

  return (
    <div className="space-y-3">
      {images.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {images.map((src, i) => {
            const isPinned = src === pinnedImageUrl;
            return (
              <li
                key={`${src}-${i}`}
                className={`relative flex flex-col items-center gap-1 rounded-md border p-2 ${
                  isPinned
                    ? "border-ekush-orange bg-[#FFF4EC]"
                    : "border-gray-200 bg-white"
                }`}
              >
                {/* Pin-to-homepage-popup star. Only one image across
                    the whole site can be pinned at once — clicking a
                    star on a different image reassigns it. */}
                <button
                  type="button"
                  onClick={() => onPinToggle(isPinned ? null : src)}
                  disabled={pinBusy}
                  title={
                    isPinned
                      ? "Unpin from homepage popup"
                      : "Pin to homepage popup"
                  }
                  className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border text-[12px] disabled:opacity-50 ${
                    isPinned
                      ? "border-ekush-orange bg-ekush-orange text-white"
                      : "border-gray-200 bg-white text-[#8A8A8A] hover:text-ekush-orange"
                  }`}
                >
                  {isPinned ? "★" : "☆"}
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="h-20 w-20 rounded object-cover"
                />
                <div className="flex items-center gap-1 text-[11px] text-[#6A6A6A]">
                  <button
                    type="button"
                    onClick={() => onMove(i, -1)}
                    disabled={i === 0}
                    className="rounded border border-gray-200 px-1.5 hover:bg-gray-50 disabled:opacity-30"
                    title="Move left"
                  >
                    ←
                  </button>
                  <span className="px-1">{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => onMove(i, 1)}
                    disabled={i === images.length - 1}
                    className="rounded border border-gray-200 px-1.5 hover:bg-gray-50 disabled:opacity-30"
                    title="Move right"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    className="ml-1 rounded border border-red-200 bg-white px-1.5 text-red-600 hover:bg-red-50"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="text-[11px] text-[#8A8A8A]">
        Tap the ☆ on any image to pin it as the homepage popup. Only
        one image can be pinned site-wide — pinning a new one replaces
        the previous.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="url"
          placeholder="Paste an https URL…"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddUrl(urlDraft);
              setUrlDraft("");
            }
          }}
          disabled={atLimit}
          className={`${inputClass} flex-1 disabled:opacity-50`}
        />
        <button
          type="button"
          onClick={() => {
            onAddUrl(urlDraft);
            setUrlDraft("");
          }}
          disabled={atLimit || !urlDraft.trim()}
          className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Add URL
        </button>
        <label
          className={`cursor-pointer rounded-md border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 ${
            atLimit ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          {uploading ? "Uploading…" : "Upload files"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={atLimit || uploading}
            className="hidden"
            onChange={(e) => {
              onUpload(e.target.files);
              // Reset so selecting the same file twice still fires onChange.
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}
