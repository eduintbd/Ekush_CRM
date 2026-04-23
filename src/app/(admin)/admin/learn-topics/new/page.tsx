import Link from "next/link";
import { LearnTopicForm } from "@/components/admin/knowledge/learn-topic-form";

export const dynamic = "force-dynamic";

export default function NewLearnTopicPage() {
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
      <LearnTopicForm mode="create" />
    </div>
  );
}
