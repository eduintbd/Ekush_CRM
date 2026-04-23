import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { importInvestors } from "./import-investors";
import { importTransactions } from "./import-transactions";
import { seedKnowledgeCenter } from "./knowledge";
import { logProgress } from "./helpers";

const prisma = new PrismaClient();

async function main() {
  logProgress("=== Ekush WML Database Seed Started ===");

  // Step 1: Create Fund records
  logProgress("Creating fund records...");
  const funds = [
    {
      code: "EFUF",
      name: "Ekush First Unit Fund",
      fundType: "Balanced",
      description: "Balanced portfolio of equity and debt securities",
      objective: "Long-term capital appreciation through a balanced investment approach",
      currentNav: 14.754,
      faceValue: 10,
    },
    {
      code: "EGF",
      name: "Ekush Growth Fund",
      fundType: "Growth",
      description: "Equity-focused fund with higher growth potential",
      objective: "Capital growth through equity investments with higher volatility tolerance",
      currentNav: 12.552,
      faceValue: 10,
    },
    {
      code: "ESRF",
      name: "Ekush Stable Return Fund",
      fundType: "Stable",
      description: "Fixed-income securities and IPOs for stable returns",
      objective: "Stable returns through fixed-income securities and selective IPO investments",
      currentNav: 14.224,
      faceValue: 10,
    },
  ];

  for (const fund of funds) {
    await prisma.fund.upsert({
      where: { code: fund.code },
      update: {
        name: fund.name,
        currentNav: fund.currentNav,
        fundType: fund.fundType,
        description: fund.description,
        objective: fund.objective,
      },
      create: {
        code: fund.code,
        name: fund.name,
        fundType: fund.fundType,
        description: fund.description,
        objective: fund.objective,
        currentNav: fund.currentNav,
        faceValue: fund.faceValue,
      },
    });
    logProgress(`  Fund ${fund.code} created/updated`);
  }

  // Step 2: Create admin user
  logProgress("Creating admin user...");
  const adminPassword = await hash("admin@ekush2026", 10);
  const existingAdmin = await prisma.user.findFirst({
    where: { email: "admin@ekushwml.com" },
    select: { id: true },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: "admin@ekushwml.com",
        passwordHash: adminPassword,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
    logProgress("  Admin user created (admin@ekushwml.com)");
  } else {
    logProgress("  Admin user already exists, skipping");
  }

  // Step 3: Import investors and holdings from Excel files
  await importInvestors(prisma);

  // Step 3b: Import LS/SIP transaction history and backfill firstPurchaseDate
  await importTransactions(prisma);

  // Step 4: Create NAV records from current values
  logProgress("Creating initial NAV records...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const fund of funds) {
    const dbFund = await prisma.fund.findUnique({ where: { code: fund.code } });
    if (dbFund) {
      await prisma.navRecord.upsert({
        where: {
          fundId_date: { fundId: dbFund.id, date: today },
        },
        update: { nav: fund.currentNav },
        create: {
          fundId: dbFund.id,
          date: today,
          nav: fund.currentNav,
        },
      });
    }
  }
  logProgress("  NAV records created");

  // Step 5: Update fund AUM based on holdings
  logProgress("Updating fund AUM...");
  for (const fund of funds) {
    const dbFund = await prisma.fund.findUnique({ where: { code: fund.code } });
    if (dbFund) {
      const result = await prisma.fundHolding.aggregate({
        where: { fundId: dbFund.id },
        _sum: {
          totalMarketValue: true,
          totalCurrentUnits: true,
        },
      });

      await prisma.fund.update({
        where: { code: fund.code },
        data: {
          totalAum: result._sum.totalMarketValue || 0,
          totalUnits: result._sum.totalCurrentUnits || 0,
        },
      });
      logProgress(`  ${fund.code} AUM updated`);
    }
  }

  // Step 5: Knowledge Center content (videos, articles, learn topics).
  // Idempotent — safe to re-run after initial seed.
  await seedKnowledgeCenter(prisma);

  logProgress("=== Seed Complete ===");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
