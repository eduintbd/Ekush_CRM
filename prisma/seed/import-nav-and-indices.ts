/**
 * One-off importer:
 *
 *   1. Reads public/nav_list.xlsx and upserts NavRecord rows
 *      (fundId + date as the composite key).
 *   2. Reads public/DSEX.csv and public/DS30.csv (US date format
 *      MM/DD/YYYY), and updates the `dsex` / `ds30` columns on every
 *      NavRecord whose date matches a CSV date — leaves unmatched
 *      NavRecords untouched.
 *
 *   Usage:  npx tsx prisma/seed/import-nav-and-indices.ts
 *
 *   Idempotent: safe to run repeatedly. Upserts, not inserts.
 */

import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FUND_NAME_TO_CODE: Record<string, string> = {
  "ekush first unit fund": "EFUF",
  "ekush growth fund": "EGF",
  "ekush stable return fund": "ESRF",
};

function normKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseExcelDate(raw: unknown): Date | null {
  if (raw instanceof Date) {
    const d = new Date(raw);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (typeof raw === "number") {
    // Excel serial date (days since 1899-12-30)
    const ms = Math.round((raw - 25569) * 86400 * 1000);
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    // ISO yyyy-mm-dd preferred
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (iso) {
      return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
  return null;
}

function parseNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).replace(/,/g, "").trim();
  if (!s) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseUsDate(s: string): Date | null {
  // "01/15/2026" → Date at 00:00 UTC
  const m = /^"?(\d{1,2})\/(\d{1,2})\/(\d{4})"?$/.exec(s.trim());
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
}

async function importNavXlsx() {
  const filePath = path.join(process.cwd(), "public", "nav_list.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheet = wb.worksheets[0];

  const funds = await prisma.fund.findMany({ select: { id: true, code: true } });
  const fundByCode = new Map(funds.map((f) => [f.code, f.id]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i).values as any[];
    const fundName = String(row[1] ?? "").trim();
    const date = parseExcelDate(row[2]);
    const nav = parseNumber(row[3]);
    const buy = parseNumber(row[5]);
    const sell = parseNumber(row[6]);

    if (!fundName || !date || nav == null) { skipped++; continue; }

    const code = FUND_NAME_TO_CODE[normKey(fundName)];
    if (!code) {
      console.warn(`Row ${i}: unknown fund name "${fundName}" — skipping`);
      skipped++;
      continue;
    }
    const fundId = fundByCode.get(code);
    if (!fundId) {
      console.warn(`Row ${i}: fund code ${code} not in DB — skipping`);
      skipped++;
      continue;
    }

    const existing = await prisma.navRecord.findUnique({
      where: { fundId_date: { fundId, date } },
    });

    await prisma.navRecord.upsert({
      where: { fundId_date: { fundId, date } },
      update: { nav, buyUnit: buy, sellUnit: sell },
      create: { fundId, date, nav, buyUnit: buy, sellUnit: sell },
    });

    if (existing) updated++;
    else inserted++;
  }

  console.log(`nav_list.xlsx → inserted ${inserted}, updated ${updated}, skipped ${skipped}`);
}

function parseCsvPrices(absPath: string): Map<number, number> {
  // Returns a map keyed by UTC-ms-at-midnight → price.
  const raw = fs.readFileSync(absPath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out = new Map<number, number>();
  // Skip the header row
  for (let i = 1; i < lines.length; i++) {
    // Split on quote-aware commas — CSVs are simple here: each field is quoted
    const fields = [...lines[i].matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    if (fields.length < 2) continue;
    const date = parseUsDate(fields[0]);
    const price = parseNumber(fields[1]);
    if (!date || price == null) continue;
    out.set(date.getTime(), price);
  }
  return out;
}

async function importIndicesCsv() {
  const dsex = parseCsvPrices(path.join(process.cwd(), "public", "DSEX.csv"));
  const ds30 = parseCsvPrices(path.join(process.cwd(), "public", "DS30.csv"));
  console.log(`DSEX.csv → ${dsex.size} daily prices`);
  console.log(`DS30.csv → ${ds30.size} daily prices`);

  const records = await prisma.navRecord.findMany({ select: { id: true, date: true } });
  console.log(`NavRecord rows in DB: ${records.length}`);

  let matched = 0;
  for (const r of records) {
    const key = new Date(
      Date.UTC(r.date.getUTCFullYear(), r.date.getUTCMonth(), r.date.getUTCDate()),
    ).getTime();
    const d = dsex.get(key) ?? null;
    const d30 = ds30.get(key) ?? null;
    if (d == null && d30 == null) continue;
    await prisma.navRecord.update({
      where: { id: r.id },
      data: { dsex: d ?? undefined, ds30: d30 ?? undefined },
    });
    matched++;
  }
  console.log(`NavRecords updated with index prices: ${matched}`);
}

async function main() {
  console.log("→ Importing nav_list.xlsx");
  await importNavXlsx();
  console.log("→ Backfilling DSEX / DS30 from CSVs");
  await importIndicesCsv();
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
