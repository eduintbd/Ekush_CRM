import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public list of admin-uploaded research-report PDFs for the
 * /knowledge → "Research & Insights" section. No query string, so the
 * Vercel edge cache behaves cleanly — admin writes hit revalidatePath
 * and the entry drops.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.researchReport.findMany({
    where: { isPublished: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      pdfUrl: true,
      pdfSizeBytes: true,
      displayOrder: true,
      createdAt: true,
    },
  });

  // Expose createdAt as publishedAt in the public shape — admins don't
  // pick the date separately, so createdAt is effectively the
  // publication date. Keeps the rebuild's Bridgewater card able to
  // render "April 24, 2026" without a second field.
  const reports = rows.map(({ createdAt, ...rest }) => ({
    ...rest,
    publishedAt: createdAt.toISOString(),
  }));

  return NextResponse.json(reports, {
    headers: {
      // No Vercel-edge caching — revalidatePath doesn't invalidate
      // every edge region reliably, and the rebuild fetches with
      // cache:'no-store' anyway. See articles/route.ts for why.
      "Cache-Control": "private, no-store",
    },
  });
}
