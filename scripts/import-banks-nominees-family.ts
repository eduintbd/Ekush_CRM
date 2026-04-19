// Pulls bank accounts, nominees, family names and BO/DP/brokerage from the
// Investors Database.xlsx and writes them to the DB. Excel is source of truth.
//
// Strategy per matched investor:
//   * Investor fields (fatherName/motherName/spouseName/boId/dpId/brokerageHouse)
//     — straight overwrite from Excel (whatever Excel says wins).
//   * BankAccount — upsert by slot (primary / secondary). Existing rows are
//     UPDATED in place so any SipPlan pointing at them stays valid. If Excel
//     has a Bank 2 and DB only has 1 row, a new secondary is created.
//   * Nominee — wiped and re-created from Excel (no foreign-key deps).
//
// Usage (from repo root):
//   npx ts-node --compiler-options '{"module":"CommonJS","types":["node"]}' scripts/import-banks-nominees-family.ts          # dry run
//   npx ts-node --compiler-options '{"module":"CommonJS","types":["node"]}' scripts/import-banks-nominees-family.ts --apply  # apply

import ExcelJS from "exceljs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COL = {
  INVESTOR_CODE: 2,
  // Demat / BO account (New set)
  BO_ID_NEW: 13,
  DP_ID_NEW: 14,
  BROKERAGE_NEW: 15,
  // Family
  FATHER: 24,
  SPOUSE: 25,
  MOTHER: 26,
  // Bank 1
  BANK1_NAME: 27,
  BANK1_AC_NAME: 28,
  BANK1_AC_NO: 29,
  BANK1_ROUTING: 30,
  BANK1_BRANCH: 31,
  // Bank 2
  BANK2_NAME: 32,
  BANK2_AC_NO: 33,
  BANK2_ROUTING: 34,
  BANK2_BRANCH: 35,
  // Nominee
  NOMINEE_NAME: 37,
  NOMINEE_DOB: 38,
  NOMINEE_FATHER: 39,
  NOMINEE_MOTHER: 40,
  NOMINEE_NID: 41,
  NOMINEE_RELATION: 42,
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

