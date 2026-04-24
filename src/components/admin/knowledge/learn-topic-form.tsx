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
  imageUrl: string;
  category: string;
  displayOrder: number;
  isPublished: boolean;
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
  imageUrl: "",
  category: "basics",
  displayOrder: 0,
  isPublished: true,
};

export function LearnTopicForm({
  initial,
  mode,
}: {
  initial?: LearnTopicFormInitial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<LearnTopicFormInitial>(initial ?? EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onUploadImage(file: File) {
    setErr(null);
    setUploading(true);
    try {
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
      setForm((f) => ({ ...f, imageUrl: body.url }));
    } finally {
      setUploading(false);
    }
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
        label="Cover image"
        hint="Optional. When set, the rebuild's basics card shows this image in place of the icon."
      >
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="Paste an https URL or upload below"
            value={form.imageUrl}
            onChange={(e) =>
              setForm((f) => ({ ...f, imageUrl: e.target.value }))
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
                if (f) void onUploadImage(f);
              }}
            />
          </label>
          {form.imageUrl ? (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
              className="rounded-md border border-gray-200 px-3 text-sm font-medium hover:bg-gray-50"
              title="Clear image — fall back to the selected icon"
            >
              Clear
            </button>
          ) : null}
        </div>
        {form.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.imageUrl}
            alt=""
            className="mt-2 h-24 w-24 rounded-md border border-gray-200 object-cover"
          />
        ) : null}
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

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8A8A]">
          List-row preview
        </p>
        <LearnTopicPreviewRow
          title={form.title}
          summary={form.summary}
          iconKey={form.iconKey}
          imageUrl={form.imageUrl}
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
