/**
 * Excel import helpers & ingestion logic for daily fund uploads.
 *
 * Two upload types per fund:
 *   - FIN_STATS.xlsx     — fund-level NAV / AUM / total units / expenses
 *   - INVESTORS.xlsx     — per-investor holdings + LS/SIP transaction sheets
 *
 * Parsers are tolerant of column-name variations (matching prisma/seed/*).
 */
import ExcelJS, { CellValue } from "exceljs";
import { hash } from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

// ──────────────────────────────────────────────────────────────────
// Cell helpers
// ──────────────────────────────────────────────────────────────────

export function parseExcelNumber(val: CellValue): number | null {
  if (val === null || val === undefined) return 0;

  let str = String(val).trim();
  if (str === "" || str === "-" || str === "- " || /^-\s*$/.test(str)) return 0;
  if (str === "#REF!" || str === "#N/A" || str === "#VALUE!") return null;

  if (typeof val === "number") return val;

  if (typeof val === "object" && val !== null && "result" in val) {
    const result = (val as any).result;
    if (typeof result === "number") return result;
    if (result === null || result === undefined) return 0;
    str = String(result).trim();
  }

  str = str.replace(/,/g, "");
  if (str.startsWith("(") && str.endsWith(")")) {
    str = "-" + str.slice(1, -1);
  }
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

export function parseExcelDate(val: CellValue): Date | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    const epoch = new Date(1899, 11, 30);
    epoch.setDate(epoch.getDate() + val);
    return epoch;
  }
  if (typeof val === "object" && val !== null && "result" in val) {
    return parseExcelDate((val as any).result);
  }
  const str = String(val).trim();
  if (!str || str === "#REF!" || str === "-") return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function getCellString(val: CellValue): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object" && "result" in (val as any)) {
    return String((val as any).result || "").trim();
  }
  return String(val).trim();
}

export function normalizeInvestorCode(code: CellValue): string {
  if (!code) return "";
  return String(code).trim().toUpperCase();
}

export function mapInvestorType(excelType: CellValue): string {
  const type = String(excelType || "Individual").trim();
  const mapping: Record<string, string> = {
    Individual: "INDIVIDUAL",
    "Company/Organization": "COMPANY_ORGANIZATION",
    "Mutual Fund": "MUTUAL_FUND",
    "Provident Fund": "PROVIDENT_FUND",
    "Providend Fund": "PROVIDENT_FUND",
    "Gratuity Fund": "GRATUITY_FUND",
  };
  return mapping[type] || "INDIVIDUAL";
}

// ──────────────────────────────────────────────────────────────────
// FIN_STATS: fund-level summary (NAV, AUM, total units, etc.)
// ──────────────────────────────────────────────────────────────────

export interface FinStatsResult {
  asOfDate: Date | null;
  nav: number | null;
  totalAum: number | null;
  totalUnits: number | null;
  faceValue: number | null;
}

/**
 * Very forgiving FIN_STATS parser: walks all cells looking for
 * key-value pairs like "NAV per Unit" → 14.75.
 */
export async function parseFinStats(buffer: Buffer): Promise<FinStatsResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const result: FinStatsResult = {
    asOfDate: null,
    nav: null,
    totalAum: null,
    totalUnits: null,
    faceValue: null,
  };

  for (const sheet of workbook.worksheets) {
    sheet.eachRow((row) => {
      const cells: { col: number; val: CellValue }[] = [];
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        cells.push({ col, val: cell.value });
      });

      for (let i = 0; i < cells.length - 1; i++) {
        const label = getCellString(cells[i].val).toLowerCase().replace(/\s+/g, " ");
        const next = cells[i + 1].val;

        if (!label) continue;

        if (/nav per unit/.test(label) || /^nav$/.test(label) || /current nav/.test(label)) {
          const v = parseExcelNumber(next);
          if (v !== null && result.nav === null) result.nav = v;
        } else if (/total aum|total asset|net asset value$|total fund value/.test(label)) {
          const v = parseExcelNumber(next);
          if (v !== null && result.totalAum === null) result.totalAum = v;
        } else if (/total units|no.* of units|units outstanding/.test(label)) {
          const v = parseExcelNumber(next);
          if (v !== null && result.totalUnits === null) result.totalUnits = v;
        } else if (/face value/.test(label)) {
          const v = parseExcelNumber(next);
          if (v !== null && result.faceValue === null) result.faceValue = v;
        } else if (/as of|as on|report date|date/.test(label)) {
          const d = parseExcelDate(next);
          if (d && result.asOfDate === null) result.asOfDate = d;
        }
      }
    });
  }

  return result;
}

