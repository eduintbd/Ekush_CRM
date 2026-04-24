import Link from "next/link";
import { ResearchReportForm } from "@/components/admin/knowledge/research-report-form";

export default function NewResearchReportPage() {
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
          New report
        </h1>
      </div>
      <ResearchReportForm mode="create" />
    </div>
  );
}
