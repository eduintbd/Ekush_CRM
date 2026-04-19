// One-shot migration: remap existing DB role strings to the 4-role RBAC
// model introduced in Step 1 of the team/permissions rollout.
//
//   ADMIN       → SUPER_ADMIN (treating it as full admin historically)
//   SUPER_ADMIN → SUPER_ADMIN (unchanged)
//   MANAGER     → CHECKER      (approved things)
//   COMPLIANCE  → CHECKER      (approved KYC)
//   SUPPORT     → VIEWER       (read-only service role)
//   INVESTOR    → INVESTOR     (unchanged)
//
// The 'MAKER' role is new — no existing users start in this bucket.
// Re-run-safe: if a user is already on a v2 role, it's left alone.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REMAP: Record<string, string> = {
  ADMIN: "SUPER_ADMIN",
  MANAGER: "CHECKER",
  COMPLIANCE: "CHECKER",
  SUPPORT: "VIEWER",
};

const V2_ROLES = new Set(["SUPER_ADMIN", "MAKER", "CHECKER", "VIEWER", "INVESTOR"]);

async function main() {
  const apply = process.argv.includes("--apply");

  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, fullName: true },
  });

  const plans: Array<{ id: string; email: string | null; from: string; to: string }> = [];
  let alreadyOk = 0;
  let unknown = 0;

  for (const u of users) {
    if (V2_ROLES.has(u.role)) {
      alreadyOk++;
      continue;
    }
    const next = REMAP[u.role];
    if (!next) {
      unknown++;
      console.warn(`Unknown role "${u.role}" on user ${u.email ?? u.id} — leaving as-is`);
      continue;
    }
    plans.push({ id: u.id, email: u.email, from: u.role, to: next });
  }

  console.log(`\nTotal users:   ${users.length}`);
  console.log(`Already v2:    ${alreadyOk}`);
  console.log(`Unknown roles: ${unknown}`);
  console.log(`To remap:      ${plans.length}`);

  const byTransition = new Map<string, number>();
  for (const p of plans) {
    const key = `${p.from} → ${p.to}`;
    byTransition.set(key, (byTransition.get(key) ?? 0) + 1);
  }
  byTransition.forEach((v, k) => console.log(`  ${k}: ${v}`));

  if (!apply) {
    console.log(`\nDry run. Re-run with --apply to execute.`);
    return;
  }

  for (const p of plans) {
    await prisma.user.update({ where: { id: p.id }, data: { role: p.to } });
  }
  console.log(`\nApplied ${plans.length} role remaps.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