// ──────────────────────────────────────────────────────────────────
// INVESTORS: per-investor holdings + (optionally) LS/SIP transaction sheets
// ──────────────────────────────────────────────────────────────────

export interface InvestorRow {
  code: string;
  name: string;
  title: string;
  type: string;
}

export interface HoldingRow {
  investorCode: string;
  lsUnitsBought: number;
  lsUnitsSold: number;
  lsCurrentUnits: number;
  lsCostValue: number;
  lsCostOfUnitsSold: number;
  lsCostValueCurrent: number;
  lsRealizedGain: number;
  lsWeight: number;
  lsAvgCost: number;
  lsMarketValue: number;
  sipUnitsBought: number;
  sipUnitsSold: number;
  sipCurrentUnits: number;
  sipCostValue: number;
  sipCostOfUnitsSold: number;
  sipCostValueCurrent: number;
  sipRealizedGain: number;
  sipWeight: number;
  sipAvgCost: number;
  sipMarketValue: number;
  totalUnitsBought: number;
  totalUnitsSold: number;
  boOpeningBalance: number;
  totalCurrentUnits: number;
  totalCostValueCurrent: number;
  avgCost: number;
  nav: number;
  totalMarketValue: number;
  totalSellableUnits: number;
  marketValueSellable: number;
  totalRealizedGain: number;
  totalUnrealizedGain: number;
  percentUnitsHold: number;
  grossDividend: number;
}

export interface TransactionRow {
  investorCode: string;
  channel: "LS" | "SIP";
  direction: "BUY" | "SELL";
  amount: number;
  nav: number;
  units: number;
  cumulativeUnits: number;
  unitCapital: number;
  unitPremium: number;
  avgCostAtTime: number;
  realizedGain: number;
  costOfUnitsSold: number;
  uniqueCode: string;
  orderDate: Date;
}

export interface InvestorsWorkbookResult {
  investors: InvestorRow[];
  holdings: HoldingRow[];
  transactions: TransactionRow[];
}

function buildHeaderMapFromRow(row: ExcelJS.Row): Record<string, number> {
  const map: Record<string, number> = {};
  row.eachCell({ includeEmpty: false }, (cell, col) => {
    const val = getCellString(cell.value).toUpperCase().replace(/\s+/g, " ").trim();
    if (val) map[val] = col;
  });
  return map;
}

