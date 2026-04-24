"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Research Report create / edit form. Minimal on purpose — admins
 * only input a title, short description, and PDF. publishedAt is
 * taken from createdAt on the server; no authors / category / cover
 * thumbnail in v1 (cards render a uniform soft-orange document icon).
 */
export type ResearchReportFormInitial = {
  id?: string;
  title: string;
  description: string;
  pdfUrl: string;
  pdfSizeBytes: number | null;
  displayOrder: number;
  isPublished: boolean;
};

const EMPTY: ResearchReportFormInitial = {
  title: "",
  description: "",
  pdfUrl: "",
  pdfSizeBytes: null,
  displayOrder: 0,
  isPublished: true,
};

export function ResearchReportForm({
  initial,
  mode,
}: {
  initial?: ResearchReportFormInitial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<ResearchReportFormInitial>(
    initial ?? EMPTY,
  );
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onUpload(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        "/api/admin/research-reports/upload-pdf",
        { method: "POST", body: fd },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErr(body?.error ?? "Upload failed");
        return;
      }
      const body = (await res.json()) as { url: string; sizeBytes: number };
      setForm((f) => ({
        ...f,
        pdfUrl: body.url,
        pdfSizeBytes: body.sizeBytes,
      }));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.pdfUrl) {
      setErr("Upload a PDF before saving.");
      return;
    }
    const url =
      mode === "create"
        ? "/api/admin/research-reports"
        : `/api/admin/research-reports/${form.id}`;
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
      router.push("/admin/research-reports");
      router.refresh();
    });
  }

  async function onDelete() {
    if (!form.id) return;
    if (!confirm("Delete this report?")) return;
    const res = await fetch(`/api/admin/research-reports/${form.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setErr("Delete failed");
      return;
    }
    startTransition(() => {
      router.push("/admin/research-reports");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Title" hint="Headline shown on the Research & Insights card.">
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          maxLength={200}
          className={inputClass}
        />
      </Field>

      <Field
        label="Description"
        hint="1–2 sentences. Shown below the title on the public card."
      >
        <textarea
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          maxLength={500}
          rows={3}
          className={inputClass}
        />
      </Field>

      <Field
        label="PDF"
        hint="Required. Uploads to Vercel Blob; the public card links directly to this URL."
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
              {uploading
                ? "Uploading…"
                : form.pdfUrl
                ? "Replace PDF"
                : "Upload PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
            {form.pdfUrl ? (
              <a
                href={form.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold text-ekush-orange underline"
              >
                View current file
              </a>
            ) : (
              <span className="text-[13px] text-[#8A8A8A]">No file uploaded yet</span>
            )}
          </div>
          {form.pdfUrl ? (
            <p className="text-[11px] text-[#8A8A8A]">
              {form.pdfSizeBytes
                ? `Size: ${formatBytes(form.pdfSizeBytes)}`
                : "Size: unknown"}
            </p>
          ) : null}
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
          className={`${inputClass} w-32`}
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

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || uploading}
          className="rounded-md bg-ekush-orange px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {mode === "create" ? "Create report" : "Save changes"}
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

function formatBytes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} KB`;
  return `${n} B`;
}

const inputClass =
  "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-ekush-orange focus:outline-none";
