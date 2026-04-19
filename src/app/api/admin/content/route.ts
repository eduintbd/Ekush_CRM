import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { STAFF_ROLES } from "@/lib/roles";


import { prisma } from "@/lib/prisma";

export async function GET() {
  const articles = await prisma.marketCommentary.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(articles);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  
  if (!STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { title, content, category, publish } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content required" }, { status: 400 });
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") + "-" + Date.now().toString(36);

  const article = await prisma.marketCommentary.create({
    data: {
      title,
      slug,
      content,
      category: category || null,
      authorId: userId,
      publishedAt: publish ? new Date() : null,
    },
  });

  return NextResponse.json(article);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  
  if (!STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { id, title, content, category, publish, unpublish } = body;

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const data: any = {};
  if (title !== undefined) data.title = title;
  if (content !== undefined) data.content = content;
  if (category !== undefined) data.category = category;
  if (publish) data.publishedAt = new Date();
  if (unpublish) data.publishedAt = null;

  const article = await prisma.marketCommentary.update({ where: { id }, data });
  return NextResponse.json(article);
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  
  if (!STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.marketCommentary.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
