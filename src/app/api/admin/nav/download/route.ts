import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FACE_VALUE } from "@/lib/constants";

const ADMIN_ROLES = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPPORT", "SUPER_ADMIN"];

function csvEscape(val: any): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fundCode = req.nextUrl.searchParams.get("fund");
  const fromStr = req.nextUrl.searchParams.get("from");
  const toStr = req.nextUrl.searchParams.get("to");

  const funds = await prisma.fund.findMany();
  const fundById = new Map(funds.map((f) => [f.id, f]));

  const where: any = {};
  if (fundCode && fundCode !== "ALL") {
    const f = funds.find((x) => x.code === fundCode);
    if (f) where.fundId = f.id;
  }
  if (fromStr || toStr) {
    where.date = {};
    if (fromStr) where.date.gte = new Date(fromStr);
    if (toStr) where.date.lte = new Date(toStr);
  }

  const records = await prisma.navRecord.findMany({
    where,
    orderBy: { date: "desc" },
  });

  const headers = [
    "fund_name",
    "fund_code",
    "nav_as_on",
    "nav_per_unit",
    "investor_return_percent",
    "buy_unit",
    "sell_unit",
  ];

  const rows = records.map((r) => {
    const fund = fundById.get(r.fundId);
    const nav = Number(r.nav);
    const face = Number(fund?.faceValue || FACE_VALUE);
    const investorReturn = face > 0 ? ((nav - face) / face) * 100 : 0;
    const entryLoad = Number(fund?.entryLoad || 0);
    const exitLoad = Number(fund?.exitLoad || 0);
    const buyUnit = nav * (1 + entryLoad);
    const sellUnit = nav * (1 - exitLoad);

    return {
      fund_name: fund?.name || "",
      fund_code: fund?.code || "",
      nav_as_on: r.date.toISOString().split("T")[0],
      nav_per_unit: nav.toFixed(4),
      investor_return_percent: investorReturn.toFixed(2),
      buy_unit: buyUnit.toFixed(4),
      sell_unit: sellUnit.toFixed(4),
    };
  });

  const head = headers.join(",");
  const body = rows
    .map((r) => headers.map((h) => csvEscape((r as any)[h])).join(","))
    .join("\n");
  const csv = head + "\n" + body;

  const filename = `nav_sheet${fundCode && fundCode !== "ALL" ? `_${fundCode}` : ""}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
