import ExcelJS from "exceljs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const COL = { INVESTOR_CODE: 2, TIN: 19, NID: 20, ADDRESS_1: 21, ADDRESS_2: 22, ADDRESS_3: 23 } as const;

function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v).trim();
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.text === "string") return (o.text as string).trim();
    if ("result" in o) return cellText(o.result);
    if (Array.isArray(o.richText)) return (o.richText as Array<{ text?: string }>).map((p) => p.text ?? "").join("").trim();
    if (typeof o.hyperlink === "string") return (o.hyperlink as string).trim();
  }
  return String(v).trim();
}

async function main() {
  const code = (process.argv.find((a) => /^[A-Z][0-9]+$/.test(a)) ?? "A00002").toUpperCase();
  const file = path.join(process.cwd(), "public", "Investors Database.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet("INVESTORS Main List");
  if (!ws) throw new Error("Sheet not found");

  console.log(`\n=== Spot-check ${code} ===`);
  let found = false;
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rowCode = cellText(row.getCell(COL.INVESTOR_CODE).value).toUpperCase();
    if (rowCode !== code) continue;
    found = true;
    console.log(`Excel row ${r}:`);
    console.log(`  TIN         (col 19): "${cellText(row.getCell(COL.TIN).value)}"`);
    console.log(`  NID         (col 20): "${cellText(row.getCell(COL.NID).value)}"`);
    console.log(`  Address 1   (col 21): "${cellText(row.getCell(COL.ADDRESS_1).value)}"`);
    console.log(`  Address 2   (col 22): "${cellText(row.getCell(COL.ADDRESS_2).value)}"`);
    console.log(`  Address 3   (col 23): "${cellText(row.getCell(COL.ADDRESS_3).value)}"`);
    break;
  }
  if (!found) console.log(`Code ${code} not found in Excel.`);

  const inv = await prisma.investor.findUnique({
    where: { investorCode: code },
    select: { name: true, nidNumber: true, tinNumber: true, address: true },
  });
  console.log(`\nDB record for ${code}:`);
  if (!inv) { console.log(`  (not in DB)`); return; }
  console.log(`  name:      "${inv.name}"`);
  console.log(`  nidNumber: "${inv.nidNumber ?? ""}"`);
  console.log(`  tinNumber: "${inv.tinNumber ?? ""}"`);
  console.log(`  address:   "${inv.address ?? ""}"`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
