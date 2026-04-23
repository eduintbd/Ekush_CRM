import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchYoutubeHealthBatch } from "@/lib/youtube";
import { requireStaff } from "../../knowledge/_guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Manual health check — no cron wired up per product spec. Admin
 * clicks "Check health" on /admin/videos and gets a JSON list of
 * rows that would render as a broken card on the marketing site.
 *
 * Flags a row as an issue when YouTube reports:
 *   - not_found       — video deleted / region-blocked / fully private
 *   - private         — privacyStatus !== "public"
 *   - not_embeddable  — status.embeddable === false
 *
 * Rows that pass all three checks are omitted from the response.
 * Admin sees "All X videos are healthy" when the issues array is
 * empty.
 */

type Issue = {
  id: string;
  videoId: string;
  storedTitle: string;
  currentTitle: string;
  kind: "not_found" | "private" | "not_embeddable";
  isPublished: boolean;
};

export async function GET() {
  const guard = await requireStaff();
  if (guard) return guard;

  const videos = await prisma.video.findMany({
    select: {
      id: true,
      videoId: true,
      title: true,
      isPublished: true,
    },
  });
  if (videos.length === 0) {
    return NextResponse.json({ totalChecked: 0, issues: [] });
  }

  const result = await fetchYoutubeHealthBatch(videos.map((v) => v.videoId));
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, kind: result.kind },
      { status: result.kind === "missing_key" ? 500 : 502 },
    );
  }

  const issues: Issue[] = [];
  for (const v of videos) {
    const info = result.data.get(v.videoId);
    if (!info) {
      issues.push({
        id: v.id,
        videoId: v.videoId,
        storedTitle: v.title,
        currentTitle: "",
        kind: "not_found",
        isPublished: v.isPublished,
      });
      continue;
    }
    if (info.privacyStatus !== "public") {
      issues.push({
        id: v.id,
        videoId: v.videoId,
        storedTitle: v.title,
        currentTitle: info.title,
        kind: "private",
        isPublished: v.isPublished,
      });
      continue;
    }
    if (!info.embeddable) {
      issues.push({
        id: v.id,
        videoId: v.videoId,
        storedTitle: v.title,
        currentTitle: info.title,
        kind: "not_embeddable",
        isPublished: v.isPublished,
      });
    }
  }

  return NextResponse.json({
    totalChecked: videos.length,
    issues,
  });
}
