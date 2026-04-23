import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLearnTopicsPage() {
  const topics = await prisma.learnTopic.findMany({
    orderBy: [{ category: "asc" }, { displayOrder: "asc" }],
  });

  // Group by category so admin can eyeball each tab in isolation.
  // Today only "basics" is used on the public site; faq + myth_buster
  // buckets are here for forward compat.
  const grouped = new Map<string, typeof topics>();
  for (const t of topics) {
    if (!grouped.has(t.category)) grouped.set(t.category, []);
    grouped.get(t.category)!.push(t);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">
            Learn Topics
          </h1>
          <p className="text-[13px] text-text-body">
            Icon-led expandable cards on the /knowledge Basic of Mutual Fund
            tab.
          </p>
        </div>
        <Link
          href="/admin/learn-topics/new"
          className="rounded-md bg-ekush-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Add topic
        </Link>
      </div>

      {topics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-text-body">
          No topics yet. Click &ldquo;Add topic&rdquo; to create the first
          entry.
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([category, rows]) => (
            <section key={category}>
              <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-text-body">
                {category} · {rows.length}
              </h2>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-text-body">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Summary
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Icon
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Published
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Order
                      </th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => (
                      <tr
                        key={t.id}
                        className="border-t border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 font-medium">{t.title}</td>
                        <td className="px-4 py-3 text-[#4A4A4A]">
                          {t.summary}
                        </td>
                        <td className="px-4 py-3 text-[#4A4A4A]">
                          {t.iconKey}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {t.isPublished ? (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                              Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {t.displayOrder}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/learn-topics/${t.id}`}
                            className="text-[12px] font-semibold text-ekush-orange hover:underline"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
