import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpRight, FileDown, Sparkles } from "lucide-react";
import { prisma, withRetry } from "@/lib/prisma";
import { isProspectsEnabled } from "@/lib/feature-flags";

// Phase 6a — read-only prospects admin tab.
// Filters / search / sort / pagination are all driven by URL search
// params so links work, the Back button does the right thing, and the
// page can be deep-linked from email or admin chat.
//
// Mutations (delete, bulk delete, CSV / Meta exports) come in 6b.
// The table column for those actions is reserved here as an empty
// header to keep the layout stable across the 6a → 6b ship.

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const FILTER_KEYS = ["all", "active", "dormant", "upgrading"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const SORT_KEYS = ["newest", "oldest", "lastActive"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const DORMANT_THRESHOLD_MS = 60 * 24 * 60 * 60 * 1000;

const INTEREST_LABELS: Record<string, string> = {
  exploring: "Just exploring",
  mutual_funds: "Mutual Funds",
  sukuk: "Sukuk",
  dpm: "DPM",
  other: "Other",
};

export default async function AdminProspectsPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    q?: string;
    filter?: string;
    sort?: string;
  };
}) {
  if (!isProspectsEnabled()) notFound();

  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const query = (searchParams.q || "").trim();
  const filter: FilterKey = (FILTER_KEYS as readonly string[]).includes(
    searchParams.filter ?? "",
  )
    ? (searchParams.filter as FilterKey)
    : "all";
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(
    searchParams.sort ?? "",
  )
    ? (searchParams.sort as SortKey)
    : "newest";

  const now = Date.now();
  const activeSince = new Date(now - ACTIVE_WINDOW_MS);
  const dormantBefore = new Date(now - DORMANT_THRESHOLD_MS);

  // Soft-deleted rows are hidden from the admin view by default; the
  // 30-day purge cron sweeps them after deletedAt + 30d.
  const baseFilter = { deletedAt: null };

  const filterClause: Record<string, unknown> =
    filter === "active"
      ? { lastLoginAt: { gte: activeSince } }
      : filter === "dormant"
        ? {
            OR: [
              { lastLoginAt: { lt: dormantBefore } },
              {
                AND: [
                  { lastLoginAt: null },
                  { createdAt: { lt: dormantBefore } },
                ],
              },
            ],
          }
        : filter === "upgrading"
          ? { kycSubmitted: true }
          : {};

  const searchClause = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { phone: { contains: query } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const where = { ...baseFilter, ...filterClause, ...searchClause };

  const orderBy =
    sort === "oldest"
      ? { createdAt: "asc" as const }
      : sort === "lastActive"
        ? { lastLoginAt: { sort: "desc" as const, nulls: "last" as const } }
        : { createdAt: "desc" as const };

  const [rows, total, metrics] = await withRetry(() =>
    Promise.all([
      prisma.prospect.findMany({
        where,
        orderBy,
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          interest: true,
          source: true,
          createdAt: true,
          lastLoginAt: true,
          kycSubmitted: true,
        },
      }),
      prisma.prospect.count({ where }),
      computeMetrics(activeSince, dormantBefore),
    ]),
  );

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">
            Prospects
          </h1>
          <p className="text-[13px] text-text-body">
            Tier 1 only &mdash; leads from WhatsApp signup. Investors are in
            the Investors tab.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            href="/api/admin/prospects/export"
            label="Export to CSV"
            disabled
            icon={<FileDown className="w-4 h-4" />}
          />
          <ExportButton
            href="/api/admin/prospects/export-meta"
            label="Export for Meta audience"
            disabled
            icon={<Sparkles className="w-4 h-4" />}
          />
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total prospects" value={metrics.total} />
        <MetricCard
          label="Active (logged in <30d)"
          value={metrics.active}
        />
        <MetricCard
          label="Dormant (no login 60d+)"
          value={metrics.dormant}
        />
        <MetricCard
          label="Upgrading to Tier 2"
          value={metrics.upgrading}
          accent
        />
      </div>

      <FilterBar currentFilter={filter} currentSort={sort} query={query} />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="w-8">
                    {/* Checkbox column reserved for Phase 6b bulk delete. */}
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
                    const status = computeStatus(
                      p.lastLoginAt,
                      p.createdAt,
                      now,
                    );
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            disabled
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
                          {relativeFromNow(p.createdAt, now)}
                        </TableCell>
                        <TableCell className="text-[13px] text-text-body">
                          {p.lastLoginAt ? (
                            relativeFromNow(p.lastLoginAt, now)
                          ) : (
                            <span className="text-text-muted">never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusPill status={status} />
                        </TableCell>
                        <TableCell>
                          {/* Per-row delete reserved for Phase 6b. */}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <PaginationBar
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              query={query}
              filter={filter}
              sort={sort}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-[13px] text-text-body">
        <span className="opacity-60 cursor-not-allowed">
          Bulk delete selected (coming soon)
        </span>
        <span className="opacity-60 cursor-not-allowed">
          Send WhatsApp campaign (coming soon)
        </span>
      </div>
    </div>
  );
}

async function computeMetrics(activeSince: Date, dormantBefore: Date) {
  const [total, active, dormant, upgrading] = await Promise.all([
    prisma.prospect.count({ where: { deletedAt: null } }),
    prisma.prospect.count({
      where: {
        deletedAt: null,
        lastLoginAt: { gte: activeSince },
      },
    }),
    prisma.prospect.count({
      where: {
        deletedAt: null,
        OR: [
          { lastLoginAt: { lt: dormantBefore } },
          {
            AND: [
              { lastLoginAt: null },
              { createdAt: { lt: dormantBefore } },
            ],
          },
        ],
      },
    }),
    prisma.prospect.count({
      where: {
        deletedAt: null,
        kycSubmitted: true,
      },
    }),
  ]);
  return { total, active, dormant, upgrading };
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

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-card shadow-card p-4 ${
        accent
          ? "bg-ekush-orange/10 border border-ekush-orange/30"
          : "bg-white"
      }`}
    >
      <p className="text-[12px] text-text-body">{label}</p>
      <p
        className={`text-[24px] font-bold font-rajdhani ${
          accent ? "text-ekush-orange" : "text-text-dark"
        }`}
      >
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

function FilterBar({
  currentFilter,
  currentSort,
  query,
}: {
  currentFilter: FilterKey;
  currentSort: SortKey;
  query: string;
}) {
  const filterPills: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "dormant", label: "Dormant" },
    { key: "upgrading", label: "Upgrading" },
  ];

  function buildHref(next: Partial<{ filter: FilterKey; sort: SortKey; q: string; page: number }>) {
    const params = new URLSearchParams();
    const f = next.filter ?? currentFilter;
    if (f !== "all") params.set("filter", f);
    const s = next.sort ?? currentSort;
    if (s !== "newest") params.set("sort", s);
    const q = next.q ?? query;
    if (q) params.set("q", q);
    const qs = params.toString();
    return qs ? `/admin/prospects?${qs}` : "/admin/prospects";
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {filterPills.map((p) => (
          <Link
            key={p.key}
            href={buildHref({ filter: p.key })}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
              p.key === currentFilter
                ? "bg-ekush-orange text-white border-ekush-orange"
                : "bg-white text-text-body border-input-border hover:border-ekush-orange hover:text-ekush-orange"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <form
        method="GET"
        action="/admin/prospects"
        className="flex items-center gap-2 lg:ml-auto"
      >
        {currentFilter !== "all" && (
          <input type="hidden" name="filter" value={currentFilter} />
        )}
        {currentSort !== "newest" && (
          <input type="hidden" name="sort" value={currentSort} />
        )}
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search name, phone, or email..."
          className="px-3 py-1.5 text-[13px] border border-input-border rounded-md focus:outline-none focus:border-ekush-orange w-64"
        />
        <button
          type="submit"
          className="px-3 py-1.5 text-[13px] bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark transition-colors"
        >
          Search
        </button>
        <select
          name="sort"
          defaultValue={currentSort}
          className="px-2 py-1.5 text-[13px] border border-input-border rounded-md bg-white focus:outline-none focus:border-ekush-orange"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="lastActive">Last activity</option>
        </select>
      </form>
    </div>
  );
}

function PaginationBar({
  page,
  total,
  pageSize,
  query,
  filter,
  sort,
}: {
  page: number;
  total: number;
  pageSize: number;
  query: string;
  filter: FilterKey;
  sort: SortKey;
}) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (sort !== "newest") params.set("sort", sort);
    if (query) params.set("q", query);
    if (p !== 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/prospects?${qs}` : "/admin/prospects";
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-text-body/10">
      <p className="text-[13px] text-text-body">
        Showing {(page - 1) * pageSize + 1}&ndash;
        {Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={pageHref(page - 1)}
            className="px-3 py-1.5 text-[13px] bg-page-bg text-text-dark rounded-[5px] hover:bg-ekush-orange hover:text-white transition-colors"
          >
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={pageHref(page + 1)}
            className="px-3 py-1.5 text-[13px] bg-page-bg text-text-dark rounded-[5px] hover:bg-ekush-orange hover:text-white transition-colors"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}

function ExportButton({
  href,
  label,
  icon,
  disabled,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  // Phase 6b will implement the routes; until then the buttons render
  // disabled so the UI shape is final on first ship.
  if (disabled) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-gray-100 text-gray-400 rounded-md cursor-not-allowed"
        title="Available in Phase 6b"
      >
        {icon}
        {label}
      </span>
    );
  }
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark transition-colors"
    >
      {icon}
      {label}
    </a>
  );
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
