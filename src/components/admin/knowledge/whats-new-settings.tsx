"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Inline editor for the singleton WhatsApp number used by the rebuild's
 * What's New side-tab. Renders at the top of /admin/learn-topics so
 * the field sits next to the topics it governs.
 *
 * Saving POSTs to /api/admin/whats-new-settings; the route trims +
 * non-digit characters, so admins can paste any common Bangladesh
 * format ("+880 1713 086101", "8801713086101") without thinking
 * about it.
 */

export function WhatsNewSettingsBar({
  initialNumber,
  flaggedCount,
}: {
  initialNumber: string | null;
  flaggedCount: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  async function onSave() {
    setErr(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/whats-new-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappNumber: value || null }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        whatsappNumber?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setErr(body?.error ?? "Save failed");
        return;
      }
      // Reflect the canonical (digits-only) form the server stored.
      if (typeof body.whatsappNumber === "string" || body.whatsappNumber === null) {
        setValue(body.whatsappNumber ?? "");
      }
      setSavedAt(Date.now());
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  const justSaved = savedAt && Date.now() - savedAt < 2500;

  return (
    <div className="rounded-lg border border-ekush-orange/30 bg-[#FFF9F3] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-text-dark">
            What&rsquo;s New side-tab
          </h2>
          <p className="mt-0.5 text-[12px] text-[#6A6A6A]">
            Toggle &ldquo;Show in What&rsquo;s New&rdquo; on a topic below to
            feature its image in the floating tab on every page of
            ekushwml.com. Currently flagged:{" "}
            <span className="font-semibold text-text-dark">
              {flaggedCount} topic{flaggedCount === 1 ? "" : "s"}
            </span>
            .
          </p>
        </div>
        <div className="flex shrink-0 items-end gap-2">
          <label className="block">
            <span className="block text-[11px] font-medium text-text-body">
              WhatsApp number
            </span>
            <input
              type="tel"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="8801713086101"
              className="mt-1 w-56 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-ekush-orange focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-md bg-ekush-orange px-4 py-2 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : justSaved ? "Saved ✓" : "Save"}
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[#8A8A8A]">
        International format, no leading +. The button below each card opens
        <span className="font-mono"> wa.me/&lt;number&gt;</span> in a new tab.
        Leave blank to hide the WhatsApp button on every card.
      </p>
      {err ? <p className="mt-2 text-[12px] text-red-600">{err}</p> : null}
    </div>
  );
}
