import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArticleForm } from "@/components/admin/knowledge/article-form";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: {
  params: { id: string };
}) {
  const article = await prisma.article.findUnique({
    where: { id: params.id },
  });
  if (!article) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/articles"
          className="text-[12px] font-semibold text-[#8A8A8A] hover:text-ekush-orange"
        >
          ← Back to articles
        </Link>
        <h1 className="mt-1 text-[20px] font-semibold text-text-dark font-rajdhani">
          Edit article
        </h1>
      </div>
      <ArticleForm
        mode="edit"
        initial={{
          id: article.id,
          articleUrl: article.articleUrl,
          publisher: article.publisher,
          title: article.title,
          excerpt: article.excerpt,
          coverImageUrl: article.coverImageUrl,
          category: article.category,
          publishedAt: article.publishedAt.toISOString().slice(0, 10),
          readTimeMinutes: article.readTimeMinutes,
          displayOrder: article.displayOrder,
          isPublished: article.isPublished,
        }}
      />
    </div>
  );
}
