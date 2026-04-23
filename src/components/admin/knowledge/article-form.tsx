"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArticlePreviewCard } from "./previews";

/**
 * Article create / edit form. Mirrors VideoForm's split layout:
 * left = fields, right = live preview. Cover image can be either
 * pasted as a URL (Open Graph image from the publisher) or uploaded
 * via /api/admin/articles/upload-cover which routes through Vercel
 * Blob.
 *
 * The "Fetch from URL" button is wired in Step 6; for now admins
 * paste each field manually. Read-time falls back to a computed
 * default (200 wpm) whenever admin clicks "Auto" next to the
 * read-time input.
 */

export type ArticleFormInitial = {
  id?: string;
  articleUrl: string;
  publisher: string;
  title: string;
  excerpt: string;
  coverImageUrl: string;
  category: string;
  publishedAt: string; // YYYY-MM-DD
  readTimeMinutes: number;
  displayOrder: number;
  isPublished: boolean;
};

const PUBLISHERS = [
  { value: "tbs", label: "The Business Standard" },
  { value: "financial_express", label: "Financial Express" },
  { value: "other", label: "Other" },
] as const;

const CATEGORIES = [
  { value: "opinion", label: "Opinion" },
  { value: "analysis", label: "Analysis" },
  { value: "feature", label: "Feature" },
  { value: "interview", label: "Interview" },
] as const;

const EMPTY: ArticleFormInitial = {
  articleUrl: "",
  publisher: "tbs",
  title: "",
  excerpt: "",
  coverImageUrl: "",
  category: "opinion",
  publishedAt: "",
  readTimeMinutes: 3,
  displayOrder: 0,
  isPublished: true,
};

export function ArticleForm({
  initial,
  mode,
}: {
  initial?: ArticleFormInitial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<ArticleFormInitial>(initial ?? EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const url =
      mode === "create"
        ? "/api/admin/articles"
        : `/api/admin/articles/${form.id}`;
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
      router.push("/admin/articles");
      router.refresh();
    });
  }

  async function onDelete() {
    if (!form.id) return;
    if (!confirm("Delete this article? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/articles/${form.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setErr("Delete failed");
      return;
    }
    startTransition(() => {
      router.push("/admin/articles");
      router.refresh();
    });
  }

  async function onUpload(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/articles/upload-cover", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErr(body?.error ?? "Upload failed");
        return;
      }
      const body = await res.json();
      setForm((f) => ({ ...f, coverImageUrl: body.url }));
    } finally {
      setUploading(false);
    }
  }

  function autoComputeReadTime() {
    const words = form.excerpt.trim().split(/\s+/).filter(Boolean).length;
    // 200 words/minute, floor 1.
    setForm((f) => ({
      ...f,
      readTimeMinutes: Math.max(1, Math.round(words / 200) || 1),
    }));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]"
    >
      <div className="space-y-4">
        <Field label="Article URL" hint="Step 6 will auto-fetch title/image/excerpt from this.">
          <div className="flex gap-2">
            <input
              type="url"
              value={form.articleUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, articleUrl: e.target.value }))
              }
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              disabled
              title="Auto-fetch lands in Step 6 — paste values manually for now"
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-400"
            >
              Fetch from URL
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Publisher">
            <select
              value={form.publisher}
              onChange={(e) =>
                setForm((f) => ({ ...f, publisher: e.target.value }))
              }
              className={inputClass}
            >
              {PUBLISHERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
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
        </div>

        <Field label="Title">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className={inputClass}
          />
        </Field>

        <Field label="Excerpt" hint="Shown under the headline on the card (≈ 2 lines).">
          <textarea
            value={form.excerpt}
            onChange={(e) =>
              setForm((f) => ({ ...f, excerpt: e.target.value }))
            }
            rows={3}
            className={inputClass}
          />
        </Field>

        <Field label="Cover image URL" hint="Paste an Open Graph image URL or upload a file.">
          <div className="flex gap-2">
            <input
              type="url"
              value={form.coverImageUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, coverImageUrl: e.target.value }))
              }
              className={`${inputClass} flex-1`}
            />
            <label className="cursor-pointer rounded-md border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50">
              {uploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUpload(f);
                }}
              />
            </label>
          </div>
        </Field>

        <div className="grid grid-cols-3 gap-3">
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
          <Field label="Read time (min)">
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={form.readTimeMinutes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    readTimeMinutes: Number(e.target.value) || 1,
                  }))
                }
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={autoComputeReadTime}
                className="rounded-md border border-gray-200 px-3 text-xs font-medium hover:bg-gray-50"
              >
                Auto
              </button>
            </div>
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
              Hide from the public site without deleting.
            </span>
          </span>
        </label>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-ekush-orange px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {mode === "create" ? "Create article" : "Save changes"}
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

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8A8A]">
          Live preview
        </p>
        <ArticlePreviewCard
          title={form.title}
          excerpt={form.excerpt}
          coverImageUrl={form.coverImageUrl}
          publisher={form.publisher}
          category={form.category}
          publishedAt={form.publishedAt.slice(0, 10)}
          readTimeMinutes={form.readTimeMinutes}
        />
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
