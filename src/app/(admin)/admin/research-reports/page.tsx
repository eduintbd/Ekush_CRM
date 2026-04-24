import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminResearchReportsPage() {
  const reports = await prisma.researchReport.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">
            Research &amp; Insights
          </h1>
          <p className="text-[13px] text-text-body">
            PDF research reports rendered as Bridgewater-style cards on the
            /knowledge page.
          </p>
        </div>
        <Link
          href="/admin/research-reports/new"
          className="rounded-md bg-ekush-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Add report
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-text-body">
          No reports yet. Click &ldquo;Add report&rdquo; to upload your first
          PDF.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-text-body">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Title</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Description
                </th>
                <th className="px-4 py-3 text-center font-semibold">
                  Published
                </th>
                <th className="px-4 py-3 text-right font-semibold">Order</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3 text-[#4A4A4A]">
                    {r.description.length > 80
                      ? `${r.description.slice(0, 80)}…`
                      : r.description}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.isPublished ? (
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
                    {r.displayOrder}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/research-reports/${r.id}`}
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
      )}
    </div>
  );
}
