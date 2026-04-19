import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

const SETUP_SECRET = "ekush-setup-2026";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.secret !== SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // Step 1: Create funds
    const funds = [
      { code: "EFUF", name: "Ekush First Unit Fund", fundType: "Balanced", description: "Balanced portfolio of equity and debt securities", currentNav: 14.754, faceValue: 10 },
      { code: "EGF", name: "Ekush Growth Fund", fundType: "Growth", description: "Equity-focused fund with higher growth potential", currentNav: 12.552, faceValue: 10 },
      { code: "ESRF", name: "Ekush Stable Return Fund", fundType: "Stable", description: "Fixed-income securities and IPOs for stable returns", currentNav: 14.224, faceValue: 10 },
    ];

    for (const fund of funds) {
      await prisma.fund.upsert({
        where: { code: fund.code },
        update: { currentNav: fund.currentNav },
        create: { ...fund, objective: fund.description },
      });
    }
    results.push("3 funds created");

    // Step 2: Create admin user (email is no longer unique, so upsert isn't
    // available — check-then-create instead).
    const adminHash = await hash("admin@ekush2026", 10);
    const existingAdmin = await prisma.user.findFirst({
      where: { email: "admin@ekushwml.com" },
      select: { id: true },
    });
    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: "admin@ekushwml.com",
          passwordHash: adminHash,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },
      });
      results.push("Admin user created");
    } else {
      results.push("Admin user already exists");
    }

    // Step 3: Create sample investors
    const sampleInvestors = [
      { code: "A00002", name: "Sample Individual Investor", type: "INDIVIDUAL" },
      { code: "A00003", name: "Ekush Wealth Management Limited", type: "COMPANY_ORGANIZATION" },
      { code: "A00010", name: "Sample Investor Three", type: "INDIVIDUAL" },
    ];

    for (const inv of sampleInvestors) {
      const pw = await hash(`Ekush@${inv.code}2026`, 10);
      const existing = await prisma.investor.findUnique({ where: { investorCode: inv.code } });
      if (!existing) {
        await prisma.user.create({
          data: {
            passwordHash: pw,
            role: "INVESTOR",
            status: "PENDING",
            investor: {
              create: { investorCode: inv.code, name: inv.name, investorType: inv.type },
            },
          },
        });

        // Create holdings for each fund
        const investor = await prisma.investor.findUnique({ where: { investorCode: inv.code } });
        if (investor) {
          for (const fund of funds) {
            const dbFund = await prisma.fund.findUnique({ where: { code: fund.code } });
            if (dbFund) {
              const units = Math.random() * 10000 + 1000;
              const avgCost = fund.currentNav * (0.8 + Math.random() * 0.3);
              const marketValue = units * fund.currentNav;
              const costValue = units * avgCost;
              await prisma.fundHolding.create({
                data: {
                  investorId: investor.id,
                  fundId: dbFund.id,
                  totalCurrentUnits: units,
                  totalUnitsBought: units,
                  avgCost,
                  nav: fund.currentNav,
                  totalMarketValue: marketValue,
                  totalCostValueCurrent: costValue,
                  totalRealizedGain: 0,
                  totalUnrealizedGain: marketValue - costValue,
                  totalSellableUnits: units,
                  marketValueSellable: marketValue,
                  lsCurrentUnits: units * 0.6,
                  lsUnitsBought: units * 0.6,
                  lsCostValueCurrent: costValue * 0.6,
                  lsMarketValue: marketValue * 0.6,
                  lsAvgCost: avgCost,
                  sipCurrentUnits: units * 0.4,
                  sipUnitsBought: units * 0.4,
                  sipCostValueCurrent: costValue * 0.4,
                  sipMarketValue: marketValue * 0.4,
                  sipAvgCost: avgCost,
                },
              });
            }
          }
        }
      }
    }
    results.push(`${sampleInvestors.length} sample investors with holdings created`);

    // Step 4: Create NAV records
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const fund of funds) {
      const dbFund = await prisma.fund.findUnique({ where: { code: fund.code } });
      if (dbFund) {
        await prisma.navRecord.upsert({
          where: { fundId_date: { fundId: dbFund.id, date: today } },
          update: { nav: fund.currentNav },
          create: { fundId: dbFund.id, date: today, nav: fund.currentNav },
        });
      }
    }
    results.push("NAV records created");

    return NextResponse.json({ success: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, results }, { status: 500 });
  }
}
