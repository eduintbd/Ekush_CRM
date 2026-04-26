import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { FileDown, Sparkles } from "lucide-react";
import { prisma, withRetry } from "@/lib/prisma";
import { isProspectsEnabled } from "@/lib/feature-flags";
import { getSession } from "@/lib/auth";
import { SUPER_ROLES } from "@/lib/roles";
import {
  ProspectsTableClient,
  type ProspectRow,
} from "@/components/admin/prospects-table-client";

// Phase 6 server shell — owns metrics, filter pills, search/sort form,
// and pagination. Hands the data rows to a client island for selection
// + delete modals (Phase 6b).
//
// All filter/search/sort/page state is in URL search params so links
// and the Back button work, and direct deep-links share cleanly.

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const FILTER_KEYS = ["all", "active", "dormant", "upgrading"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const SORT_KEYS = ["newest", "oldest", "lastActive"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const DORMANT_THRESHOLD_MS = 60 * 24 * 60 * 60 * 1000;

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

  const session = await getSession();
  const canHardDelete = SUPER_ROLES.includes(session?.user?.role ?? "");

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

  const [rawRows, total, metrics] = await withRetry(() =>
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

  // Date → ISO string for the wire so the client island gets a plain
  // serializable shape.
  const rows: ProspectRow[] = rawRows.map((r) => ({
    id: r.id,
    phone: r.phone,
    name: r.name,
    email: r.email,
    interest: r.interest,
    source: r.source,
    createdAt: r.createdAt.toISOString(),
    lastLoginAt: r.lastLoginAt ? r.lastLoginAt.toISOString() : null,
    kycSubmitted: r.kycSubmitted,
  }));

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
          <a
            href="/api/admin/prospects/export"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark transition-colors"
          >
            <FileDown className="w-4 h-4" /> Export to CSV
          </a>
          <a
            href="/api/admin/prospects/export-meta"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark transition-colors"
          >
            <Sparkles className="w-4 h-4" /> Export for Meta audience
          </a>
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
          <ProspectsTableClient rows={rows} canHardDelete={canHardDelete} />

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

      <div className="flex items-center justify-end text-[13px] text-text-body">
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

  function buildHref(next: Partial<{ filter: FilterKey }>) {
    const params = new URLSearchParams();
    const f = next.filter ?? currentFilter;
    if (f !== "all") params.set("filter", f);
    if (currentSort !== "newest") params.set("sort", currentSort);
    if (query) params.set("q", query);
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
