"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";

/**
 * Admin block that edits the DividendHistory rows for a single fund.
 * Surfaced on /admin/fund-reports under each fund card. The data here
 * is what the ekushwml.com marketing site's Dividend History tab
 * renders — one row per year with the headline annual dividend %.
 *
 * Upsert semantics: saving a year that already exists replaces the
 * existing row rather than creating a duplicate. That matches how the
 * business announces these numbers (one headline % per year).
 */

export type DividendHistoryRow = {
  id: string;
  year: number;
  annualDividendPct: number;
  note: string | null;
};

export function DividendHistoryManager({
  fundId,
  fundCode,
  initialEntries,
}: {
  fundId: string;
  fundCode: string;
  initialEntries: DividendHistoryRow[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [year, setYear] = useState("");
  const [pct, setPct] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit() {
    setError(null);
    const y = parseInt(year, 10);
    const p = Number(pct);
    if (!Number.isFinite(y) || y < 1900 || y > 2200) {
      setError("Enter a valid year (e.g. 2025).");
      return;
    }
    if (!Number.isFinite(p)) {
      setError("Enter a valid percentage.");
      return;
    }

    const res = await fetch("/api/admin/dividend-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fundId,
        year: y,
        annualDividendPct: p,
        note: note.trim() || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Save failed");
      return;
    }
    const body = await res.json();
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.year === y);
      const next = { id: body.entry.id, year: y, annualDividendPct: p, note: note.trim() || null };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = next;
        return copy.sort((a, b) => b.year - a.year);
      }
      return [...prev, next].sort((a, b) => b.year - a.year);
    });
    setYear("");
    setPct("");
    setNote("");
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    if (!confirm("Delete this dividend history entry?")) return;
    const res = await fetch(`/api/admin/dividend-history/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Delete failed");
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3 p-3">
      {/* Add / edit form */}
      <div className="flex flex-wrap items-end gap-2 bg-orange-50/40 border border-ekush-orange/20 rounded-md p-3">
        <label className="flex flex-col text-[11px] font-medium text-text-body">
          Year
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2025"
            className="mt-1 w-24 px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:border-ekush-orange focus:outline-none"
          />
        </label>
        <label className="flex flex-col text-[11px] font-medium text-text-body">
          Annual Dividend (%)
          <input
            type="number"
            step="0.01"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            placeholder="5.80"
            className="mt-1 w-28 px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:border-ekush-orange focus:outline-none"
          />
        </label>
        <label className="flex flex-col text-[11px] font-medium text-text-body flex-1 min-w-[120px]">
          Note (optional, admin only)
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Interim"
            className="mt-1 px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:border-ekush-orange focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold bg-ekush-orange text-white rounded hover:opacity-90 disabled:opacity-60"
        >
          <Plus className="w-3.5 h-3.5" />
          Save ({fundCode})
        </button>
      </div>

      {error && (
        <div className="text-[11px] text-red-600 px-2">{error}</div>
      )}

      {/* Table */}
      {entries.length > 0 ? (
        <div className="border border-gray-100 rounded-md overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-gray-50 text-text-body">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Year</th>
                <th className="px-3 py-2 text-right font-semibold">Annual Dividend</th>
                <th className="px-3 py-2 text-left font-semibold">Note</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">{e.year}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {e.annualDividendPct.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-text-muted">{e.note ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
                      className="text-red-500 hover:text-red-700"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[11px] text-text-muted text-center py-2">
          No dividend history yet. Add a year + percentage above.
        </p>
      )}
    </div>
  );
}
