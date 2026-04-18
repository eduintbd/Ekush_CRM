import { NextResponse, type NextRequest } from "next/server";
import {
  parsePayloadFromParams,
  verifyCertificate,
} from "@/lib/certificate-token";

const FUND_NAMES: Record<string, string> = {
  EFUF: "Ekush First Unit Fund",
  EGF: "Ekush Growth Fund",
  ESRF: "Ekush Stable Return Fund",
};

export async function GET(request: NextRequest) {
  const parsed = parsePayloadFromParams(request.nextUrl.searchParams);
  if (!parsed) {
    return NextResponse.json({ valid: false, reason: "missing_params" }, { status: 400 });
  }

  const ok = verifyCertificate(parsed.payload, parsed.token);
  if (!ok) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  return NextResponse.json({
    valid: true,
    amcName: "Ekush Wealth Management Limited",
    investorCode: parsed.payload.investorCode,
    investorName: parsed.payload.investorName,
    fundCode: parsed.payload.fundCode,
    fundName: FUND_NAMES[parsed.payload.fundCode] ?? parsed.payload.fundCode,
    units: parsed.payload.units,
    issueDate: parsed.payload.issueDate,
  });
}
