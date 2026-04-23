import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VideoForm } from "@/components/admin/knowledge/video-form";

export const dynamic = "force-dynamic";

export default async function EditVideoPage({
  params,
}: {
  params: { id: string };
}) {
  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/videos"
          className="text-[12px] font-semibold text-[#8A8A8A] hover:text-ekush-orange"
        >
          ← Back to videos
        </Link>
        <h1 className="mt-1 text-[20px] font-semibold text-text-dark font-rajdhani">
          Edit video
        </h1>
      </div>
      <VideoForm
        mode="edit"
        initial={{
          id: video.id,
          youtubeUrl: video.youtubeUrl,
          videoId: video.videoId,
          title: video.title,
          category: video.category,
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
          viewCount: video.viewCount,
          likeCount: video.likeCount,
          publishedAt: video.publishedAt.toISOString().slice(0, 10),
          isFeatured: video.isFeatured,
          displayOrder: video.displayOrder,
          isPublished: video.isPublished,
        }}
      />
    </div>
  );
}
