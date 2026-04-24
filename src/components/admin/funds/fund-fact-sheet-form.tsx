"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Fact-sheet editor for one fund. Two rows-of-rows interfaces:
 *   - Asset allocation: category + weight %
 *   - Top holdings: ticker + name + weight %
 *
 * Both are admin-typed v1 (future: auto-extract from the latest
 * portfolio-statement PDF, pre-fill this form, admin reviews/
 * corrects before save). Validation lives in the POST parser —
 * this component shows whatever error the API returns inline.
 */

export type FactSheetFormInitial = {
  fundCode: string;
  asOfDate: string; // YYYY-MM-DD
  assetAllocation: { category: string; weightPct: number }[];
  topHoldings: { ticker: string; name: string; weightPct: number }[];
  sourcePdfUrl: string;
};

const FUND_LABELS: Record<string, string> = {
  EFUF: "Ekush First Unit Fund",
  EGF: "Ekush Growth Fund",
  ESRF: "Ekush Stable Return Fund",
};

// Typical allocation buckets used on Ekush fact sheets; admins can
// add custom categories by editing the string free-form.
const ALLOCATION_SUGGESTIONS = [
  "Equity",
  "Debt / Fixed Income",
  "Government Securities",
  "Cash & Equivalents",
  "Mutual Fund Units",
  "Corporate Bonds",
];

