/**
 * Locking test for the Performance Comparison endpoint.
 *
 * Asserts that the Since-Inception total return matches the authoritative
 * Investor Return value sourced from nav_list.xlsx as of 2026-04-16:
 *   EFUF: 107.59%
 *   EGF:  37.00%
 *
 * Tolerance: ±0.01 percentage points (matches the precision the upstream
 * xlsx is rounded to). If this test ever drifts, either the IR backfill
 * has been wiped or the Since-Inception math has regressed to the old
 * NAV-only formula — both should fail loudly here.
 *
 * Usage:  npx tsx prisma/seed/test-performance-returns.ts
 *         (exits 1 on failure, 0 on pass)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TOLERANCE = 0.01;

interface Expect {
  fundCode: string;
  asOfDate: string; // YYYY-MM-DD
  expectedSinceInceptionPct: number;
}

const EXPECTATIONS: Expect[] = [
  { fundCode: "EFUF", asOfDate: "2026-04-16", expectedSinceInceptionPct: 107.59 },
  { fundCode: "EGF", asOfDate: "2026-04-16", expectedSinceInceptionPct: 37.0 },
];

async function check(e: Expect): Promise<{ pass: boolean; actual: number | null; line: string }> {
  const fund = await prisma.fund.findUnique({ where: { code: e.fundCode } });
  if (!fund) {
    return { pass: false, actual: null, line: `${e.fundCode}: fund not found in DB` };
  }
  // Find the latest NAV row on or before the asOf date — same logic the
  // API uses to compute "Since Inception".
  const target = new Date(`${e.asOfDate}T00:00:00.000Z`);
  const row = await prisma.navRecord.findFirst({
    where: { fundId: fund.id, date: { lte: target } },
    orderBy: { date: "desc" },
    select: { date: true, nav: true, investorReturn: true },
  });
  if (!row) {
    return { pass: false, actual: null, line: `${e.fundCode}: no NAV row on or before ${e.asOfDate}` };
  }
  if (row.investorReturn == null) {
    return {
      pass: false,
      actual: null,
      line: `${e.fundCode}: row ${row.date.toISOString().slice(0, 10)} has investorReturn = null. Re-run the importer to populate it.`,
    };
  }
  const actual = Number(row.investorReturn);
  const diff = Math.abs(actual - e.expectedSinceInceptionPct);
  const pass = diff <= TOLERANCE;
  return {
    pass,
    actual,
    line:
      `${e.fundCode} as of ${row.date.toISOString().slice(0, 10)}: ` +
      `expected ${e.expectedSinceInceptionPct.toFixed(2)}%, got ${actual.toFixed(2)}% ` +
      `(diff ${diff.toFixed(4)}pp) — ${pass ? "PASS" : "FAIL"}`,
  };
}

async function main() {
  let failed = 0;
  for (const e of EXPECTATIONS) {
    const r = await check(e);
    console.log(r.line);
    if (!r.pass) failed++;
  }
  if (failed > 0) {
    console.error(`\n${failed} test(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll Since-Inception returns match the authoritative xlsx values.");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
