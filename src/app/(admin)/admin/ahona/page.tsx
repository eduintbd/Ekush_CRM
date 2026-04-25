import { prisma } from "@/lib/prisma";
import { AhonaAdminPanel } from "@/components/admin/ahona/admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminAhonaPage() {
  const [settings, replies] = await Promise.all([
    prisma.ahonaSettings.findUnique({ where: { id: "singleton" } }),
    prisma.ahonaQuickReply.findMany({
      orderBy: [{ parentId: "asc" }, { displayOrder: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">
          Ahona — chat assistant
        </h1>
        <p className="text-[13px] text-text-body">
          Menu-driven chat widget on ekushwml.com and the investor portal.
          No AI, no free-text input, nothing the user clicks is logged. Edit
          the menu tree below; flip the kill switches to disable per surface.
        </p>
      </div>

      <AhonaAdminPanel
        initialSettings={
          settings ?? {
            id: "singleton",
            enabledOnWebsite: false,
            enabledOnPortal: false,
            greetingEn: "Hi, I'm Ahona — how can I help?",
            greetingBn: "নমস্কার, আমি আহনা — কীভাবে সাহায্য করতে পারি?",
            phoneNumber: null,
            whatsappNumber: null,
            workingHoursEn: null,
            workingHoursBn: null,
            updatedAt: new Date(),
            updatedBy: null,
          }
        }
        initialReplies={replies}
      />
    </div>
  );
}
