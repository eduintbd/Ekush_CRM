import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public Ahona feed — anonymous visitors of ekushwml.com.
 *
 *   GET → {
 *     enabled: boolean,
 *     greeting: { en, bn },
 *     contact: { phone, whatsapp, workingHours: { en, bn } },
 *     menu: AhonaPublicNode[]   // tree, top-level first
 *   }
 *
 * The route emits the FULL tree pre-built so the widget can render
 * any branch instantly without a follow-up call. Each user tap is
 * pure client-side state — no backend touch, no logging, no cookies.
 *
 * `enabled: false` → widget hides itself. The kill switch flips this
 * boolean from the admin panel and propagates within the next request
 * (no edge cache).
 */

export const dynamic = "force-dynamic";

type Node = {
  id: string;
  surface: string;
  labelEn: string;
  labelBn: string;
  responseEn: string;
  responseBn: string;
  isContactCard: boolean;
  parentId: string | null;
  displayOrder: number;
};

type Tree = Node & { children: Tree[] };

export async function GET() {
  const [settings, replies] = await Promise.all([
    prisma.ahonaSettings.findUnique({ where: { id: "singleton" } }),
    prisma.ahonaQuickReply.findMany({
      where: {
        isPublished: true,
        surface: { in: ["PUBLIC", "BOTH"] },
      },
      orderBy: [{ parentId: "asc" }, { displayOrder: "asc" }],
      select: {
        id: true,
        parentId: true,
        displayOrder: true,
        surface: true,
        labelEn: true,
        labelBn: true,
        responseEn: true,
        responseBn: true,
        isContactCard: true,
      },
    }),
  ]);

  const enabled = !!settings?.enabledOnWebsite;

  return NextResponse.json(
    {
      enabled,
      greeting: {
        en: settings?.greetingEn ?? "Hi, I'm Ahona — how can I help?",
        bn:
          settings?.greetingBn ??
          "নমস্কার, আমি আহনা — কীভাবে সাহায্য করতে পারি?",
      },
      contact: {
        phone: settings?.phoneNumber ?? null,
        whatsapp: settings?.whatsappNumber ?? null,
        workingHours: {
          en: settings?.workingHoursEn ?? null,
          bn: settings?.workingHoursBn ?? null,
        },
      },
      menu: enabled ? buildTree(replies) : [],
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

function buildTree(rows: Node[]): Tree[] {
  const byParent = new Map<string | null, Tree[]>();
  for (const r of rows) {
    const node: Tree = { ...r, children: [] };
    if (!byParent.has(r.parentId)) byParent.set(r.parentId, []);
    byParent.get(r.parentId)!.push(node);
  }
  // Recursively attach children. The findMany ordering keeps siblings
  // in displayOrder; nested traversal preserves it.
  function attach(nodes: Tree[]) {
    for (const n of nodes) {
      const kids = byParent.get(n.id) ?? [];
      n.children = kids;
      attach(kids);
    }
  }
  const roots = byParent.get(null) ?? [];
  attach(roots);
  return roots;
}
