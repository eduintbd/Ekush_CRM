import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { requireStaff } from "../knowledge/_guard";

/**
 * Singleton control plane for the rebuild's homepage popup.
 *
 *   GET  → { imageUrl: string | null }
 *          Always succeeds; if the row doesn't exist yet (fresh DB
 *          or nothing has ever been pinned) returns imageUrl: null.
 *
 *   POST → body { imageUrl: string | null }
 *          Upserts the single row keyed on id "singleton". Passing
 *          imageUrl:null clears the popup so nothing renders on the
 *          homepage. Passing a new URL replaces whatever was pinned
 *          before — by design, only one image is live at a time.
 *
 * The row is addressed by a fixed id so this endpoint can't
 * accidentally fan out into multiple popups.
 */

const SINGLETON_ID = "singleton";
const CACHE_TAG = "front-page-popup";
const PUBLIC_PATH = "/api/public/front-page-popup";

export async function GET() {
  const guard = await requireStaff();
  if (guard) return guard;

  const row = await prisma.frontPagePopup.findUnique({
    where: { id: SINGLETON_ID },
    select: { imageUrl: true },
  });
  return NextResponse.json({ imageUrl: row?.imageUrl ?? null });
}

export async function POST(req: NextRequest) {
  const guard = await requireStaff();
  if (guard) return guard;

  const body = (await req.json().catch(() => null)) as
    | { imageUrl?: unknown }
    | null;
  if (!body) {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  let imageUrl: string | null = null;
  if (typeof body.imageUrl === "string") {
    const trimmed = body.imageUrl.trim();
    if (trimmed) {
      if (!/^https?:\/\//i.test(trimmed)) {
        return NextResponse.json(
          { error: "imageUrl must be an http(s) URL or null" },
          { status: 400 },
        );
      }
      imageUrl = trimmed;
    }
  }

  await prisma.frontPagePopup.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, imageUrl },
    update: { imageUrl },
  });

  revalidatePath(PUBLIC_PATH);
  await flushTag(CACHE_TAG);
  return NextResponse.json({ imageUrl });
}