function parseHoldingsSheet(
  sheet: ExcelJS.Worksheet,
  investorMap: Map<string, InvestorRow>,
  holdings: HoldingRow[]
) {
  const headerRow = sheet.getRow(1);
  const headers = buildHeaderMapFromRow(headerRow);

  const getNum = (row: ExcelJS.Row, ...names: string[]): number => {
    for (const name of names) {
      const col = headers[name];
      if (col) {
        const v = parseExcelNumber(row.getCell(col).value);
        if (v !== null) return v;
      }
    }
    return 0;
  };

  const codeCol = headers["INVESTOR CODE"] || headers["INVESTOR"] || headers["CODE"];
  const nameCol = headers["INVESTOR NAME"] || headers["NAME"];
  const titleCol = headers["TITLE"];
  const typeCol = headers["TYPE OF INVESTOR"] || headers["INVESTOR TYPE"];

  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);

    let code = "";
    let name = "";
    if (nameCol) name = getCellString(row.getCell(nameCol).value);
    if (codeCol && codeCol !== nameCol) {
      code = normalizeInvestorCode(row.getCell(codeCol).value);
    }
    if (!code) {
      for (let c = 1; c <= Math.min(5, headerRow.cellCount); c++) {
        const v = getCellString(row.getCell(c).value);
        if (/^[A-Z]\d{4,6}$/.test(v)) {
          code = v;
          break;
        }
      }
    }
    if (!name) name = getCellString(row.getCell(1).value);
    if (!name || /^(Total|Grand|Summary)/i.test(name)) continue;
    if (!code) continue;

    const title = titleCol ? getCellString(row.getCell(titleCol).value) : "";
    const type = typeCol ? getCellString(row.getCell(typeCol).value) : "Individual";

    if (!investorMap.has(code)) {
      investorMap.set(code, {
        code,
        name,
        title,
        type: mapInvestorType(type),
      });
    }

    holdings.push({
      investorCode: code,
      lsUnitsBought: getNum(row, "LS_TOTAL UNITS BUY", "LS TOTAL UNITS BUY"),
      lsUnitsSold: getNum(row, "LS_TOTAL UNITS SOLD", "LS TOTAL UNITS SOLD"),
      lsCurrentUnits: getNum(row, "LS_TOTAL CURRENT UNITS", "LS TOTAL CURRENT UNITS"),
      lsCostValue: getNum(row, "LS_TOTAL COST VALUE", "LS TOTAL COST VALUE"),
      lsCostOfUnitsSold: getNum(row, "LS_TOTAL COST OF UNITS SOLD", "LS TOTAL COST OF UNITS SOLD"),
      lsCostValueCurrent: getNum(row, "LS_TOTAL COST VALUE OF CURRENT UNITS", "LS TOTAL COST VALUE OF CURRENT UNITS"),
      lsRealizedGain: getNum(row, "LS_TOTAL REALIZED GAIN", "LS TOTAL REALIZED GAIN"),
      lsWeight: getNum(row, "LS_WEIGHT", "LS WEIGHT"),
      lsAvgCost: getNum(row, "LS_AVERAGE COST", "LS AVERAGE COST"),
      lsMarketValue: getNum(row, "LS_TOTAL MARKET VALUE", "LS TOTAL MARKET VALUE"),
      sipUnitsBought: getNum(row, "SIP_TOTAL UNITS BUY", "SIP TOTAL UNITS BUY"),
      sipUnitsSold: getNum(row, "SIP_TOTAL UNITS SOLD", "SIP TOTAL UNITS SOLD"),
      sipCurrentUnits: getNum(row, "SIP_TOTAL CURRENT UNITS", "SIP TOTAL CURRENT UNITS"),
      sipCostValue: getNum(row, "SIP_TOTAL COST VALUE", "SIP TOTAL COST VALUE"),
      sipCostOfUnitsSold: getNum(row, "SIP_TOTAL COST OF UNITS SOLD", "SIP TOTAL COST OF UNITS SOLD"),
      sipCostValueCurrent: getNum(row, "SIP_TOTAL COST VALUE OF CURRENT UNITS", "SIP TOTAL COST VALUE OF CURRENT UNITS"),
      sipRealizedGain: getNum(row, "SIP_TOTAL REALIZED GAIN", "SIP TOTAL REALIZED GAIN"),
      sipWeight: getNum(row, "SIP_WEIGHT", "SIP WEIGHT"),
      sipAvgCost: getNum(row, "SIP_AVERAGE COST", "SIP AVERAGE COST"),
      sipMarketValue: getNum(row, "SIP_TOTAL MARKET VALUE", "SIP TOTAL MARKET VALUE"),
      totalUnitsBought: getNum(row, "TOTAL UNITS BUY", "TOTAL UNITS BOUGHT"),
      totalUnitsSold: getNum(row, "TOTAL UNITS SOLD"),
      boOpeningBalance: getNum(row, "BO OPENING BALANCE"),
      totalCurrentUnits: getNum(row, "TOTAL CURRENT UNITS", "TOTAL UNITS"),
      totalCostValueCurrent: getNum(row, "TOTAL COST VALUE OF CURRENT INVESTMENT", "TOTAL COST VALUE"),
      avgCost: getNum(row, "AVERAGE COST", "AVG COST"),
      nav: getNum(row, "NAV"),
      totalMarketValue: getNum(row, "TOTAL MARKET VALUE"),
      totalSellableUnits: getNum(row, "TOTAL SELLABLE UNITS"),
      marketValueSellable: getNum(row, "MARKET VALUE OF SELLABLE UNITS"),
      totalRealizedGain: getNum(row, "TOTAL REALIZED GAIN"),
      totalUnrealizedGain: getNum(row, "TOTAL UNREALIZED GAIN"),
      percentUnitsHold: getNum(row, "% OF UNITS HOLD", "PERCENT OF UNITS HOLD"),
      grossDividend: getNum(row, "GROSS DIVIDEND"),
    });
  }
}

