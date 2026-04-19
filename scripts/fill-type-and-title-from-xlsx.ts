// Overrides investor.investorType and investor.title from
// "Investors Database.xlsx" — col D ("TYPE OF INVESTOR") and col E ("Ms/Mr").
// Excel is treated as the source of truth: when a row has a non-empty value
// it overwrites the DB. Empty Excel cells are left alone.
//
// Usage (from repo root):
//   npx ts-node --compiler-options '{"module":"CommonJS","types":["node"]}' scripts/fill-type-and-title-from-xlsx.ts          # dry run
//   npx ts-node --compiler-options '{"module":"CommonJS","types":["node"]}' scripts/fill-type-and-title-from-xlsx.ts --apply  # apply

import ExcelJS from "exceljs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COL = {
  INVESTOR_CODE: 2,
  TYPE_OF_INVESTOR: 4,
  MS_MR: 5,
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
    // A formula object with no `result` key means Excel never cached a value
    // (e.g. workbook never recalculated). Treat as empty rather than
    // stringifying the object literal.
    if ("formula" in o || "sharedFormula" in o) return "";
    if (Array.isArray(o.richText)) {
      return (o.richText as Array<{ text?: string }>)
        .map((p) => p.text ?? "")
        .join("")
        .trim();
    }
  }
  return String(v).trim();
}

// Map the human-readable label in column D to the enum value persisted in
// Investor.investorType (see src/lib/constants.ts).
function normalizeInvestorType(raw: string): string | null {
  const t = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (!t) return null;
  if (t === "individual") return "INDIVIDUAL";
  if (t === "company/organization" || t === "companyorganization" || t === "company" || t === "organization")
    return "COMPANY_ORGANIZATION";
  if (t === "mutualfund") return "MUTUAL_FUND";
  // "Providend Fund" is a known typo present in the source workbook.
  if (t === "providentfund" || t === "providendfund") return "PROVIDENT_FUND";
  if (t === "gratuityfund") return "GRATUITY_FUND";
  return null;
}

// Column E formula in the workbook does MID(C, 6, 3) which yields "Mr.",
// "Ms.", "Mrs" (no period because only 3 chars are taken). Normalise to a
// canonical honorific with a trailing period.
function normalizeTitle(raw: string): string | null {
  const t = raw.trim().replace(/\.+$/, "");
  if (!t) return null;
  const low = t.toLowerCase();
  if (low === "mr") return "Mr.";
  if (low === "mrs") return "Mrs.";
  if (low === "ms") return "Ms.";
  if (low === "dr") return "Dr.";
  if (low === "prof") return "Prof.";
  return `${t}.`;
}

type Plan = {
  code: string;
  investorId: string;
  name: string;
  currentType: string;
  currentTitle: string | null;
  newType: string | null;
  newTitle: string | null;
};

async function main() {
  const apply = process.argv.includes("--apply");

  const file = path.join(process.cwd(), "public", "Investors Database.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet("INVESTORS Main List");
  if (!ws) throw new Error("Sheet 'INVESTORS Main List' not found");

  const investors = await prisma.investor.findMany({
    select: { id: true, investorCode: true, name: true, investorType: true, title: true },
  });
  const byCode = new Map<string, (typeof investors)[number]>();
  for (const inv of investors) byCode.set(inv.investorCode.trim().toUpperCase(), inv);

  const plans: Plan[] = [];
  const unknownTypes = new Map<string, string[]>(); // raw label -> codes
  let rowsScanned = 0;
  let rowsMatched = 0;
  let rowsUnmatched = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const code = cellText(row.getCell(COL.INVESTOR_CODE).value).toUpperCase();
    if (!code) continue;
    rowsScanned++;

    const inv = byCode.get(code);
    if (!inv) {
      rowsUnmatched++;
      continue;
    }
    rowsMatched++;

    const rawType = cellText(row.getCell(COL.TYPE_OF_INVESTOR).value);
    const rawTitle = cellText(row.getCell(COL.MS_MR).value);

    const newType = normalizeInvestorType(rawType);
    if (rawType && !newType) {
      const arr = unknownTypes.get(rawType) ?? [];
      arr.push(code);
      unknownTypes.set(rawType, arr);
    }

    const newTitle = normalizeTitle(rawTitle);

    const typeChanged = newType && newType !== inv.investorType;
    const titleChanged = newTitle && newTitle !== inv.title;

    if (!typeChanged && !titleChanged) continue;

    plans.push({
      code,
      investorId: inv.id,
      name: inv.name,
      currentType: inv.investorType,
      currentTitle: inv.title,
      newType: typeChanged ? newType : null,
      newTitle: titleChanged ? newTitle : null,
    });
  }

  console.log(`\n=== Dry-run summary ===`);
  console.log(`Rows scanned:    ${rowsScanned}`);
  console.log(`Matched DB:      ${rowsMatched}`);
  console.log(`Unmatched:       ${rowsUnmatched}`);
  console.log(`Investors with at least one field to change: ${plans.length}`);
  console.log(`  investorType changes: ${plans.filter((p) => p.newType).length}`);
  console.log(`  title changes:        ${plans.filter((p) => p.newTitle).length}`);

  if (unknownTypes.size) {
    console.log(`\nUnrecognised TYPE OF INVESTOR labels (will be skipped):`);
    unknownTypes.forEach((codes, label) => {
      console.log(`  "${label}" — ${codes.length} row(s); first: ${codes.slice(0, 3).join(", ")}`);
    });
  }

  console.log(`\nSample (first 10):`);
  for (const p of plans.slice(0, 10)) {
    const parts: string[] = [];
    if (p.newType) parts.push(`type: ${p.currentType} → ${p.newType}`);
    if (p.newTitle) parts.push(`title: ${p.currentTitle ?? "∅"} → ${p.newTitle}`);
    console.log(`  ${p.code} ${p.name}: ${parts.join(" | ")}`);
  }

  if (!apply) {
    console.log(`\nDry run only. Re-run with --apply to write these changes.`);
    return;
  }

  console.log(`\nApplying ${plans.length} updates…`);
  let written = 0;
  for (const p of plans) {
    const data: Record<string, string> = {};
    if (p.newType) data.investorType = p.newType;
    if (p.newTitle) data.title = p.newTitle;
    await prisma.investor.update({ where: { id: p.investorId }, data });
    written++;
    if (written % 50 === 0) console.log(`  …${written}/${plans.length}`);
  }
  console.log(`\nDone. Updated ${written} investors.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
