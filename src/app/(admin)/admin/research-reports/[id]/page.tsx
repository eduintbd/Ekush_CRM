import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ResearchReportForm } from "@/components/admin/knowledge/research-report-form";

export const dynamic = "force-dynamic";

export default async function EditResearchReportPage({
  params,
}: {
  params: { id: string };
}) {
  const report = await prisma.researchReport.findUnique({
    where: { id: params.id },
  });
  if (!report) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/research-reports"
          className="text-[12px] font-semibold text-[#8A8A8A] hover:text-ekush-orange"
        >
          ← Back to reports
        </Link>
        <h1 className="mt-1 text-[20px] font-semibold text-text-dark font-rajdhani">
          Edit report
        </h1>
      </div>
      <ResearchReportForm
        mode="edit"
        initial={{
          id: report.id,
          title: report.title,
          description: report.description,
          pdfUrl: report.pdfUrl,
          pdfSizeBytes: report.pdfSizeBytes,
          displayOrder: report.displayOrder,
          isPublished: report.isPublished,
        }}
      />
    </div>
  );
}
