import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FundReportUpload } from "@/components/admin/fund-report-upload";
import { formatDate } from "@/lib/utils";
import { FUND_CODES } from "@/lib/constants";
import { FileSpreadsheet } from "lucide-react";
import { DeleteFundReportButton } from "@/components/admin/delete-fund-report-button";

export const dynamic = "force-dynamic";

const REPORT_TYPES = [
  { key: "FIN_STATS", label: "Financial Statistics" },
  { key: "INVESTORS", label: "Investors List" },
  { key: "PORTFOLIO", label: "Portfolio Holdings" },
  { key: "NAV_HISTORY", label: "NAV History" },
  { key: "EXPENSES", label: "Fund Expenses" },
  { key: "HOLDINGS", label: "Unit Holdings" },
];

export default async function AdminFundReportsPage() {
  const funds = await prisma.fund.findMany({
    where: { code: { in: [...FUND_CODES] } },
    orderBy: { code: "asc" },
    include: {
      fundReports: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Fund Reports</h1>
        <p className="text-[13px] text-text-body">Upload Excel files per fund (6 report types × 3 funds = 18 uploads)</p>
      </div>

      {funds.map((fund) => (
        <Card key={fund.id}>
          <CardHeader>
            <CardTitle className="text-[15px] flex items-center gap-2">
              <span className="w-8 h-8 rounded bg-ekush-orange text-white flex items-center justify-center text-[11px] font-bold">
                {fund.code}
              </span>
              {fund.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {REPORT_TYPES.map((rt) => (
                <FundReportUpload
                  key={rt.key}
                  fundId={fund.id}
                  fundCode={fund.code}
                  reportType={rt.key}
                  reportLabel={rt.label}
                />
              ))}
            </div>

            {/* Recent uploads for this fund */}
            {fund.fundReports.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[12px] font-semibold text-text-body mb-2">Recent uploads</p>
                <div className="space-y-1">
                  {fund.fundReports.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-page-bg rounded-md text-[12px]">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />
                        <span className="font-medium truncate">{r.fileName}</span>
                        <span className="text-text-body text-[10px] bg-white px-1.5 py-0.5 rounded shrink-0">
                          {REPORT_TYPES.find((t) => t.key === r.reportType)?.label || r.reportType}
                        </span>
                        <span className="text-text-muted text-[10px] shrink-0">{formatDate(r.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a href={r.filePath} target="_blank" rel="noopener noreferrer" className="text-ekush-orange hover:underline">
                          Download
                        </a>
                        <DeleteFundReportButton id={r.id} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
