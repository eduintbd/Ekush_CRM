import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public singleton for the rebuild's homepage popup. Returns
 * { imageUrl: string | null } — null when nothing is pinned, which
 * the rebuild treats as "don't render any popup".
 *
 * Short edge-cache window so admin pins propagate quickly; the
 * admin POST also revalidatePath + flushTag this route so the
 * common case is instant.
 */
export const dynamic = "force-dynamic";

const SINGLETON_ID = "singleton";

export async function GET() {
  const row = await prisma.frontPagePopup.findUnique({
    where: { id: SINGLETON_ID },
    select: { imageUrl: true, updatedAt: true },
  });

  return NextResponse.json(
    {
      imageUrl: row?.imageUrl ?? null,
      updatedAt: row?.updatedAt ?? null,
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}
