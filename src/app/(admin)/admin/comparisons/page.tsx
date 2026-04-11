import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";
import { ComparisonReportUpload } from "@/components/admin/comparison-report-upload";
import { DeleteComparisonReportButton } from "@/components/admin/delete-comparison-report-button";

export const dynamic = "force-dynamic";

export default async function AdminComparisonsPage() {
  const reports = await prisma.comparisonReport.findMany({
    orderBy: { reportDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Comparison Reports</h1>
        <p className="text-[13px] text-text-body">Upload industry PDFs (e.g., UCB Weekly Mutual Fund Review)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[14px]">Upload New Report</CardTitle>
        </CardHeader>
        <CardContent>
          <ComparisonReportUpload />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[14px]">Uploaded Reports ({reports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-center text-text-muted text-sm py-6">No reports uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-page-bg rounded-md">
                  <FileText className="w-5 h-5 text-red-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-dark truncate">{r.title}</p>
                    <p className="text-[11px] text-text-body">
                      {r.source && <span>{r.source} · </span>}
                      {r.reportDate && <span>{formatDate(r.reportDate)} · </span>}
                      <span>Uploaded {formatDate(r.createdAt)}</span>
                    </p>
                  </div>
                  <a
                    href={r.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-[12px] bg-ekush-orange text-white rounded-md hover:bg-ekush-orange-dark"
                  >
                    Download
                  </a>
                  <DeleteComparisonReportButton id={r.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
