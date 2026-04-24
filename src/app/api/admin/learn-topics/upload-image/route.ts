import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/upload";
import { requireStaff } from "../../knowledge/_guard";

/**
 * Admin upload endpoint for Learn Topic cover images. Mirror of the
 * article upload-cover flow — accepts a FormData file, pushes it to
 * Vercel Blob, and returns { url } that the learn-topic form saves
 * into LearnTopic.imageUrl via the POST/PATCH endpoints.
 *
 * Same 20 MB cap and any-mime policy as articles. The admin form
 * restricts to `accept="image/*"` on the input side so non-image
 * uploads never reach this handler in practice.
 */
export async function POST(req: NextRequest) {
  const guard = await requireStaff();
  if (guard) return guard;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json(
      { error: "file too large (max 20 MB)" },
      { status: 400 },
    );
  }

  const key = `learn-topic-images/${Date.now()}-${file.name}`.replace(
    /\s+/g,
    "-",
  );
  const url = await uploadFile(file, key);
  return NextResponse.json({ url });
}
