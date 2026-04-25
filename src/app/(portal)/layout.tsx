import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/layout/topbar";
import { AuthProvider } from "@/components/layout/session-provider";
import { AhonaWidget } from "@/components/portal/ahona-widget";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect("/login");
  }

  if (!session) {
    redirect("/login");
  }

  const user = session.user;

  // Pre-load the Ahona menu + settings server-side. Same shape as the
  // /api/portal/ahona route emits — read directly from Prisma here so
  // the layout only takes one DB round-trip and the widget renders
  // synchronously on first paint. Disabled / empty → null prop, the
  // component returns null, no chat shown.
  const [ahonaSettings, ahonaReplies] = await Promise.all([
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

  const ahonaEnabled = !!ahonaSettings?.enabledOnPortal;
  const ahonaFeed = ahonaEnabled
    ? {
        enabled: true,
        greeting: {
          en: ahonaSettings?.greetingEn ?? "Hi, I'm Ahona — how can I help?",
          bn:
            ahonaSettings?.greetingBn ??
            "নমস্কার, আমি আহনা — কীভাবে সাহায্য করতে পারি?",
        },
        contact: {
          phone: ahonaSettings?.phoneNumber ?? null,
          whatsapp: ahonaSettings?.whatsappNumber ?? null,
          workingHours: {
            en: ahonaSettings?.workingHoursEn ?? null,
            bn: ahonaSettings?.workingHoursBn ?? null,
          },
        },
        menu: buildAhonaTree(ahonaReplies),
      }
    : null;

  return (
    <AuthProvider>
      <div className="min-h-screen bg-page-bg">
        <TopBar userName={user?.name} investorCode={user?.investorCode} />
        <main className="max-w-7xl mx-auto px-8 pb-8">{children}</main>

        <ErrorBoundary>
          <AhonaWidget
            feed={ahonaFeed}
            me={{
              name: user?.name ?? null,
              investorCode: user?.investorCode ?? null,
            }}
          />
        </ErrorBoundary>
      </div>
    </AuthProvider>
  );
}

type AhonaRow = {
  id: string;
  parentId: string | null;
  displayOrder: number;
  surface: string;
  labelEn: string;
  labelBn: string;
  responseEn: string;
  responseBn: string;
  isContactCard: boolean;
};
type AhonaTreeNode = AhonaRow & { children: AhonaTreeNode[] };

function buildAhonaTree(rows: AhonaRow[]): AhonaTreeNode[] {
  const byParent = new Map<string | null, AhonaTreeNode[]>();
  for (const r of rows) {
    const node: AhonaTreeNode = { ...r, children: [] };
    if (!byParent.has(r.parentId)) byParent.set(r.parentId, []);
    byParent.get(r.parentId)!.push(node);
  }
  function attach(nodes: AhonaTreeNode[]) {
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
