import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  const videos = await prisma.video.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">
            Videos
          </h1>
          <p className="text-[13px] text-text-body">
            YouTube videos shown on the /knowledge Video Library tab.
          </p>
        </div>
        <Link
          href="/admin/videos/new"
          className="rounded-md bg-ekush-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Add video
        </Link>
      </div>

      {videos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-text-body">
          No videos yet. Click &ldquo;Add video&rdquo; to paste a YouTube URL
          and create the first entry.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-text-body">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Thumbnail</th>
                <th className="px-4 py-3 text-left font-semibold">Title</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-center font-semibold">Featured</th>
                <th className="px-4 py-3 text-center font-semibold">Published</th>
                <th className="px-4 py-3 text-right font-semibold">Order</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr
                  key={v.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={v.thumbnailUrl}
                      alt=""
                      className="h-10 w-16 rounded object-cover"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{v.title}</div>
                    <div className="text-[11px] text-[#8A8A8A]">
                      {v.duration} · {v.viewCount.toLocaleString()} views
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#4A4A4A]">{v.category}</td>
                  <td className="px-4 py-3 text-center">
                    {v.isFeatured ? (
                      <span className="inline-flex items-center rounded-full bg-[#FFF4EC] px-2 py-0.5 text-[10px] font-semibold text-[#F27023]">
                        Featured
                      </span>
                    ) : (
                      <span className="text-[#8A8A8A]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {v.isPublished ? (
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
                    {v.displayOrder}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/videos/${v.id}`}
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
