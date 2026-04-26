"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

/**
 * Per-row delete trigger for the NAV history table. Slotted into the
 * Actions column on /admin/nav-entry. The page itself is a server
 * component, so the only thing that needs client behaviour is this
 * tiny widget — confirm() prompt → DELETE → router.refresh().
 *
 * If the deleted row was the latest for its fund, the API also
 * recomputes Fund.currentNav and re-snapshots holdings; the page
 * refresh below is what surfaces those changes back to the admin.
 */
export function NavRowDeleteButton({
  recordId,
  fundName,
  date,
}: {
  recordId: string;
  fundName: string;
  date: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (
      !confirm(
        `Delete the NAV record for ${fundName} on ${date}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/nav/${recordId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Delete failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && (
        <span className="text-[11px] text-red-500" title={error}>
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={`Delete NAV record for ${fundName} on ${date}`}
        title="Delete record"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
