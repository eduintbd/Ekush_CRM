/**
 * One-off importer:
 *   Reads prisma/seed/nav-from-pdf.json (produced by parse-pdf.py from
 *   the authoritative nav_list.pdf) and upserts every (fundCode, date)
 *   row into NavRecord.
 *
 *   - For existing rows: update nav, investorReturn, and buyUnit.
 *   - For missing rows: insert them.
 *   - Never touches DB rows that aren't in the PDF (e.g. daily NAVs
 *     between weekly reporting dates).
 *
 *   Usage:
 *     python prisma/seed/parse-pdf.py          # regenerate the JSON
 *     npx tsx prisma/seed/import-nav-from-pdf.ts
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface PdfRow {
  page: number;
  fund_code: string;
  date: string; // YYYY-MM-DD
  nav: number | null;
  investor_return: number | null;
  buy_unit: number | null;
}

function parseIsoDate(s: string): Date {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (!m) throw new Error(`Bad date: ${s}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

async function main() {
  const jsonPath = path.join(process.cwd(), "prisma", "seed", "nav-from-pdf.json");
  const rows: PdfRow[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  console.log(`Loaded ${rows.length} rows from PDF JSON`);

  const funds = await prisma.fund.findMany({ select: { id: true, code: true } });
  const fundByCode = new Map(funds.map((f) => [f.code, f.id]));

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const r of rows) {
    const fundId = fundByCode.get(r.fund_code);
    if (!fundId) {
      console.warn(`Unknown fund code: ${r.fund_code}`);
      skipped++;
      continue;
    }
    if (r.nav == null) {
      skipped++;
      continue;
    }

    const date = parseIsoDate(r.date);
    const existing = await prisma.navRecord.findUnique({
      where: { fundId_date: { fundId, date } },
    });

    const data = {
      nav: r.nav,
      investorReturn: r.investor_return,
      buyUnit: r.buy_unit,
    };

    await prisma.navRecord.upsert({
      where: { fundId_date: { fundId, date } },
      update: data,
      create: { fundId, date, ...data },
    });

    if (!existing) {
      inserted++;
    } else if (
      Number(existing.nav) === data.nav &&
      existing.investorReturn === data.investorReturn &&
      existing.buyUnit === data.buyUnit
    ) {
      unchanged++;
    } else {
      updated++;
    }
  }

  const total = await prisma.navRecord.count();
  const withIR = await prisma.navRecord.count({ where: { investorReturn: { not: null } } });

  console.log(`\n--- Import complete ---`);
  console.log(`inserted:  ${inserted}`);
  console.log(`updated:   ${updated}`);
  console.log(`unchanged: ${unchanged}`);
  console.log(`skipped:   ${skipped}`);
  console.log(`\nDB state:`);
  console.log(`  total NavRecord rows: ${total}`);
  console.log(`  rows with IR populated: ${withIR}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