function parseTransactionsSheet(
  sheet: ExcelJS.Worksheet,
  channel: "LS" | "SIP",
  out: TransactionRow[]
) {
  const headerRow = sheet.getRow(2);
  const headers: Record<string, number> = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    const key = getCellString(cell.value).toLowerCase().replace(/\s+/g, " ").trim();
    if (key) headers[key] = col;
  });

  const col = (name: string) => headers[name.toLowerCase()];

  const c = {
    year: col("Year"),
    month: col("Month"),
    day: col("Day"),
    dateValue: col("Date Value"),
    investorId: col("Investor ID"),
    uniqueCode: col("Unique Code"),
    bs: col("B/S"),
    amount: col("Amount"),
    nav: col("NAV (Strike Rate)"),
    unit: col("Unit"),
    cumulativeUnit: col("Cumulative Unit"),
    unitCapital: col("Unit Capital"),
    unitPremium: col("Unit Premium Reserve"),
    avgCost: col("NAV at Cost (Average)"),
    realizedGain: col("Realized Gain"),
    costOfSold: col("Cost of Units Sold"),
  };

  if (!c.investorId || !c.bs || !c.amount) return;

  for (let r = 3; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    const investorCode = normalizeInvestorCode(row.getCell(c.investorId).value);
    if (!investorCode) continue;

    const bs = getCellString(row.getCell(c.bs).value).toUpperCase();
    if (bs !== "B" && bs !== "S") continue;

    const amount = parseExcelNumber(row.getCell(c.amount).value);
    if (amount === null || amount === 0) continue;

    let orderDate: Date | null = null;
    if (c.dateValue) orderDate = parseExcelDate(row.getCell(c.dateValue).value);
    if (!orderDate && c.year && c.month && c.day) {
      const y = parseExcelNumber(row.getCell(c.year).value);
      const m = parseExcelNumber(row.getCell(c.month).value);
      const d = parseExcelNumber(row.getCell(c.day).value);
      if (y && m && d) orderDate = new Date(y, m - 1, d);
    }
    if (!orderDate) continue;

    const uniqueCode = c.uniqueCode
      ? getCellString(row.getCell(c.uniqueCode).value)
      : `${investorCode}-${channel}-${r}`;

    out.push({
      investorCode,
      channel,
      direction: bs === "B" ? "BUY" : "SELL",
      amount,
      nav: c.nav ? parseExcelNumber(row.getCell(c.nav).value) ?? 0 : 0,
      units: c.unit ? parseExcelNumber(row.getCell(c.unit).value) ?? 0 : 0,
      cumulativeUnits: c.cumulativeUnit ? parseExcelNumber(row.getCell(c.cumulativeUnit).value) ?? 0 : 0,
      unitCapital: c.unitCapital ? parseExcelNumber(row.getCell(c.unitCapital).value) ?? 0 : 0,
      unitPremium: c.unitPremium ? parseExcelNumber(row.getCell(c.unitPremium).value) ?? 0 : 0,
      avgCostAtTime: c.avgCost ? parseExcelNumber(row.getCell(c.avgCost).value) ?? 0 : 0,
      realizedGain: c.realizedGain ? parseExcelNumber(row.getCell(c.realizedGain).value) ?? 0 : 0,
      costOfUnitsSold: c.costOfSold ? parseExcelNumber(row.getCell(c.costOfSold).value) ?? 0 : 0,
      uniqueCode,
      orderDate,
    });
  }
}

