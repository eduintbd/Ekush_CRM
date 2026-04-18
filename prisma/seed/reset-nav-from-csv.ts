/**
 * Full-reset NAV importer.
 *
 *   1. Deletes every NavRecord row.
 *   2. Inserts the rows from public/nav_sheet_with_investor_returns_covid_adjusted.csv
 *      exactly as-is: nav, investorReturn, buyUnit, sellUnit, dsex, ds30.
 *      No computation — empty IR stays null.
 *
 * The CSV is the authoritative source of truth, so any prior Prisma
 * rows (PDF / xlsx / daily backfill) are wiped before this runs.
 *
 * Usage:  npx tsx prisma/seed/reset-nav-from-csv.ts
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Row {
  fundCode: string;
  date: Date;
  nav: number;
  investorReturn: number | null;
  buyUnit: number | null;
  sellUnit: number | null;
  dsex: number | null;
  ds30: number | null;
}

function parseUsDate(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
}

function parseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

function parseCsv(filePath: string): Row[] {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out: Row[] = [];
  // header is line 0 — skip
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(",");
    if (fields.length < 9) continue;
    const fundCode = fields[1].trim();
    const date = parseUsDate(fields[2]);
    const nav = parseNum(fields[3]);
    if (!fundCode || !date || nav == null) continue;
    out.push({
      fundCode,
      date,
      nav,
      investorReturn: parseNum(fields[4]),
      buyUnit: parseNum(fields[5]),
      sellUnit: parseNum(fields[6]),
      dsex: parseNum(fields[7]),
      ds30: parseNum(fields[8]),
    });
  }
  return out;
}

async function main() {
  const csvPath = path.join(
    process.cwd(),
    "public",
    "nav_sheet_with_investor_returns_covid_adjusted.csv",
  );
  const rows = parseCsv(csvPath);
  console.log(`Parsed ${rows.length} CSV rows`);

  const funds = await prisma.fund.findMany({ select: { id: true, code: true } });
  const fundByCode = new Map(funds.map((f) => [f.code, f.id]));

  // Drop every NavRecord — CSV is the sole source of truth.
  const deleted = await prisma.navRecord.deleteMany({});
  console.log(`Deleted ${deleted.count} existing NavRecord rows`);

  // Deduplicate on (fundId, date) — keep the LAST occurrence, so a row
  // later in the CSV with more data wins over earlier duplicates.
  const byKey = new Map<string, Row & { fundId: string }>();
  let skippedUnknownFund = 0;
  for (const r of rows) {
    const fundId = fundByCode.get(r.fundCode);
    if (!fundId) { skippedUnknownFund++; continue; }
    byKey.set(`${fundId}::${r.date.getTime()}`, { ...r, fundId });
  }
  if (skippedUnknownFund > 0) {
    console.warn(`Skipped ${skippedUnknownFund} rows with unknown fund codes`);
  }

  // createMany is much faster than per-row inserts.
  const toCreate = [...byKey.values()].map((r) => ({
    fundId: r.fundId,
    date: r.date,
    nav: r.nav,
    investorReturn: r.investorReturn ?? undefined,
    buyUnit: r.buyUnit ?? undefined,
    sellUnit: r.sellUnit ?? undefined,
    dsex: r.dsex ?? undefined,
    ds30: r.ds30 ?? undefined,
  }));

  const result = await prisma.navRecord.createMany({
    data: toCreate,
    skipDuplicates: true,
  });
  console.log(`Inserted ${result.count} new NavRecord rows`);

  const total = await prisma.navRecord.count();
  const withIR = await prisma.navRecord.count({ where: { investorReturn: { not: null } } });
  const withDsex = await prisma.navRecord.count({ where: { dsex: { not: null } } });
  console.log(`\n--- Final DB state ---`);
  console.log(`  total NavRecord rows: ${total}`);
  console.log(`  rows with IR populated:   ${withIR}`);
  console.log(`  rows with DSEX populated: ${withDsex}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
