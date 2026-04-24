import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LearnTopicForm } from "@/components/admin/knowledge/learn-topic-form";

export const dynamic = "force-dynamic";

export default async function NewLearnTopicPage() {
  // Read the currently-pinned homepage popup so the pin-star on the
  // gallery editor can reflect reality even on a brand-new topic
  // (admin uploads an image, sees whether one is already live on the
  // homepage, and decides whether to overwrite).
  const popup = await prisma.frontPagePopup.findUnique({
    where: { id: "singleton" },
    select: { imageUrl: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/learn-topics"
          className="text-[12px] font-semibold text-[#8A8A8A] hover:text-ekush-orange"
        >
          ← Back to topics
        </Link>
        <h1 className="mt-1 text-[20px] font-semibold text-text-dark font-rajdhani">
          Add topic
        </h1>
      </div>
      <LearnTopicForm
        mode="create"
        pinnedImageUrl={popup?.imageUrl ?? null}
      />
    </div>
  );
}
