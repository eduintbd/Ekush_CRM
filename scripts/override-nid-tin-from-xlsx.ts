// Override pass for NID and TIN. Excel is the source of truth — if Excel
// has a non-empty real value, force-write it to the investor. No uniqueness
// constraints on these columns so this is just straight writes.
//
// Also prints the list of recent email overrides (investors whose user row
// was updated in the last 2 hours) for audit purposes.
//
// Usage (from repo root):
//   npx ts-node --compiler-options '{"module":"CommonJS","types":["node"]}' scripts/override-nid-tin-from-xlsx.ts          # dry run
//   npx ts-node --compiler-options '{"module":"CommonJS","types":["node"]}' scripts/override-nid-tin-from-xlsx.ts --apply  # apply

import ExcelJS from "exceljs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COL = {
  INVESTOR_CODE: 2,
  TIN: 19,
  NID: 20,
} as const;

function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v).trim();
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.text === "string") return (o.text as string).trim();
    if ("result" in o) return cellText(o.result);
    if (Array.isArray(o.richText)) {
      return (o.richText as Array<{ text?: string }>)
        .map((p) => p.text ?? "")
        .join("")
        .trim();
    }
    if (typeof o.hyperlink === "string") return (o.hyperlink as string).trim();
  }
  return String(v).trim();
}

function cleanText(s: string): string {
  const t = s.trim();
  if (!t) return "";
  const low = t.toLowerCase();
  if (low === "n/a" || low === "na" || low === "-" || low === "—" || low === "0") return "";
  return t;
}

async function main() {
  const apply = process.argv.includes("--apply");

  // ───── Part 1: list of recent email overrides for audit ─────
  const minutes = Number(
    process.argv.find((a) => a.startsWith("--recent-minutes="))?.split("=")[1] ?? "15",
  );
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  const recent = await prisma.investor.findMany({
    where: {
      user: {
        updatedAt: { gte: cutoff },
        email: { not: null },
      },
    },
    select: {
      investorCode: true,
      name: true,
      user: { select: { email: true, updatedAt: true } },
    },
    orderBy: { investorCode: "asc" },
  });

  console.log(`\n=== Investors whose email was updated in the last ${minutes} min (${recent.length}) ===`);
  for (const r of recent) {
    const when = r.user.updatedAt.toISOString().slice(11, 19);
    console.log(`  ${r.investorCode}  ${r.name.padEnd(35).slice(0, 35)}  ${r.user.email}  (${when}Z)`);
  }

  // ───── Part 2: NID / TIN override plan ─────
  const file = path.join(process.cwd(), "public", "Investors Database.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet("INVESTORS Main List");
  if (!ws) throw new Error("Sheet 'INVESTORS Main List' not found");

  const investors = await prisma.investor.findMany();
  const byCode = new Map<string, (typeof investors)[number]>();
  for (const inv of investors) byCode.set(inv.investorCode.trim().toUpperCase(), inv);

  type Plan = {
    code: string;
    investorId: string;
    name: string;
    nid: { current: string | null; next: string } | null;
    tin: { current: string | null; next: string } | null;
  };
  const plans: Plan[] = [];
  let rowsScanned = 0;
  let rowsMatched = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const code = cellText(row.getCell(COL.INVESTOR_CODE).value).toUpperCase();
    if (!code) continue;
    rowsScanned++;
    const inv = byCode.get(code);
    if (!inv) continue;
    rowsMatched++;

    const xlNid = cleanText(cellText(row.getCell(COL.NID).value));
    const xlTin = cleanText(cellText(row.getCell(COL.TIN).value));

    const nidChange = xlNid && xlNid !== (inv.nidNumber ?? "")
      ? { current: inv.nidNumber, next: xlNid }
      : null;
    const tinChange = xlTin && xlTin !== (inv.tinNumber ?? "")
      ? { current: inv.tinNumber, next: xlTin }
      : null;

    if (!nidChange && !tinChange) continue;
    plans.push({
      code,
      investorId: inv.id,
      name: inv.name,
      nid: nidChange,
      tin: tinChange,
    });
  }

  const nidWrites = plans.filter((p) => p.nid).length;
  const tinWrites = plans.filter((p) => p.tin).length;

  console.log(`\n=== NID / TIN override plan ===`);
  console.log(`Rows scanned:               ${rowsScanned}`);
  console.log(`Matched in DB:              ${rowsMatched}`);
  console.log(`Investors with a change:    ${plans.length}`);
  console.log(`  NID writes:               ${nidWrites}`);
  console.log(`  TIN writes:               ${tinWrites}`);

  console.log(`\nSample (first 10):`);
  for (const p of plans.slice(0, 10)) {
    const parts: string[] = [];
    if (p.nid) parts.push(`nid: "${p.nid.current ?? ""}" → "${p.nid.next}"`);
    if (p.tin) parts.push(`tin: "${p.tin.current ?? ""}" → "${p.tin.next}"`);
    console.log(`  ${p.code} ${p.name}: ${parts.join(" | ")}`);
  }

  if (!apply) {
    console.log(`\nDry run only. Re-run with --apply to execute.`);
    return;
  }

  console.log(`\nApplying NID / TIN overrides…`);
  let written = 0;
  const errors: Array<{ code: string; error: string }> = [];
  for (const p of plans) {
    const data: Record<string, string> = {};
    if (p.nid) data.nidNumber = p.nid.next;
    if (p.tin) data.tinNumber = p.tin.next;
    try {
      await prisma.investor.update({ where: { id: p.investorId }, data });
      written++;
      if (written % 50 === 0) console.log(`  …${written}/${plans.length}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ code: p.code, error: msg.split("\n")[0] });
    }
  }

  console.log(`\nDone. Applied ${written} investor updates, ${errors.length} errors.`);
  if (errors.length) {
    for (const e of errors.slice(0, 20)) console.log(`  ${e.code}: ${e.error}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
