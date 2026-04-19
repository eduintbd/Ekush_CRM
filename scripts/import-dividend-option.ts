// One-shot pass to bring investor.dividendOption in line with Excel col 36
// (CIP/CASH). Excel is source of truth.
//
//   npx ts-node --compiler-options '{"module":"CommonJS","types":["node"]}' scripts/import-dividend-option.ts --apply

import ExcelJS from "exceljs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const COL = { INVESTOR_CODE: 2, DIVIDEND: 36 } as const;

function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v).trim();
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.text === "string") return (o.text as string).trim();
    if ("result" in o) return cellText(o.result);
    if (Array.isArray(o.richText)) return (o.richText as Array<{ text?: string }>).map((p) => p.text ?? "").join("").trim();
  }
  return String(v).trim();
}

async function main() {
  const apply = process.argv.includes("--apply");

  const file = path.join(process.cwd(), "public", "Investors Database.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet("INVESTORS Main List");
  if (!ws) throw new Error("Sheet not found");

  const investors = await prisma.investor.findMany({ select: { id: true, investorCode: true, dividendOption: true } });
  const byCode = new Map(investors.map((i) => [i.investorCode.toUpperCase(), i]));

  let changes = 0;
  const plans: Array<{ code: string; from: string; to: string }> = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const code = cellText(row.getCell(COL.INVESTOR_CODE).value).toUpperCase();
    if (!code) continue;
    const inv = byCode.get(code);
    if (!inv) continue;
    const xl = cellText(row.getCell(COL.DIVIDEND).value).toUpperCase();
    const next = xl === "CIP" ? "CIP" : xl === "CASH" ? "CASH" : null;
    if (!next) continue;
    if (inv.dividendOption === next) continue;
    plans.push({ code, from: inv.dividendOption, to: next });
    changes++;
  }

  console.log(`Plans: ${changes}`);
  for (const p of plans.slice(0, 10)) console.log(`  ${p.code}: ${p.from} → ${p.to}`);

  if (!apply) { console.log("Dry run. Re-run with --apply."); return; }

  let written = 0;
  for (const p of plans) {
    const inv = byCode.get(p.code);
    if (!inv) continue;
    await prisma.investor.update({ where: { id: inv.id }, data: { dividendOption: p.to } });
    written++;
  }
  console.log(`Applied ${written}.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
