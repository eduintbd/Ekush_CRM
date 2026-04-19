// One-off override pass for investor emails. Treats "0", empty, "N/A" as
// "no email in Excel". For any real email, force-writes it to the target
// investor's user record — if another user currently holds that email,
// that other user's email is cleared (nulled) first so the unique
// constraint doesn't block the write.
//
// Usage (from repo root):
//   npx ts-node --compiler-options '{"module":"CommonJS","types":["node"]}' scripts/override-emails-from-xlsx.ts          # dry run
//   npx ts-node --compiler-options '{"module":"CommonJS","types":["node"]}' scripts/override-emails-from-xlsx.ts --apply  # apply

import ExcelJS from "exceljs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COL = {
  INVESTOR_CODE: 2,
  MAIL: 8,
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

function looksLikeRealEmail(s: string): boolean {
  const t = s.trim().toLowerCase().replace(/^mailto:/, "");
  if (!t) return false;
  if (t === "0" || t === "n/a" || t === "na" || t === "-" || t === "—") return false;
  // Require an @ and a dot in the domain portion.
  return /^\S+@\S+\.\S+$/.test(t);
}

type Plan = {
  code: string;
  investorId: string;
  userId: string;
  name: string;
  currentEmail: string | null;
  newEmail: string;
  // If another user currently holds newEmail, this is that user's id.
  displacesUserId: string | null;
  displacedInvestorCode: string | null;
};

async function main() {
  const apply = process.argv.includes("--apply");

  const file = path.join(process.cwd(), "public", "Investors Database.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet("INVESTORS Main List");
  if (!ws) throw new Error("Sheet 'INVESTORS Main List' not found");

  const investors = await prisma.investor.findMany({
    include: { user: { select: { id: true, email: true } } },
  });
  const byCode = new Map<string, (typeof investors)[number]>();
  for (const inv of investors) byCode.set(inv.investorCode.trim().toUpperCase(), inv);

  // Pass 1: collect plans for every row that has a real email.
  const seenEmails = new Map<string, string>(); // emailLower -> investorCode (first seen)
  const plans: Plan[] = [];
  const duplicatesInExcel: Array<{ email: string; codes: string[] }> = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const code = cellText(row.getCell(COL.INVESTOR_CODE).value).toUpperCase();
    if (!code) continue;
    const raw = cellText(row.getCell(COL.MAIL).value).replace(/^mailto:/i, "").trim();
    if (!looksLikeRealEmail(raw)) continue;
    const email = raw;

    const inv = byCode.get(code);
    if (!inv) continue;

    // Track dupes within the Excel so the user knows last-write-wins order.
    const key = email.toLowerCase();
    const prior = seenEmails.get(key);
    if (prior && prior !== code) {
      const existing = duplicatesInExcel.find((d) => d.email === key);
      if (existing) existing.codes.push(code);
      else duplicatesInExcel.push({ email: key, codes: [prior, code] });
    }
    seenEmails.set(key, code);

    plans.push({
      code,
      investorId: inv.id,
      userId: inv.user.id,
      name: inv.name,
      currentEmail: inv.user.email,
      newEmail: email,
      displacesUserId: null,
      displacedInvestorCode: null,
    });
  }

  // Pass 2: only guard against overwriting admin/staff emails. The DB no
  // longer enforces email uniqueness, so investors sharing an address is
  // allowed — we just write the Excel value directly, no displacement.
  const allEmails = Array.from(new Set(plans.map((p) => p.newEmail)));
  const owners = await prisma.user.findMany({
    where: { email: { in: allEmails } },
    select: { id: true, email: true, investor: { select: { investorCode: true } } },
  });
  const skippedStaffCollisions: Array<{ code: string; email: string }> = [];
  const staffOwnedEmails = new Set(
    owners.filter((o) => !o.investor).map((o) => o.email ?? ""),
  );
  for (const p of plans) {
    if (staffOwnedEmails.has(p.newEmail)) {
      skippedStaffCollisions.push({ code: p.code, email: p.newEmail });
      p.newEmail = ""; // mark as skip
    }
  }

  // Classify
  const noOp = plans.filter((p) => (p.currentEmail ?? "") === p.newEmail && p.newEmail);
  const overwrite = plans.filter(
    (p) => p.newEmail && (p.currentEmail ?? "") !== p.newEmail,
  );
  const withDisplacement: Plan[] = []; // deprecated — kept as [] so later log stays empty

  console.log(`\n=== Dry-run summary ===`);
  console.log(`Total Excel rows with a real email:      ${plans.length}`);
  console.log(`  No-op (DB already matches Excel):      ${noOp.length}`);
  console.log(`  Overwrite needed:                      ${overwrite.length}`);
  console.log(`  Skipped (email held by staff/admin):   ${skippedStaffCollisions.length}`);
  console.log(`  Duplicate emails within Excel:         ${duplicatesInExcel.length} groups (now allowed — DB unique constraint removed)`);
  void withDisplacement; // retained for backwards compat but unused now
  if (skippedStaffCollisions.length) {
    console.log(`\nSkipped staff/admin collisions (these emails are NOT touched):`);
    for (const s of skippedStaffCollisions) {
      console.log(`  ${s.code} wants ${s.email}`);
    }
  }

  if (duplicatesInExcel.length) {
    console.log(`\nDuplicate emails in Excel (last-write-wins):`);
    for (const d of duplicatesInExcel.slice(0, 10)) {
      console.log(`  ${d.email} — ${d.codes.join(", ")}`);
    }
  }
  if (withDisplacement.length) {
    console.log(`\nSample displacements (first 10):`);
    for (const p of withDisplacement.slice(0, 10)) {
      console.log(
        `  ${p.code} ${p.name}: wants "${p.newEmail}" — currently on ${p.displacedInvestorCode ?? "unknown investor"}`,
      );
    }
  }

  if (!apply) {
    console.log(`\nDry run only. Re-run with --apply to execute.`);
    return;
  }

  console.log(`\nApplying email overrides…`);
  let applied = 0;
  const errors: Array<{ code: string; error: string }> = [];

  for (const p of plans) {
    if (!p.newEmail) continue; // skipped (staff/admin collision)
    if ((p.currentEmail ?? "") === p.newEmail) continue;

    try {
      await prisma.user.update({
        where: { id: p.userId },
        data: { email: p.newEmail },
      });
      applied++;
      if (applied % 50 === 0) console.log(`  …${applied}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ code: p.code, error: msg.split("\n")[0] });
    }
  }

  console.log(`\nDone. Applied ${applied} email updates, ${errors.length} errors.`);
  if (errors.length) {
    console.log(`\nErrors (first 20):`);
    for (const e of errors.slice(0, 20)) {
      console.log(`  ${e.code}: ${e.error}`);
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
