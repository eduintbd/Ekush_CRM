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
  const topic = await prisma.learnTopic.findUnique({
    where: { id: params.id },
  });
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
        initial={{
          id: topic.id,
          title: topic.title,
          summary: topic.summary,
          body: topic.body,
          iconKey: topic.iconKey,
          imageUrl: topic.imageUrl ?? "",
          category: topic.category,
          displayOrder: topic.displayOrder,
          isPublished: topic.isPublished,
        }}
      />
    </div>
  );
}
