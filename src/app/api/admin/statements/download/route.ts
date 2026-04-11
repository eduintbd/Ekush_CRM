import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPPORT", "SUPER_ADMIN"];

function csvEscape(val: any): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(rows: Record<string, any>[], headers: string[]): string {
  const head = headers.join(",");
  const body = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")).join("\n");
  return head + "\n" + body;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;

  if (!session || !ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const investorId = req.nextUrl.searchParams.get("investorId");
  const type = req.nextUrl.searchParams.get("type") || "portfolio";

  if (!investorId) {
    return NextResponse.json({ error: "investorId is required" }, { status: 400 });
  }

  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    select: { id: true, investorCode: true, name: true },
  });

  if (!investor) {
    return NextResponse.json({ error: "Investor not found" }, { status: 404 });
  }

  let csv = "";
  let filename = `${investor.investorCode}_${type}.csv`;

  if (type === "portfolio") {
    const holdings = await prisma.fundHolding.findMany({
      where: { investorId },
      include: { fund: true },
    });
    const rows = holdings.map((h) => ({
      fund_code: h.fund.code,
      fund_name: h.fund.name,
      units: Number(h.totalCurrentUnits).toFixed(4),
      avg_cost: Number(h.avgCost).toFixed(4),
      current_nav: Number(h.fund.currentNav).toFixed(4),
      cost_value: Number(h.totalCostValueCurrent).toFixed(2),
      market_value: (Number(h.totalCurrentUnits) * Number(h.fund.currentNav)).toFixed(2),
      gain_loss: (Number(h.totalCurrentUnits) * Number(h.fund.currentNav) - Number(h.totalCostValueCurrent)).toFixed(2),
    }));
    csv = toCSV(rows, ["fund_code", "fund_name", "units", "avg_cost", "current_nav", "cost_value", "market_value", "gain_loss"]);
  } else if (type === "transactions") {
    const txs = await prisma.transaction.findMany({
      where: { investorId },
      include: { fund: { select: { code: true } } },
      orderBy: { orderDate: "desc" },
    });
    const rows = txs.map((t) => ({
      date: t.orderDate.toISOString().split("T")[0],
      fund: t.fund.code,
      direction: t.direction,
      channel: t.channel,
      amount: Number(t.amount).toFixed(2),
      units: Number(t.units).toFixed(4),
      nav: Number(t.nav).toFixed(4),
      status: t.status,
      payment_method: t.paymentMethod || "",
      unique_code: t.uniqueCode || "",
    }));
    csv = toCSV(rows, ["date", "fund", "direction", "channel", "amount", "units", "nav", "status", "payment_method", "unique_code"]);
  } else if (type === "dividends") {
    const divs = await prisma.dividend.findMany({
      where: { investorId },
      include: { fund: { select: { code: true } } },
      orderBy: { paymentDate: "desc" },
    });
    const rows = divs.map((d) => ({
      year: d.accountingYear,
      fund: d.fund.code,
      payment_date: d.paymentDate ? d.paymentDate.toISOString().split("T")[0] : "",
      units: Number(d.totalUnits).toFixed(4),
      dividend_per_unit: Number(d.dividendPerUnit).toFixed(2),
      gross_dividend: Number(d.grossDividend).toFixed(2),
      tax_rate: Number(d.taxRate).toFixed(2),
      tax_amount: Number(d.taxAmount).toFixed(2),
      net_dividend: Number(d.netDividend).toFixed(2),
      option: d.dividendOption,
    }));
    csv = toCSV(rows, ["year", "fund", "payment_date", "units", "dividend_per_unit", "gross_dividend", "tax_rate", "tax_amount", "net_dividend", "option"]);
  } else if (type === "tax") {
    const certs = await prisma.taxCertificate.findMany({
      where: { investorId },
      include: { fund: { select: { code: true } } },
      orderBy: { periodEnd: "desc" },
    });
    const rows = certs.map((c) => ({
      period_start: c.periodStart ? c.periodStart.toISOString().split("T")[0] : "",
      period_end: c.periodEnd ? c.periodEnd.toISOString().split("T")[0] : "",
      fund: c.fund.code,
      net_investment: Number(c.netInvestment).toFixed(2),
      realized_gain: Number(c.totalRealizedGain).toFixed(2),
      gross_dividend: Number(c.totalGrossDividend).toFixed(2),
      tax: Number(c.totalTax).toFixed(2),
      net_dividend: Number(c.totalNetDividend).toFixed(2),
    }));
    csv = toCSV(rows, ["period_start", "period_end", "fund", "net_investment", "realized_gain", "gross_dividend", "tax", "net_dividend"]);
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
