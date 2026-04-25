import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * Portal Ahona feed — only served to authenticated investors.
 *
 * Behaves like /api/public/ahona but:
 *   • Filters menu to surface IN ("PORTAL", "BOTH") instead of
 *     ("PUBLIC", "BOTH").
 *   • Greeting is personalised with the user's name + investor code,
 *     pulled SERVER-SIDE from the validated session — never from the
 *     request body. This is the cross-user-data-leakage defence:
 *     anything the user types is irrelevant; we always show their
 *     own code, never anyone else's.
 *
 * Unauthenticated callers get 401, which the widget treats as
 * "Ahona disabled here" and renders nothing.
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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [settings, replies] = await Promise.all([
    prisma.ahonaSettings.findUnique({ where: { id: "singleton" } }),
    prisma.ahonaQuickReply.findMany({
      where: {
        isPublished: true,
        surface: { in: ["PORTAL", "BOTH"] },
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

  const enabled = !!settings?.enabledOnPortal;

  // The session is the only trusted source for who this user is.
  // Anything the user might type into the (non-existent) text input
  // is structurally incapable of changing this object.
  const me = {
    name: session.user.name ?? null,
    investorCode: session.user.investorCode ?? null,
  };

  return NextResponse.json(
    {
      enabled,
      me,
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
