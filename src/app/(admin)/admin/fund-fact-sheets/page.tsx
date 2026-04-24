import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FUNDS: { code: string; label: string }[] = [
  { code: "EFUF", label: "Ekush First Unit Fund" },
  { code: "EGF", label: "Ekush Growth Fund" },
  { code: "ESRF", label: "Ekush Stable Return Fund" },
];

export default async function AdminFundFactSheetsPage() {
  const sheets = await prisma.fundFactSheet.findMany();
  const byCode = new Map(sheets.map((s) => [s.fundCode, s]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">
          Fund Fact Sheets
        </h1>
        <p className="text-[13px] text-text-body">
          Quarterly asset allocation + top-5 holdings that render on each
          fund page&rsquo;s Fact Sheet panel on ekushwml.com.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-text-body">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Fund</th>
              <th className="px-4 py-3 text-left font-semibold">As of</th>
              <th className="px-4 py-3 text-right font-semibold">
                Allocation rows
              </th>
              <th className="px-4 py-3 text-right font-semibold">
                Top holdings
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {FUNDS.map(({ code, label }) => {
              const s = byCode.get(code);
              const allocRows = Array.isArray(s?.assetAllocation)
                ? (s!.assetAllocation as unknown[]).length
                : 0;
              const holdingsRows = Array.isArray(s?.topHoldings)
                ? (s!.topHoldings as unknown[]).length
                : 0;
              return (
                <tr
                  key={code}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">{label}</span>
                    <span className="ml-2 rounded bg-[#FFF4EC] px-1.5 py-0.5 text-[10px] font-semibold text-ekush-orange">
                      {code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#4A4A4A]">
                    {s?.asOfDate
                      ? new Date(s.asOfDate).toISOString().slice(0, 10)
                      : "— not set —"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {allocRows}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {holdingsRows}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/fund-fact-sheets/${code}`}
                      className="text-[12px] font-semibold text-ekush-orange hover:underline"
                    >
                      {s ? "Edit" : "Set up"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
