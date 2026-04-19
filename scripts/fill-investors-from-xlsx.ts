// Fills investor.nidNumber, tinNumber, address + user.email, phone from the
// Investors Database.xlsx sheet. Safe-by-default: only writes a field if the
// corresponding DB value is null/empty — never overwrites existing data.
//
// Usage (from repo root):
//   npx ts-node --compiler-options '{"module":"CommonJS","types":["node"]}' scripts/fill-investors-from-xlsx.ts             # dry run
//   npx ts-node --compiler-options '{"module":"CommonJS","types":["node"]}' scripts/fill-investors-from-xlsx.ts --apply    # apply

import ExcelJS from "exceljs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Column positions in sheet "INVESTORS Main List" (1-indexed).
const COL = {
  INVESTOR_CODE: 2,
  MAIL: 8,
  PHONE: 10,
  TIN: 19,
  NID: 20,
  ADDRESS_1: 21,
  ADDRESS_2: 22,
  ADDRESS_3: 23,
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

// Treat sentinel strings as empty.
function cleanText(s: string): string {
  const t = s.trim();
  if (!t) return "";
  const low = t.toLowerCase();
  if (low === "n/a" || low === "na" || low === "-" || low === "—") return "";
  return t;
}

function composeAddress(a1: string, a2: string, a3: string): string {
  return [a1, a2, a3].map(cleanText).filter(Boolean).join(", ");
}

function normalizeEmail(s: string): string {
  // If the cell is a hyperlink-shaped object, ExcelJS may yield a mailto: prefix.
  const t = cleanText(s).replace(/^mailto:/i, "");
  return t;
}

function normalizePhone(s: string): string {
  // Keep digits and leading +; strip separators.
  const t = cleanText(s);
  if (!t) return "";
  return t.replace(/[\s\-()]/g, "");
}

type UpdatePlan = {
  code: string;
  investorId: string;
  userId: string;
  name: string;
  // For each field: newValue if we'd write, null if we'd skip.
  investor: {
    nidNumber: string | null;
    tinNumber: string | null;
    address: string | null;
  };
  user: {
    email: string | null;
    phone: string | null;
  };
};

async function main() {
  const apply = process.argv.includes("--apply");

  const file = path.join(process.cwd(), "public", "Investors Database.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet("INVESTORS Main List");
  if (!ws) throw new Error("Sheet 'INVESTORS Main List' not found");

  // Prefetch all investors keyed by code (uppercase).
  const investors = await prisma.investor.findMany({
    include: { user: { select: { id: true, email: true, phone: true } } },
  });
  const byCode = new Map<string, (typeof investors)[number]>();
  for (const inv of investors) byCode.set(inv.investorCode.trim().toUpperCase(), inv);

  let rowsScanned = 0;
  let rowsMatched = 0;
  let rowsUnmatched = 0;
  const plans: UpdatePlan[] = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const code = cleanText(cellText(row.getCell(COL.INVESTOR_CODE).value)).toUpperCase();
    if (!code) continue;
    rowsScanned++;

    const inv = byCode.get(code);
    if (!inv) {
      rowsUnmatched++;
      continue;
    }
    rowsMatched++;

    const xlEmail = normalizeEmail(cellText(row.getCell(COL.MAIL).value));
    const xlPhone = normalizePhone(cellText(row.getCell(COL.PHONE).value));
    const xlTin = cleanText(cellText(row.getCell(COL.TIN).value));
    const xlNid = cleanText(cellText(row.getCell(COL.NID).value));
    const xlAddress = composeAddress(
      cellText(row.getCell(COL.ADDRESS_1).value),
      cellText(row.getCell(COL.ADDRESS_2).value),
      cellText(row.getCell(COL.ADDRESS_3).value),
    );

    // Fill-empty-only: only write when DB is null/empty AND Excel has a value.
    const nidWrite = !inv.nidNumber && xlNid ? xlNid : null;
    const tinWrite = !inv.tinNumber && xlTin ? xlTin : null;
    const addrWrite = !inv.address && xlAddress ? xlAddress : null;
    const emailWrite = !inv.user.email && xlEmail ? xlEmail : null;
    const phoneWrite = !inv.user.phone && xlPhone ? xlPhone : null;

    if (!nidWrite && !tinWrite && !addrWrite && !emailWrite && !phoneWrite) continue;

    plans.push({
      code,
      investorId: inv.id,
      userId: inv.user.id,
      name: inv.name,
      investor: { nidNumber: nidWrite, tinNumber: tinWrite, address: addrWrite },
      user: { email: emailWrite, phone: phoneWrite },
    });
  }

  // Summary counts
  const fieldCounts = {
    nid: plans.filter((p) => p.investor.nidNumber).length,
    tin: plans.filter((p) => p.investor.tinNumber).length,
    address: plans.filter((p) => p.investor.address).length,
    email: plans.filter((p) => p.user.email).length,
    phone: plans.filter((p) => p.user.phone).length,
  };

  console.log(`\n=== Dry-run summary ===`);
  console.log(`Rows scanned:    ${rowsScanned}`);
  console.log(`Matched DB:      ${rowsMatched}`);
  console.log(`Unmatched:       ${rowsUnmatched}`);
  console.log(`Investors with at least one field to fill: ${plans.length}`);
  console.log(`  NID:     ${fieldCounts.nid}`);
  console.log(`  TIN:     ${fieldCounts.tin}`);
  console.log(`  Address: ${fieldCounts.address}`);
  console.log(`  Email:   ${fieldCounts.email}`);
  console.log(`  Phone:   ${fieldCounts.phone}`);

  // Show a sample of 5 plans
  console.log(`\nSample (first 5):`);
  for (const p of plans.slice(0, 5)) {
    const changes: string[] = [];
    if (p.investor.nidNumber) changes.push(`nid="${p.investor.nidNumber}"`);
    if (p.investor.tinNumber) changes.push(`tin="${p.investor.tinNumber}"`);
    if (p.investor.address) changes.push(`address="${p.investor.address}"`);
    if (p.user.email) changes.push(`email="${p.user.email}"`);
    if (p.user.phone) changes.push(`phone="${p.user.phone}"`);
    console.log(`  ${p.code} ${p.name}: ${changes.join(" | ")}`);
  }

  if (!apply) {
    console.log(`\nDry run only. Re-run with --apply to write these changes.`);
    return;
  }

  console.log(`\nApplying ${plans.length} updates…`);
  let written = 0;
  const errors: Array<{ code: string; field: string; error: string }> = [];

  for (const p of plans) {
    // Investor table fields — nid, tin, address — no unique constraints.
    const invData: Record<string, string> = {};
    if (p.investor.nidNumber) invData.nidNumber = p.investor.nidNumber;
    if (p.investor.tinNumber) invData.tinNumber = p.investor.tinNumber;
    if (p.investor.address) invData.address = p.investor.address;
    if (Object.keys(invData).length) {
      try {
        await prisma.investor.update({ where: { id: p.investorId }, data: invData });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ code: p.code, field: "investor", error: msg.split("\n")[0] });
      }
    }

    // User fields — email and phone are both unique-constrained in Prisma.
    // Write each independently so one collision doesn't skip the other.
    if (p.user.email) {
      try {
        await prisma.user.update({
          where: { id: p.userId },
          data: { email: p.user.email },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const short = msg.includes("Unique constraint")
          ? `email "${p.user.email}" already in use`
          : msg.split("\n")[0];
        errors.push({ code: p.code, field: "email", error: short });
      }
    }
    if (p.user.phone) {
      try {
        await prisma.user.update({
          where: { id: p.userId },
          data: { phone: p.user.phone },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const short = msg.includes("Unique constraint")
          ? `phone "${p.user.phone}" already in use`
          : msg.split("\n")[0];
        errors.push({ code: p.code, field: "phone", error: short });
      }
    }

    written++;
    if (written % 50 === 0) console.log(`  …${written}/${plans.length}`);
  }
  console.log(`\nDone. Processed ${written} investors, ${errors.length} field-level errors.`);
  if (errors.length > 0) {
    console.log(`\nErrors (first 20):`);
    for (const e of errors.slice(0, 20)) {
      console.log(`  ${e.code} [${e.field}]: ${e.error}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