function clean(s: string): string {
  const t = s.trim();
  if (!t) return "";
  const low = t.toLowerCase();
  if (low === "n/a" || low === "na" || low === "-" || low === "—" || low === "0") return "";
  return t;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const file = path.join(process.cwd(), "public", "Investors Database.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet("INVESTORS Main List");
  if (!ws) throw new Error("Sheet not found");

  const investors = await prisma.investor.findMany({
    include: {
      bankAccounts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
    },
  });
  const byCode = new Map<string, (typeof investors)[number]>();
  for (const inv of investors) byCode.set(inv.investorCode.trim().toUpperCase(), inv);

  // Stats
  let rowsScanned = 0;
  let rowsMatched = 0;
  let investorUpdates = 0;
  let primaryBankUpserts = 0;
  let secondaryBankUpserts = 0;
  let nomineeCreates = 0;
  let nomineeWipes = 0;
  const errors: Array<{ code: string; error: string }> = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const code = clean(cellText(row.getCell(COL.INVESTOR_CODE).value)).toUpperCase();
    if (!code) continue;
    rowsScanned++;
    const inv = byCode.get(code);
    if (!inv) continue;
    rowsMatched++;

    // Family + BO/DP/brokerage on Investor
    const fatherName = clean(cellText(row.getCell(COL.FATHER).value));
    const motherName = clean(cellText(row.getCell(COL.MOTHER).value));
    const spouseName = clean(cellText(row.getCell(COL.SPOUSE).value));
    const boId = clean(cellText(row.getCell(COL.BO_ID_NEW).value));
    const dpId = clean(cellText(row.getCell(COL.DP_ID_NEW).value));
    const brokerageHouse = clean(cellText(row.getCell(COL.BROKERAGE_NEW).value));

    const invData: Record<string, string | null> = {
      fatherName: fatherName || null,
      motherName: motherName || null,
      spouseName: spouseName || null,
      boId: boId || null,
      dpId: dpId || null,
      brokerageHouse: brokerageHouse || null,
    };

    // Bank 1
    const bank1 = {
      bankName: clean(cellText(row.getCell(COL.BANK1_NAME).value)),
      accountNumber: clean(cellText(row.getCell(COL.BANK1_AC_NO).value)),
      branchName: clean(cellText(row.getCell(COL.BANK1_BRANCH).value)) || null,
      routingNumber: clean(cellText(row.getCell(COL.BANK1_ROUTING).value)) || null,
    };
    const bank1HasData = Boolean(bank1.bankName && bank1.accountNumber);

    // Bank 2
    const bank2 = {
      bankName: clean(cellText(row.getCell(COL.BANK2_NAME).value)),
      accountNumber: clean(cellText(row.getCell(COL.BANK2_AC_NO).value)),
      branchName: clean(cellText(row.getCell(COL.BANK2_BRANCH).value)) || null,
      routingNumber: clean(cellText(row.getCell(COL.BANK2_ROUTING).value)) || null,
    };
    const bank2HasData = Boolean(bank2.bankName && bank2.accountNumber);

    // Nominee
    const nomineeName = clean(cellText(row.getCell(COL.NOMINEE_NAME).value));
    const nomineeRel = clean(cellText(row.getCell(COL.NOMINEE_RELATION).value));
    const nomineeNid = clean(cellText(row.getCell(COL.NOMINEE_NID).value));
    const nomineeHasData = Boolean(nomineeName);

    if (!apply) {
      // Just tally.
      if (Object.values(invData).some(Boolean)) investorUpdates++;
      if (bank1HasData) primaryBankUpserts++;
      if (bank2HasData) secondaryBankUpserts++;
      if (nomineeHasData) nomineeCreates++;
      if (inv.bankAccounts.length === 0 && (bank1HasData || bank2HasData)) {
        /* create-only — already counted */
      }
      nomineeWipes += 0; // will count on apply
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Investor fields
        if (Object.values(invData).some(Boolean)) {
          await tx.investor.update({ where: { id: inv.id }, data: invData });
          investorUpdates++;
        }

        // 2. Banks — upsert by slot so SipPlan references don't break.
        const primary = inv.bankAccounts.find((b) => b.isPrimary);
        const secondary = inv.bankAccounts.find((b) => !b.isPrimary);

        if (bank1HasData) {
          if (primary) {
            await tx.bankAccount.update({
              where: { id: primary.id },
              data: { ...bank1, isPrimary: true, status: "ACTIVE" },
            });
          } else {
            await tx.bankAccount.create({
              data: { ...bank1, investorId: inv.id, isPrimary: true, status: "ACTIVE" },
            });
          }
          primaryBankUpserts++;
        }
        if (bank2HasData) {
          if (secondary) {
            await tx.bankAccount.update({
              where: { id: secondary.id },
              data: { ...bank2, isPrimary: false, status: "ACTIVE" },
            });
          } else {
            await tx.bankAccount.create({
              data: { ...bank2, investorId: inv.id, isPrimary: false, status: "ACTIVE" },
            });
          }
          secondaryBankUpserts++;
        }

        // 3. Nominee — wipe and recreate. Excel is source of truth.
        const existing = await tx.nominee.findMany({ where: { investorId: inv.id }, select: { id: true } });
        if (existing.length) {
          await tx.nominee.deleteMany({ where: { investorId: inv.id } });
          nomineeWipes++;
        }
        if (nomineeHasData) {
          await tx.nominee.create({
            data: {
              investorId: inv.id,
              name: nomineeName,
              relationship: nomineeRel || null,
              nidNumber: nomineeNid || null,
              share: 100,
            },
          });
          nomineeCreates++;
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ code, error: msg.split("\n")[0] });
    }
  }

  console.log(`\n=== ${apply ? "Apply" : "Dry-run"} summary ===`);
  console.log(`Rows scanned:             ${rowsScanned}`);
  console.log(`Rows matched in DB:       ${rowsMatched}`);
  console.log(`Investor field updates:   ${investorUpdates}`);
  console.log(`Primary bank upserts:     ${primaryBankUpserts}`);
  console.log(`Secondary bank upserts:   ${secondaryBankUpserts}`);
  console.log(`Nominee rows wiped:       ${nomineeWipes}`);
  console.log(`Nominee rows created:     ${nomineeCreates}`);
  if (errors.length) {
    console.log(`\nErrors (${errors.length}, first 10):`);
    for (const e of errors.slice(0, 10)) console.log(`  ${e.code}: ${e.error}`);
  }
  if (!apply) console.log(`\nDry run only. Re-run with --apply to execute.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
