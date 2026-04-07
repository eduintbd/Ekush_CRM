import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import {
  parseExcelNumber,
  parseExcelDate,
  normalizeInvestorCode,
  getCellString,
  logProgress,
} from "./helpers";

interface FundFile {
  code: string;
  path: string;
}

const FUND_FILES: FundFile[] = [
  { code: "EFUF", path: "C:/Repos/Ekush/EFUF/2026.03.25 INVESTORS.xlsx" },
  { code: "EGF", path: "C:/Repos/Ekush/EGF/EGF_2026.03.25 INVESTORS.xlsx" },
  { code: "ESRF", path: "C:/Repos/Ekush/ESRF/ESRF_2026.03.25 INVESTORS - Copy.xlsx" },
];

interface ParsedTx {
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

/**
 * The LS / SIP sheets share the same column layout. Headers live in row 2;
 * row 1 is a totals/summary row. We resolve columns by header name to be
 * tolerant of extra/empty leading columns.
 */
function buildHeaderMap(sheet: ExcelJS.Worksheet): Record<string, number> {
  const map: Record<string, number> = {};
  const headerRow = sheet.getRow(2);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = getCellString(cell.value).toLowerCase().replace(/\s+/g, " ").trim();
    if (key) map[key] = colNumber;
  });
  return map;
}

function parseSheet(
  sheet: ExcelJS.Worksheet,
  channel: "LS" | "SIP"
): ParsedTx[] {
  const headers = buildHeaderMap(sheet);
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

  if (!c.investorId || !c.bs || !c.amount) {
    logProgress(
      `  ! Missing critical columns in ${channel} sheet (investorId=${c.investorId}, bs=${c.bs}, amount=${c.amount}). Skipping.`
    );
    return [];
  }

  const rows: ParsedTx[] = [];
  for (let r = 3; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    const investorCode = normalizeInvestorCode(row.getCell(c.investorId).value);
    if (!investorCode) continue;

    const bs = getCellString(row.getCell(c.bs).value).toUpperCase();
    if (bs !== "B" && bs !== "S") continue;

    const amount = parseExcelNumber(row.getCell(c.amount).value);
    if (amount === null || amount === 0) continue;

    // Date: prefer Date Value column (formula), else compose from Y/M/D
    let date = c.dateValue ? parseExcelDate(row.getCell(c.dateValue).value) : null;
    if (!date && c.year && c.month && c.day) {
      const y = parseExcelNumber(row.getCell(c.year).value);
      const m = parseExcelNumber(row.getCell(c.month).value);
      const d = parseExcelNumber(row.getCell(c.day).value);
      if (y && m && d) date = new Date(y, m - 1, d);
    }
    if (!date || isNaN(date.getTime())) continue;

    const num = (idx: number | undefined) =>
      idx ? parseExcelNumber(row.getCell(idx).value) ?? 0 : 0;

    rows.push({
      investorCode,
      channel,
      direction: bs === "B" ? "BUY" : "SELL",
      amount: Math.abs(amount), // store positive; direction encodes sign
      nav: num(c.nav),
      units: num(c.unit),
      cumulativeUnits: num(c.cumulativeUnit),
      unitCapital: num(c.unitCapital),
      unitPremium: num(c.unitPremium),
      avgCostAtTime: num(c.avgCost),
      realizedGain: num(c.realizedGain),
      costOfUnitsSold: num(c.costOfSold),
      uniqueCode: getCellString(row.getCell(c.uniqueCode).value) || `${r}_${investorCode}`,
      orderDate: date,
    });
  }

  return rows;
}

export async function importTransactions(prisma: PrismaClient) {
  logProgress("=== Transaction import (LS + SIP) starting ===");

  // Cache investor and fund lookups
  const investors = await prisma.investor.findMany({
    select: { id: true, investorCode: true },
  });
  const investorByCode = new Map(investors.map((i) => [i.investorCode, i.id]));

  const funds = await prisma.fund.findMany({ select: { id: true, code: true } });
  const fundByCode = new Map(funds.map((f) => [f.code, f.id]));

  // Track first purchase date per (investorId, fundId) so we can backfill FundHolding
  const firstPurchase = new Map<string, Date>();
  const fpKey = (iid: string, fid: string) => `${iid}|${fid}`;

  for (const file of FUND_FILES) {
    const fundId = fundByCode.get(file.code);
    if (!fundId) {
      logProgress(`  ! Fund ${file.code} not found in DB, skipping`);
      continue;
    }

    logProgress(`Reading ${file.code} from ${file.path}...`);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file.path);

    for (const channel of ["LS", "SIP"] as const) {
      const sheet = wb.getWorksheet(channel);
      if (!sheet) {
        logProgress(`  ! ${channel} sheet missing in ${file.code}`);
        continue;
      }

      logProgress(`  Parsing ${channel} (${sheet.rowCount} rows)...`);
      const parsed = parseSheet(sheet, channel);
      logProgress(`    parsed ${parsed.length} transactions`);

      // Wipe existing transactions for this fund + channel so re-runs are idempotent
      const deleted = await prisma.transaction.deleteMany({
        where: { fundId, channel },
      });
      if (deleted.count > 0) {
        logProgress(`    deleted ${deleted.count} stale transactions`);
      }

      // Build the createMany payload — skip rows with unknown investors
      let skipped = 0;
      const payload = parsed.flatMap((p) => {
        const iid = investorByCode.get(p.investorCode);
        if (!iid) {
          skipped++;
          return [];
        }
        // Track first purchase
        const key = fpKey(iid, fundId);
        const existing = firstPurchase.get(key);
        if (!existing || p.orderDate < existing) {
          firstPurchase.set(key, p.orderDate);
        }
        return [
          {
            investorId: iid,
            fundId,
            channel: p.channel,
            direction: p.direction,
            amount: p.amount,
            nav: p.nav,
            units: p.units,
            cumulativeUnits: p.cumulativeUnits,
            unitCapital: p.unitCapital,
            unitPremium: p.unitPremium,
            avgCostAtTime: p.avgCostAtTime,
            realizedGain: p.realizedGain,
            costOfUnitsSold: p.costOfUnitsSold,
            uniqueCode: p.uniqueCode,
            orderDate: p.orderDate,
            status: "EXECUTED",
          },
        ];
      });

      if (skipped > 0) {
        logProgress(`    skipped ${skipped} rows with unknown investor codes`);
      }

      // Bulk insert in batches of 1000 (Postgres parameter limit)
      const BATCH = 1000;
      let inserted = 0;
      for (let i = 0; i < payload.length; i += BATCH) {
        const batch = payload.slice(i, i + BATCH);
        const result = await prisma.transaction.createMany({
          data: batch,
          skipDuplicates: true,
        });
        inserted += result.count;
      }
      logProgress(`    inserted ${inserted} transactions`);
    }
  }

  // Backfill FundHolding.firstPurchaseDate
  logProgress(`Backfilling firstPurchaseDate on ${firstPurchase.size} holdings...`);
  let updated = 0;
  const entries = Array.from(firstPurchase.entries());
  for (const [key, date] of entries) {
    const [investorId, fundId] = key.split("|");
    const r = await prisma.fundHolding.updateMany({
      where: { investorId, fundId },
      data: { firstPurchaseDate: date },
    });
    updated += r.count;
  }
  logProgress(`  Updated ${updated} fund holdings with firstPurchaseDate`);

  logProgress("=== Transaction import done ===");
}
