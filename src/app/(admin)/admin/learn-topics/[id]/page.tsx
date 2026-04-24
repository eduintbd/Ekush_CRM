import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LearnTopicForm } from "@/components/admin/knowledge/learn-topic-form";

export const dynamic = "force-dynamic";

export default async function EditLearnTopicPage({
  params,
}: {
  params: { id: string };
}) {
  const [topic, popup] = await Promise.all([
    prisma.learnTopic.findUnique({ where: { id: params.id } }),
    prisma.frontPagePopup.findUnique({
      where: { id: "singleton" },
      select: { imageUrl: true },
    }),
  ]);
  if (!topic) notFound();

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
          Edit topic
        </h1>
      </div>
      <LearnTopicForm
        mode="edit"
        pinnedImageUrl={popup?.imageUrl ?? null}
        initial={{
          id: topic.id,
          title: topic.title,
          summary: topic.summary,
          body: topic.body,
          iconKey: topic.iconKey,
          // Seed the gallery from the new `images` array. Legacy rows
          // that only have the deprecated `imageUrl` column get it
          // promoted into the array so the admin can see + edit it.
          images:
            topic.images.length > 0
              ? topic.images
              : topic.imageUrl
              ? [topic.imageUrl]
              : [],
          category: topic.category,
          displayOrder: topic.displayOrder,
          isPublished: topic.isPublished,
        }}
      />
    </div>
  );
}
