/**
 * Spot-check that PDF-sourced rows are persisted correctly in NavRecord.
 * Samples a handful of fund/date combos from across the PDF's date range
 * and compares the stored values against known PDF values.
 *
 *   Usage: npx tsx prisma/seed/verify-pdf-import.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Hand-picked from the PDF — covers boundaries, fund launches, and
// random mid-history points.
const CHECKS: Array<{ code: string; date: string; nav: number; ir: number }> = [
  { code: "EFUF", date: "2020-06-04", nav: 10.02, ir: 0.2 },   // EFUF inception
  { code: "EFUF", date: "2020-06-18", nav: 10.07, ir: 0.7 },
  { code: "EFUF", date: "2021-01-14", nav: 13.0, ir: 38.0 },
  { code: "EFUF", date: "2026-04-16", nav: 14.583, ir: 107.59 },
  { code: "EGF",  date: "2022-02-13", nav: 10.0, ir: 0.0 },    // EGF inception
  { code: "EGF",  date: "2022-02-17", nav: 9.99, ir: -0.1 },
  { code: "EGF",  date: "2026-04-16", nav: 12.422, ir: 37.0 },
  { code: "ESRF", date: "2023-03-05", nav: 10.03, ir: 0.3 },
  { code: "ESRF", date: "2026-04-16", nav: 14.239, ir: 42.39 },
];

async function main() {
  const funds = await prisma.fund.findMany({ select: { id: true, code: true } });
  const fundByCode = new Map(funds.map((f) => [f.code, f.id]));

  let pass = 0;
  let fail = 0;
  for (const c of CHECKS) {
    const fundId = fundByCode.get(c.code);
    if (!fundId) { console.log(`${c.code}: fund missing — FAIL`); fail++; continue; }
    const row = await prisma.navRecord.findUnique({
      where: {
        fundId_date: {
          fundId,
          date: new Date(`${c.date}T00:00:00.000Z`),
        },
      },
      select: { nav: true, investorReturn: true },
    });
    if (!row) { console.log(`${c.code} ${c.date}: NOT FOUND — FAIL`); fail++; continue; }
    const nav = Number(row.nav);
    const ir = row.investorReturn == null ? null : Number(row.investorReturn);
    const navOk = Math.abs(nav - c.nav) < 0.005;
    const irOk  = ir != null && Math.abs(ir - c.ir) < 0.005;
    const ok = navOk && irOk;
    console.log(
      `${c.code} ${c.date}: nav=${nav} (expected ${c.nav}${navOk ? "✓" : "✗"}), ` +
      `ir=${ir} (expected ${c.ir}${irOk ? "✓" : "✗"}) — ${ok ? "PASS" : "FAIL"}`,
    );
    ok ? pass++ : fail++;
  }

  // Summary counts
  const total = await prisma.navRecord.count();
  const withIR = await prisma.navRecord.count({ where: { investorReturn: { not: null } } });
  console.log(`\n${pass} pass, ${fail} fail`);
  console.log(`DB: ${total} NavRecord rows, ${withIR} with investorReturn populated`);
  if (fail > 0) process.exit(1);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
