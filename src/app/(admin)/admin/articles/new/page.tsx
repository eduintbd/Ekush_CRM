import Link from "next/link";
import { ArticleForm } from "@/components/admin/knowledge/article-form";

export const dynamic = "force-dynamic";

export default function NewArticlePage() {
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
          Add article
        </h1>
        <p className="text-[13px] text-text-body">
          Paste the article URL and fill in the remaining fields. Step 6 will
          auto-fetch title, excerpt and cover image from the page&apos;s Open
          Graph tags.
        </p>
      </div>
      <ArticleForm mode="create" />
    </div>
  );
}
