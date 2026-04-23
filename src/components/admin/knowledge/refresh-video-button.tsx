"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Inline "Refresh" action used on the /admin/videos list row. Hits
 * /api/admin/videos/[id]/refresh which re-pulls title, thumbnail,
 * duration, and view/like counts from YouTube in one call.
 *
 * Kept as its own tiny client island so the surrounding table page
 * stays a Server Component — most of its work is already a Prisma
 * query, no reason to pull the whole tree to the client.
 */
export function RefreshVideoButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handle() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/videos/${id}/refresh`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(body?.error ?? "Refresh failed");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        className="text-[12px] font-semibold text-[#8A8A8A] hover:text-ekush-orange disabled:opacity-50"
      >
        {busy ? "Refreshing…" : "Refresh"}
      </button>
      {err ? (
        <span className="ml-2 text-[11px] text-red-600" title={err}>
          !
        </span>
      ) : null}
    </>
  );
}
