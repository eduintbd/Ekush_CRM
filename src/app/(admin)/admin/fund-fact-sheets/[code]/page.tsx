import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  FundFactSheetForm,
  type FactSheetFormInitial,
} from "@/components/admin/funds/fund-fact-sheet-form";

export const dynamic = "force-dynamic";

const FUND_LABELS: Record<string, string> = {
  EFUF: "Ekush First Unit Fund",
  EGF: "Ekush Growth Fund",
  ESRF: "Ekush Stable Return Fund",
};

export default async function EditFundFactSheetPage({
  params,
}: {
  params: { code: string };
}) {
  const code = params.code.toUpperCase();
  if (!FUND_LABELS[code]) notFound();

  const existing = await prisma.fundFactSheet.findUnique({
    where: { fundCode: code },
  });

  const initial: FactSheetFormInitial = {
    fundCode: code,
    asOfDate: existing?.asOfDate
      ? new Date(existing.asOfDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    assetAllocation: Array.isArray(existing?.assetAllocation)
      ? (existing!.assetAllocation as {
          category: string;
          weightPct: number;
        }[])
      : [],
    topHoldings: Array.isArray(existing?.topHoldings)
      ? (existing!.topHoldings as {
          ticker: string;
          name: string;
          weightPct: number;
        }[])
      : [],
    sourcePdfUrl: existing?.sourcePdfUrl ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/fund-fact-sheets"
          className="text-[12px] font-semibold text-[#8A8A8A] hover:text-ekush-orange"
        >
          ← Back to fact sheets
        </Link>
        <h1 className="mt-1 text-[20px] font-semibold text-text-dark font-rajdhani">
          {FUND_LABELS[code]}
        </h1>
        <p className="text-[13px] text-text-body">
          Edit the asset allocation + top holdings shown in the Fund Fact
          Sheet panel on <span className="font-mono">/fund/{slugFor(code)}</span>.
        </p>
      </div>
      <FundFactSheetForm initial={initial} />
    </div>
  );
}

function slugFor(code: string): string {
  switch (code) {
    case "EFUF":
      return "first-unit-fund";
    case "EGF":
      return "growth-fund";
    case "ESRF":
      return "stable-return-fund";
    default:
      return code.toLowerCase();
  }
}