export async function parseInvestorsWorkbook(
  buffer: Buffer
): Promise<InvestorsWorkbookResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const investorMap = new Map<string, InvestorRow>();
  const holdings: HoldingRow[] = [];
  const transactions: TransactionRow[] = [];

  // Find the holdings sheet (named "INVESTORS" or the first sheet)
  let holdingsSheet: ExcelJS.Worksheet | null = null;
  for (const s of workbook.worksheets) {
    if (/^investors?$/i.test(s.name)) {
      holdingsSheet = s;
      break;
    }
  }
  if (!holdingsSheet) holdingsSheet = workbook.worksheets[0] || null;

  if (holdingsSheet) parseHoldingsSheet(holdingsSheet, investorMap, holdings);

  // Find LS / SIP transaction sheets
  for (const s of workbook.worksheets) {
    const n = s.name.toLowerCase();
    if (/^ls$/i.test(s.name) || /lump.?sum/i.test(n)) {
      parseTransactionsSheet(s, "LS", transactions);
    } else if (/^sip$/i.test(s.name)) {
      parseTransactionsSheet(s, "SIP", transactions);
    }
  }

  return {
    investors: Array.from(investorMap.values()),
    holdings,
    transactions,
  };
}

// ──────────────────────────────────────────────────────────────────
// Ingestion
// ──────────────────────────────────────────────────────────────────

export async function ingestFinStats(
  prisma: PrismaClient,
  fundId: string,
  parsed: FinStatsResult,
  asOfDate: Date
) {
  const updates: any = {};
  const fund = await prisma.fund.findUnique({ where: { id: fundId } });
  if (!fund) throw new Error("Fund not found");

  if (parsed.nav !== null) {
    updates.previousNav = fund.currentNav;
    updates.currentNav = parsed.nav;
  }
  if (parsed.totalAum !== null) updates.totalAum = parsed.totalAum;
  if (parsed.totalUnits !== null) updates.totalUnits = parsed.totalUnits;
  if (parsed.faceValue !== null) updates.faceValue = parsed.faceValue;

  if (Object.keys(updates).length > 0) {
    await prisma.fund.update({ where: { id: fundId }, data: updates });
  }

  // Upsert NAV record for the date
  if (parsed.nav !== null) {
    await prisma.navRecord.upsert({
      where: { fundId_date: { fundId, date: asOfDate } },
      update: { nav: parsed.nav },
      create: { fundId, date: asOfDate, nav: parsed.nav },
    });
  }

  return { updatedFields: Object.keys(updates).length };
}

