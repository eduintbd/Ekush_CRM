"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Trash2, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Prospect rows + checkbox selection + per-row & bulk delete modals.
// Server component renders the page chrome (filters, search, sort,
// pagination, metrics) and hands the rows + a few flags to this island
// so the heavy interactive bits stay client-side without dragging the
// whole page out of RSC.

const INTEREST_LABELS: Record<string, string> = {
  exploring: "Just exploring",
  mutual_funds: "Mutual Funds",
  sukuk: "Sukuk",
  dpm: "DPM",
  other: "Other",
};

const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const DORMANT_THRESHOLD_MS = 60 * 24 * 60 * 60 * 1000;

export type ProspectRow = {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  interest: string;
  source: string | null;
  // Serialized as ISO strings on the wire — Date is not a valid client
  // prop type in App Router serialization.
  createdAt: string;
  lastLoginAt: string | null;
  kycSubmitted: boolean;
};

export function ProspectsTableClient({
  rows,
  canHardDelete,
}: {
  rows: ProspectRow[];
  canHardDelete: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [singleConfirm, setSingleConfirm] = useState<ProspectRow | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [permanent, setPermanent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => selected.has(r.id)),
    [rows, selected],
  );
  const anySelected = selected.size > 0;

  function toggleAll(check: boolean) {
    if (check) setSelected(new Set(rows.map((r) => r.id)));
    else setSelected(new Set());
  }

  function toggleOne(id: string, check: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (check) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function performSingleDelete() {
    if (!singleConfirm) return;
    setBusy(true);
    setError("");
    try {
      const url = `/api/admin/prospects/${singleConfirm.id}${permanent ? "?hard=1" : ""}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Delete failed.");
        return;
      }
      // Drop the row from selection too.
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(singleConfirm.id);
        return next;
      });
      setSingleConfirm(null);
      setPermanent(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function performBulkDelete() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/prospects/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected),
          hard: permanent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Bulk delete failed.");
        return;
      }
      setSelected(new Set());
      setBulkConfirm(false);
      setPermanent(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const nowMs = Date.now();

  return (
    <>
      {error && (
        <div className="bg-red-50 text-red-600 text-[13px] p-3 rounded-[5px] mb-3 border border-red-200">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.currentTarget.checked)}
                  className="accent-ekush-orange"
                  aria-label="Select all rows"
                />
              </TableHead>
              <TableHead>Phone (login)</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Interest</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center text-[13px] text-text-body py-10"
                >
                  No prospects match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => {
                const created = new Date(p.createdAt);
                const lastLogin = p.lastLoginAt ? new Date(p.lastLoginAt) : null;
                const status = computeStatus(lastLogin, created, nowMs);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={(e) => toggleOne(p.id, e.currentTarget.checked)}
                        className="accent-ekush-orange"
                        aria-label={`Select ${p.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-[13px] text-text-dark">
                      +880 {p.phone}
                    </TableCell>
                    <TableCell className="text-[13px] text-text-dark">
                      <span className="font-medium">{p.name}</span>
                      {p.kycSubmitted && (
                        <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-semibold uppercase tracking-wide border border-amber-200">
                          <ArrowUpRight className="w-2.5 h-2.5" />
                          KYC submitted
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-[13px] text-text-body">
                      {p.email ?? <span className="text-text-muted">&mdash;</span>}
                    </TableCell>
                    <TableCell className="text-[13px] text-text-body">
                      {INTEREST_LABELS[p.interest] ?? p.interest}
                    </TableCell>
                    <TableCell className="text-[13px] text-text-body">
                      {p.source ?? <span className="text-text-muted">&mdash;</span>}
                    </TableCell>
                    <TableCell className="text-[13px] text-text-body">
                      {relativeFromNow(created, nowMs)}
                    </TableCell>
                    <TableCell className="text-[13px] text-text-body">
                      {lastLogin ? (
                        relativeFromNow(lastLogin, nowMs)
                      ) : (
                        <span className="text-text-muted">never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={status} />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => {
                          setPermanent(false);
                          setSingleConfirm(p);
                        }}
                        className="text-text-body hover:text-red-600 transition-colors"
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {anySelected && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-text-body/10 bg-page-bg">
          <p className="text-[13px] text-text-body">
            {selected.size} selected
          </p>
          <button
            type="button"
            onClick={() => {
              setPermanent(false);
              setBulkConfirm(true);
            }}
            className="text-[13px] font-semibold text-red-600 hover:underline"
          >
            Delete selected
          </button>
        </div>
      )}

      {singleConfirm && (
        <ConfirmModal
          title="Delete prospect?"
          body={
            <>
              <p className="text-[13px] text-text-body">
                <span className="font-semibold text-text-dark">{singleConfirm.name}</span>{" "}
                (+880 {singleConfirm.phone}) will be removed from the prospect
                list. Soft-deleted prospects are restorable for 30 days; the
                purge cron clears them after that.
              </p>
              {canHardDelete && (
                <label className="flex items-start gap-2 mt-3 text-[12px] text-red-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permanent}
                    onChange={(e) => setPermanent(e.currentTarget.checked)}
                    className="mt-0.5 accent-red-600"
                  />
                  <span>
                    Permanently delete now (cannot be undone — Super Admin
                    only).
                  </span>
                </label>
              )}
            </>
          }
          onCancel={() => {
            setSingleConfirm(null);
            setPermanent(false);
          }}
          onConfirm={performSingleDelete}
          confirmLabel={permanent ? "Yes, permanently delete" : "Yes, delete"}
          busy={busy}
          danger
        />
      )}

      {bulkConfirm && (
        <ConfirmModal
          title={`Delete ${selected.size} prospect${selected.size === 1 ? "" : "s"}?`}
          body={
            <>
              <p className="text-[13px] text-text-body">
                Selected prospects will be removed from the list. Soft-deleted
                rows are restorable for 30 days; the purge cron clears them
                after that.
              </p>
              {canHardDelete && (
                <label className="flex items-start gap-2 mt-3 text-[12px] text-red-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permanent}
                    onChange={(e) => setPermanent(e.currentTarget.checked)}
                    className="mt-0.5 accent-red-600"
                  />
                  <span>
                    Permanently delete now (cannot be undone — Super Admin
                    only).
                  </span>
                </label>
              )}
            </>
          }
          onCancel={() => {
            setBulkConfirm(false);
            setPermanent(false);
          }}
          onConfirm={performBulkDelete}
          confirmLabel={permanent ? "Yes, permanently delete" : "Yes, delete"}
          busy={busy}
          danger
        />
      )}
    </>
  );
}

function ConfirmModal({
  title,
  body,
  onCancel,
  onConfirm,
  confirmLabel,
  busy,
  danger,
}: {
  title: string;
  body: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  busy: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-card shadow-card max-w-[460px] w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 text-text-body hover:text-text-dark"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <h3 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-3">
            {title}
          </h3>
          {body}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-[13px] text-text-dark border border-input-border rounded-md hover:bg-page-bg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={`px-4 py-2 text-[13px] font-semibold text-white rounded-md transition-colors disabled:opacity-60 ${
                danger ? "bg-red-600 hover:bg-red-700" : "bg-ekush-orange hover:bg-ekush-orange-dark"
              }`}
            >
              {busy ? "Working..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "active" | "dormant" | "new" }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[11px] font-semibold border border-green-200">
        Active
      </span>
    );
  }
  if (status === "dormant") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold border border-gray-200">
        Dormant
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200">
      New
    </span>
  );
}

function computeStatus(
  lastLoginAt: Date | null,
  createdAt: Date,
  nowMs: number,
): "active" | "dormant" | "new" {
  if (lastLoginAt && nowMs - lastLoginAt.getTime() <= ACTIVE_WINDOW_MS) {
    return "active";
  }
  const reference = lastLoginAt ?? createdAt;
  if (nowMs - reference.getTime() >= DORMANT_THRESHOLD_MS) {
    return "dormant";
  }
  return "new";
}

function relativeFromNow(d: Date, nowMs: number): string {
  const ms = nowMs - d.getTime();
  if (ms < 0) return "just now";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;
  const year = Math.floor(day / 365);
  return `${year}y ago`;
}
