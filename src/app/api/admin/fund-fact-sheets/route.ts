import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flushTag } from "@/lib/marketing-revalidator";
import { getSession } from "@/lib/auth";
import { requireStaff } from "../knowledge/_guard";
import { parseFactSheetInput } from "./parsers";

/**
 * Fact-sheet writes are upserts keyed on fundCode — one row per
 * fund. All three fund codes (EFUF / EGF / ESRF) need to exist in
 * the admin panel; the form defaults missing ones to an empty
 * shell the admin fills in.
 *
 * GET lists all three rows so the admin landing page can show
 * each fund's as-of-date at a glance.
 */

export async function GET() {
  const guard = await requireStaff();
  if (guard) return guard;

  const sheets = await prisma.fundFactSheet.findMany({
    orderBy: { fundCode: "asc" },
  });
  return NextResponse.json({ sheets });
}

export async function POST(req: NextRequest) {
  const guard = await requireStaff();
  if (guard) return guard;

  const session = await getSession();
  const userId = session?.user.id ?? null;

  const body = (await req.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!body) {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = parseFactSheetInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const sheet = await prisma.fundFactSheet.upsert({
    where: { fundCode: parsed.fundCode },
    create: {
      fundCode: parsed.fundCode,
      asOfDate: parsed.asOfDate,
      assetAllocation: parsed.assetAllocation,
      topHoldings: parsed.topHoldings,
      sourcePdfUrl: parsed.sourcePdfUrl,
      updatedBy: userId,
    },
    update: {
      asOfDate: parsed.asOfDate,
      assetAllocation: parsed.assetAllocation,
      topHoldings: parsed.topHoldings,
      sourcePdfUrl: parsed.sourcePdfUrl,
      updatedBy: userId,
    },
  });

  // Keep the fund-code lowercased in the tag/path to match the
  // existing fund revalidation helpers.
  const code = parsed.fundCode.toLowerCase();
  revalidatePath(`/api/public/funds/${code}/fact-sheet`);
  await flushTag(`fund-${code}-fact-sheet`);

  return NextResponse.json({ sheet });
}
