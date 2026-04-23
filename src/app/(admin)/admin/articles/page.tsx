import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const articles = await prisma.article.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">
            Press &amp; Articles
          </h1>
          <p className="text-[13px] text-text-body">
            Third-party coverage shown on the /knowledge Press &amp; Articles
            tab.
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="rounded-md bg-ekush-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Add article
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-text-body">
          No articles yet. Click &ldquo;Add article&rdquo; to paste a link.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-text-body">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Cover</th>
                <th className="px-4 py-3 text-left font-semibold">Title</th>
                <th className="px-4 py-3 text-left font-semibold">Publisher</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-center font-semibold">Published</th>
                <th className="px-4 py-3 text-right font-semibold">Order</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.coverImageUrl}
                      alt=""
                      className="h-10 w-16 rounded object-cover"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.title}</div>
                    <div className="text-[11px] text-[#8A8A8A]">
                      {a.readTimeMinutes} min ·{" "}
                      {a.publishedAt.toISOString().slice(0, 10)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#4A4A4A]">{a.publisher}</td>
                  <td className="px-4 py-3 text-[#4A4A4A]">{a.category}</td>
                  <td className="px-4 py-3 text-center">
                    {a.isPublished ? (
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
                    {a.displayOrder}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/articles/${a.id}`}
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