export async function ingestInvestors(
  prisma: PrismaClient,
  fundId: string,
  parsed: InvestorsWorkbookResult
) {
  let usersCreated = 0;
  let holdingsUpserted = 0;
  let txCreated = 0;

  // 1. Create users/investors that don't exist yet
  for (const inv of parsed.investors) {
    const existing = await prisma.investor.findUnique({ where: { investorCode: inv.code } });
    if (existing) continue;

    const passwordHash = await hash(`Ekush@${inv.code}2026`, 10);
    try {
      await prisma.user.create({
        data: {
          passwordHash,
          role: "INVESTOR",
          status: "PENDING",
          investor: {
            create: {
              investorCode: inv.code,
              name: inv.name,
              title: inv.title || null,
              investorType: inv.type,
            },
          },
        },
      });
      usersCreated++;
    } catch (e: any) {
      if (e.code !== "P2002") throw e;
    }
  }

  // 2. Upsert holdings
  for (const h of parsed.holdings) {
    const investor = await prisma.investor.findUnique({
      where: { investorCode: h.investorCode },
    });
    if (!investor) continue;

    const data = {
      lsUnitsBought: h.lsUnitsBought,
      lsUnitsSold: h.lsUnitsSold,
      lsCurrentUnits: h.lsCurrentUnits,
      lsCostValue: h.lsCostValue,
      lsCostOfUnitsSold: h.lsCostOfUnitsSold,
      lsCostValueCurrent: h.lsCostValueCurrent,
      lsRealizedGain: h.lsRealizedGain,
      lsWeight: h.lsWeight,
      lsAvgCost: h.lsAvgCost,
      lsMarketValue: h.lsMarketValue,
      sipUnitsBought: h.sipUnitsBought,
      sipUnitsSold: h.sipUnitsSold,
      sipCurrentUnits: h.sipCurrentUnits,
      sipCostValue: h.sipCostValue,
      sipCostOfUnitsSold: h.sipCostOfUnitsSold,
      sipCostValueCurrent: h.sipCostValueCurrent,
      sipRealizedGain: h.sipRealizedGain,
      sipWeight: h.sipWeight,
      sipAvgCost: h.sipAvgCost,
      sipMarketValue: h.sipMarketValue,
      totalUnitsBought: h.totalUnitsBought,
      totalUnitsSold: h.totalUnitsSold,
      boOpeningBalance: h.boOpeningBalance,
      totalCurrentUnits: h.totalCurrentUnits,
      totalCostValueCurrent: h.totalCostValueCurrent,
      avgCost: h.avgCost,
      nav: h.nav,
      totalMarketValue: h.totalMarketValue,
      totalSellableUnits: h.totalSellableUnits,
      marketValueSellable: h.marketValueSellable,
      totalRealizedGain: h.totalRealizedGain,
      totalUnrealizedGain: h.totalUnrealizedGain,
      percentUnitsHold: h.percentUnitsHold,
      grossDividend: h.grossDividend,
    };

    await prisma.fundHolding.upsert({
      where: { investorId_fundId: { investorId: investor.id, fundId } },
      update: data,
      create: { investorId: investor.id, fundId, ...data },
    });
    holdingsUpserted++;
  }

  // 3. Insert transactions (skip duplicates by uniqueCode within same fund/investor)
  const investorByCode = new Map<string, string>();
  for (const inv of parsed.investors) {
    const found = await prisma.investor.findUnique({
      where: { investorCode: inv.code },
      select: { id: true },
    });
    if (found) investorByCode.set(inv.code, found.id);
  }

  for (const tx of parsed.transactions) {
    const investorId = investorByCode.get(tx.investorCode);
    if (!investorId) continue;

    // Skip if already exists (same investor, fund, uniqueCode)
    const existing = await prisma.transaction.findFirst({
      where: { investorId, fundId, uniqueCode: tx.uniqueCode },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.transaction.create({
      data: {
        investorId,
        fundId,
        channel: tx.channel,
        direction: tx.direction,
        amount: tx.amount,
        nav: tx.nav,
        units: tx.units,
        cumulativeUnits: tx.cumulativeUnits,
        unitCapital: tx.unitCapital,
        unitPremium: tx.unitPremium,
        avgCostAtTime: tx.avgCostAtTime,
        realizedGain: tx.realizedGain,
        costOfUnitsSold: tx.costOfUnitsSold,
        uniqueCode: tx.uniqueCode,
        orderDate: tx.orderDate,
        status: "EXECUTED",
      },
    });
    txCreated++;
  }

  return { usersCreated, holdingsUpserted, txCreated };
}
