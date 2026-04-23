"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Inline health-check control on /admin/videos. Calls
 * /api/admin/videos/health and renders the returned issues in a
 * collapsible panel so admin can spot broken videos at a glance.
 *
 * Intentionally manual — we don't want YouTube API calls billing
 * on every admin visit. Admin clicks when they're about to curate.
 */

type Issue = {
  id: string;
  videoId: string;
  storedTitle: string;
  currentTitle: string;
  kind: "not_found" | "private" | "not_embeddable";
  isPublished: boolean;
};

type CheckResult =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ok"; totalChecked: number; issues: Issue[] };

const KIND_LABEL: Record<Issue["kind"], string> = {
  not_found: "Deleted or region-blocked",
  private: "Privacy changed (unlisted / private)",
  not_embeddable: "Embedding disabled",
};

export function VideoHealthCheck() {
  const [result, setResult] = useState<CheckResult>({ state: "idle" });

  async function runCheck() {
    setResult({ state: "loading" });
    const res = await fetch("/api/admin/videos/health");
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setResult({
        state: "error",
        message: body?.error ?? `HTTP ${res.status}`,
      });
      return;
    }
    setResult({
      state: "ok",
      totalChecked: body.totalChecked,
      issues: body.issues as Issue[],
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={runCheck}
        disabled={result.state === "loading"}
        className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-text-dark hover:bg-gray-50 disabled:opacity-60"
      >
        {result.state === "loading" ? "Checking…" : "Check video health"}
      </button>

      {result.state === "error" ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Health check failed: {result.message}
        </div>
      ) : null}

      {result.state === "ok" ? (
        result.issues.length === 0 ? (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            All {result.totalChecked} videos look healthy.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-amber-200 bg-amber-50">
            <div className="border-b border-amber-200 bg-amber-100 px-4 py-2 text-[13px] font-semibold text-amber-900">
              {result.issues.length} of {result.totalChecked} videos need
              attention
            </div>
            <ul className="divide-y divide-amber-200">
              {result.issues.map((issue) => (
                <li
                  key={issue.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-amber-900">
                      {issue.storedTitle}
                    </div>
                    <div className="mt-0.5 text-[12px] text-amber-800">
                      {KIND_LABEL[issue.kind]}
                      {issue.currentTitle &&
                      issue.currentTitle !== issue.storedTitle
                        ? ` · now titled: ${issue.currentTitle}`
                        : ""}
                      {issue.isPublished
                        ? " · currently live on /knowledge"
                        : " · draft"}
                    </div>
                  </div>
                  <Link
                    href={`/admin/videos/${issue.id}`}
                    className="shrink-0 text-[12px] font-semibold text-ekush-orange hover:underline"
                  >
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}
    </div>
  );
}
