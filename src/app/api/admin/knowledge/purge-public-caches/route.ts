import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../_guard";

/**
 * Staff-gated escape hatch that force-purges every public knowledge
 * cache on the CRM's own Vercel edge and on the ekushwml-rebuild's
 * Next.js ISR tags. Intended as a one-shot manual trigger for the
 * rare case when an edge cache entry gets stuck (a response was
 * cached before its invalidator existed, or Vercel's deploy-time
 * invalidation missed a query-parametered variant).
 *
 * GET works to keep it browser-pasteable while logged in — POST
 * would require CSRF plumbing and this is a read-only side-effect
 * from the caller's perspective.
 *
 * Why inline the category list here rather than reuse the list in
 * /api/admin/learn-topics/route.ts: that file's list ships in the
 * write path's hot loop; this endpoint is a troubleshooting tool
 * that shouldn't force a refactor if/when we add more categories.
 */

const PUBLIC_PATHS = [
  "/api/public/videos",
  "/api/public/articles",
  "/api/public/learn-topics",
  "/api/public/learn-topics?category=basics",
  "/api/public/learn-topics?category=faq",
  "/api/public/learn-topics?category=myth_buster",
];

const REBUILD_TAGS = [
  "knowledge-videos",
  "knowledge-articles",
  "knowledge-learn-topics",
  "knowledge-learn-topics-basics",
  "knowledge-learn-topics-faq",
  "knowledge-learn-topics-myth_buster",
];

export async function GET() {
  const guard = await requireStaff();
  if (guard) return guard;

  for (const p of PUBLIC_PATHS) revalidatePath(p);
  await Promise.all(REBUILD_TAGS.map((t) => flushTag(t)));

  return NextResponse.json({
    ok: true,
    purgedPaths: PUBLIC_PATHS,
    flushedRebuildTags: REBUILD_TAGS,
  });
}
