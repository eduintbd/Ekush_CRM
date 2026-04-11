import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FundReportUpload } from "@/components/admin/fund-report-upload";
import { formatDate } from "@/lib/utils";
import { FUND_CODES } from "@/lib/constants";
import { FileText } from "lucide-react";
import { DeleteFundReportButton } from "@/components/admin/delete-fund-report-button";

export const dynamic = "force-dynamic";

const REPORT_TYPES = [
  { key: "FUND_SYNOPSIS", label: "Fund Synopsis" },
  { key: "HISTORICAL_PERFORMANCE", label: "Historical Performance" },
  { key: "PORTFOLIO_STATEMENT", label: "Portfolio Statement" },
  { key: "FINANCIAL_STATEMENT", label: "Financial Statement" },
  { key: "FORMATION_DOCUMENT", label: "Formation Document" },
  { key: "DIVIDEND_HISTORY", label: "Dividend History" },
  { key: "FORM_PDF", label: "Form PDF" },
];

export default async function AdminFundReportsPage() {
  const funds = await prisma.fund.findMany({
    where: { code: { in: [...FUND_CODES] } },
    orderBy: { code: "asc" },
    include: {
      fundReports: {
        orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Fund Reports</h1>
        <p className="text-[13px] text-text-body">
          7 report categories per fund. Upload new PDFs or download historical documents.
        </p>
      </div>

      {funds.map((fund) => {
        // Group reports by type
        const byType = new Map<string, typeof fund.fundReports>();
        for (const r of fund.fundReports) {
          if (!byType.has(r.reportType)) byType.set(r.reportType, []);
          byType.get(r.reportType)!.push(r);
        }

        return (
          <Card key={fund.id}>
            <CardHeader>
              <CardTitle className="text-[15px] flex items-center gap-2">
                <span className="w-8 h-8 rounded bg-ekush-orange text-white flex items-center justify-center text-[11px] font-bold">
                  {fund.code}
                </span>
                {fund.name}
                <span className="text-[11px] font-normal text-text-body ml-auto">
                  {fund.fundReports.length} documents
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {REPORT_TYPES.map((rt) => {
                const docs = byType.get(rt.key) || [];
                return (
                  <details
                    key={rt.key}
                    className="group border border-gray-100 rounded-lg overflow-hidden"
                    open={docs.length > 0 && docs.length <= 5}
                  >
                    <summary className="px-4 py-2.5 bg-gray-50 cursor-pointer flex items-center justify-between text-[13px] font-medium text-text-dark hover:bg-gray-100 transition-colors">
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-ekush-orange/10 text-ekush-orange flex items-center justify-center text-[10px] font-bold">
                          {docs.length}
                        </span>
                        {rt.label}
                      </span>
                      <span className="text-[10px] text-text-muted group-open:hidden">Click to expand</span>
                    </summary>
                    <div className="p-3 space-y-2 bg-white">
                      {/* Upload tile */}
                      <FundReportUpload
                        fundId={fund.id}
                        fundCode={fund.code}
                        reportType={rt.key}
                        reportLabel={`Add new ${rt.label}`}
                      />

                      {/* Document list */}
                      {docs.length > 0 ? (
                        <div className="space-y-1 mt-2">
                          {docs.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between px-3 py-2 bg-page-bg rounded-md text-[12px] hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <FileText className="w-4 h-4 text-red-500 shrink-0" />
                                <span className="font-medium truncate">{r.title}</span>
                                {r.reportDate && (
                                  <span className="text-text-muted text-[10px] shrink-0">
                                    {formatDate(r.reportDate)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <a
                                  href={r.filePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 text-[11px] bg-white border border-ekush-orange text-ekush-orange rounded hover:bg-ekush-orange hover:text-white transition-colors"
                                >
                                  Download
                                </a>
                                <DeleteFundReportButton id={r.id} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-text-muted text-center py-2">
                          No {rt.label.toLowerCase()} yet. Upload above.
                        </p>
                      )}
                    </div>
                  </details>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