export function FundFactSheetForm({
  initial,
}: {
  initial: FactSheetFormInitial;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FactSheetFormInitial>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setAlloc(idx: number, patch: Partial<{ category: string; weightPct: number }>) {
    setForm((f) => ({
      ...f,
      assetAllocation: f.assetAllocation.map((row, i) =>
        i === idx ? { ...row, ...patch } : row,
      ),
    }));
  }

  function addAlloc(preset?: string) {
    setForm((f) => ({
      ...f,
      assetAllocation: [
        ...f.assetAllocation,
        { category: preset ?? "", weightPct: 0 },
      ],
    }));
  }

  function removeAlloc(idx: number) {
    setForm((f) => ({
      ...f,
      assetAllocation: f.assetAllocation.filter((_, i) => i !== idx),
    }));
  }

  function setHolding(
    idx: number,
    patch: Partial<{ ticker: string; name: string; weightPct: number }>,
  ) {
    setForm((f) => ({
      ...f,
      topHoldings: f.topHoldings.map((row, i) =>
        i === idx ? { ...row, ...patch } : row,
      ),
    }));
  }

  function addHolding() {
    setForm((f) => ({
      ...f,
      topHoldings: [...f.topHoldings, { ticker: "", name: "", weightPct: 0 }],
    }));
  }

  function removeHolding(idx: number) {
    setForm((f) => ({
      ...f,
      topHoldings: f.topHoldings.filter((_, i) => i !== idx),
    }));
  }

  function moveHolding(idx: number, dir: -1 | 1) {
    setForm((f) => {
      const next = [...f.topHoldings];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return f;
      [next[idx], next[j]] = [next[j], next[idx]];
      return { ...f, topHoldings: next };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/admin/fund-fact-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fundCode: form.fundCode,
        asOfDate: form.asOfDate,
        assetAllocation: form.assetAllocation,
        topHoldings: form.topHoldings,
        sourcePdfUrl: form.sourcePdfUrl || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErr(body?.error ?? "Save failed");
      return;
    }
    startTransition(() => {
      router.push("/admin/fund-fact-sheets");
      router.refresh();
    });
  }

  const allocTotal = form.assetAllocation.reduce(
    (s, r) => s + (Number(r.weightPct) || 0),
    0,
  );

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fund">
            <div className="flex h-10 items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 text-sm">
              <span className="font-medium">{FUND_LABELS[form.fundCode] ?? form.fundCode}</span>
              <span className="ml-auto rounded bg-[#FFF4EC] px-1.5 py-0.5 text-[10px] font-semibold text-ekush-orange">
                {form.fundCode}
              </span>
            </div>
          </Field>
          <Field
            label="As of date"
            hint="The quarter-end the numbers on this sheet reflect."
          >
            <input
              type="date"
              value={form.asOfDate}
              onChange={(e) => setForm((f) => ({ ...f, asOfDate: e.target.value }))}
              className={inputClass}
            />
          </Field>
        </div>
        <Field
          label="Source PDF URL (optional)"
          hint="Link to the portfolio-statement PDF this sheet was derived from. Admin-entered today; a future cron will auto-fill."
        >
          <input
            type="url"
            value={form.sourcePdfUrl}
            onChange={(e) =>
              setForm((f) => ({ ...f, sourcePdfUrl: e.target.value }))
            }
            placeholder="https://…/portfolio-statement-q4-2026.pdf"
            className={inputClass}
          />
        </Field>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <header className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold">Asset allocation</h2>
            <p className="text-[12px] text-[#8A8A8A]">
              Broad buckets that sum to ~100%. Shown as a donut on the public
              fact sheet.
            </p>
          </div>
          <div
            className={`text-[13px] font-mono ${
              Math.abs(allocTotal - 100) < 5
                ? "text-green-700"
                : "text-red-600"
            }`}
          >
            Σ {allocTotal.toFixed(1)}%
          </div>
        </header>
        <ul className="space-y-2">
          {form.assetAllocation.map((row, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={row.category}
                onChange={(e) => setAlloc(i, { category: e.target.value })}
                placeholder="e.g. Equity"
                className={`${inputClass} flex-1`}
                list="allocation-suggestions"
              />
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={row.weightPct}
                onChange={(e) =>
                  setAlloc(i, { weightPct: Number(e.target.value) || 0 })
                }
                className={`${inputClass} w-24 text-right`}
              />
              <span className="text-[13px] text-[#8A8A8A]">%</span>
              <button
                type="button"
                onClick={() => removeAlloc(i)}
                className="rounded border border-red-200 bg-white px-2 text-[12px] text-red-600 hover:bg-red-50"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <datalist id="allocation-suggestions">
          {ALLOCATION_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <div className="mt-3 flex flex-wrap gap-2">
          {ALLOCATION_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addAlloc(s)}
              className="rounded border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-[#4A4A4A] hover:bg-gray-50"
            >
              + {s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => addAlloc()}
            className="rounded border border-ekush-orange bg-[#FFF4EC] px-2.5 py-1 text-[11px] font-semibold text-ekush-orange hover:bg-[#FFE9D8]"
          >
            + Custom
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <header className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold">Top holdings</h2>
            <p className="text-[12px] text-[#8A8A8A]">
              Enter the top 5 positions (ticker + name + % weight). Extra
              rows are stored for future use — the public fact sheet renders
              the first five.
            </p>
          </div>
          <span className="text-[12px] text-[#8A8A8A]">
            {form.topHoldings.length} row{form.topHoldings.length === 1 ? "" : "s"}
          </span>
        </header>
        <ul className="space-y-2">
          {form.topHoldings.map((row, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-6 text-right font-mono text-[12px] text-[#8A8A8A]">
                {i + 1}
              </span>
              <input
                type="text"
                value={row.ticker}
                onChange={(e) =>
                  setHolding(i, { ticker: e.target.value.toUpperCase() })
                }
                placeholder="TICKER"
                className={`${inputClass} w-32 uppercase`}
              />
              <input
                type="text"
                value={row.name}
                onChange={(e) => setHolding(i, { name: e.target.value })}
                placeholder="Full name — e.g. Square Pharmaceuticals PLC"
                className={`${inputClass} flex-1`}
              />
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={row.weightPct}
                onChange={(e) =>
                  setHolding(i, { weightPct: Number(e.target.value) || 0 })
                }
                className={`${inputClass} w-24 text-right`}
              />
              <span className="text-[13px] text-[#8A8A8A]">%</span>
              <button
                type="button"
                onClick={() => moveHolding(i, -1)}
                disabled={i === 0}
                className="rounded border border-gray-200 px-1.5 text-[11px] disabled:opacity-30"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveHolding(i, 1)}
                disabled={i === form.topHoldings.length - 1}
                className="rounded border border-gray-200 px-1.5 text-[11px] disabled:opacity-30"
                title="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeHolding(i)}
                className="rounded border border-red-200 bg-white px-2 text-[12px] text-red-600 hover:bg-red-50"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <button
            type="button"
            onClick={addHolding}
            className="rounded border border-ekush-orange bg-[#FFF4EC] px-2.5 py-1 text-[11px] font-semibold text-ekush-orange hover:bg-[#FFE9D8]"
          >
            + Add holding
          </button>
        </div>
      </section>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-ekush-orange px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          Save fact sheet
        </button>
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
  "rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-ekush-orange focus:outline-none";
