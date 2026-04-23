import Link from "next/link";
import { VideoForm } from "@/components/admin/knowledge/video-form";

export const dynamic = "force-dynamic";

export default function NewVideoPage() {
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
          Add video
        </h1>
        <p className="text-[13px] text-text-body">
          Paste the YouTube URL and fill in the remaining fields. Step 5 will
          auto-fetch title, thumbnail, duration and stats.
        </p>
      </div>
      <VideoForm mode="create" />
    </div>
  );
}
