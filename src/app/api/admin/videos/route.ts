import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../knowledge/_guard";
import { parseVideoInput } from "./parsers";

// Two caches sit in front of the public video list and both must be
// dropped on every write:
//   1. Our own Vercel edge cache — /api/public/videos ships
//      Cache-Control: s-maxage=86400, so Vercel CDN pins the response
//      for a day. revalidatePath purges it.
//   2. The rebuild's Next.js fetch cache — tagged ISR invalidated via
//      the outbound webhook in flushTag.
// Ordering and the single featured row can shift from any individual
// edit, so we always invalidate the whole list.
const CACHE_TAG = "knowledge-videos";
const PUBLIC_PATH = "/api/public/videos";

export async function GET() {
  const guard = await requireStaff();
  if (guard) return guard;

  const videos = await prisma.video.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ videos });
}

export async function POST(req: NextRequest) {
  const guard = await requireStaff();
  if (guard) return guard;

  const body = (await req.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!body) {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = parseVideoInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // One-featured-at-a-time: if the new row is featured, demote every
  // existing featured video inside the same transaction. Prisma can't
  // enforce a partial unique constraint so this is the next-cleanest
  // thing — atomic and fails closed if either step errors.
  const video = await prisma.$transaction(async (tx) => {
    if (parsed.isFeatured) {
      await tx.video.updateMany({
        where: { isFeatured: true },
        data: { isFeatured: false },
      });
    }
    return tx.video.create({ data: parsed });
  });

  revalidatePath(PUBLIC_PATH);
  await flushTag(CACHE_TAG);
  return NextResponse.json({ video });
}
