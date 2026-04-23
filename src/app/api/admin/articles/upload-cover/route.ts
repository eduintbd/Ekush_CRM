import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/upload";
import { requireStaff } from "../../knowledge/_guard";

/**
 * Admin upload endpoint for press-article cover images. Called from
 * the article form when the admin chooses a file rather than pasting
 * an Open Graph URL. Returns a { url } that the form then saves into
 * Article.coverImageUrl via the main PATCH/POST endpoints.
 *
 * File constraints mirror the existing fund-reports upload:
 *   - max 20 MB
 *   - any mime type accepted (Blob preserves it), but the UI restricts
 *     to image/* via the `accept` attribute.
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

  const ext = file.name.split(".").pop() ?? "bin";
  const key = `article-covers/${Date.now()}-${file.name}`.replace(
    /\s+/g,
    "-",
  );
  // ext variable kept so upload path stays readable in Blob console;
  // uploadFile sanitises on its side too.
  void ext;

  const url = await uploadFile(file, key);
  return NextResponse.json({ url });
}
