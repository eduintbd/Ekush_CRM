// Compute XIRR for ALL investors across ALL funds and store in FundHolding.annualizedReturn
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function xirr(cashflows, dates) {
  if (cashflows.length < 2) return 0;
  const dayMs = 86400000;
  function f(rate) {
    let total = 0;
    for (let i = 0; i < cashflows.length; i++) {
      const days = (dates[i] - dates[0]) / dayMs;
      total += cashflows[i] / Math.pow(1 + rate, days / 365);
    }
    return total;
  }
  function df(rate) {
    let total = 0;
    for (let i = 0; i < cashflows.length; i++) {
      const days = (dates[i] - dates[0]) / dayMs;
      total -= (days / 365) * cashflows[i] / Math.pow(1 + rate, days / 365 + 1);
    }
    return total;
  }
  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const fv = f(rate);
    const dfv = df(rate);
    if (Math.abs(dfv) < 1e-10) break;
    const newRate = rate - fv / dfv;
    if (isNaN(newRate) || !isFinite(newRate)) break;
    rate = newRate;
    if (Math.abs(fv) < 1e-6) break;
  }
  if (isNaN(rate) || !isFinite(rate)) return 0;
  return rate;
}

async function main() {
  const funds = await prisma.fund.findMany();
  const holdings = await prisma.fundHolding.findMany({
    select: { id: true, investorId: true, fundId: true, totalCurrentUnits: true },
  });

  console.log(`Processing ${holdings.length} holdings across ${funds.length} funds...`);

  const fundMap = new Map(funds.map(f => [f.id, f]));
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < holdings.length; i++) {
    const h = holdings[i];
    const fund = fundMap.get(h.fundId);
    if (!fund) continue;

    try {
      const txs = await prisma.transaction.findMany({
        where: { investorId: h.investorId, fundId: h.fundId },
        orderBy: { orderDate: "asc" },
        select: { orderDate: true, direction: true, amount: true },
      });

      if (txs.length === 0) continue;

      const cashflows = [];
      const dates = [];
      for (const t of txs) {
        cashflows.push(t.direction === "BUY" ? -Number(t.amount) : Number(t.amount));
        dates.push(t.orderDate.getTime());
      }
      // Add current value as final cashflow
      const currentValue = Number(fund.currentNav) * Number(h.totalCurrentUnits);
      if (currentValue > 0) {
        cashflows.push(currentValue);
        dates.push(Date.now());
      }

      const rate = xirr(cashflows, dates);
      const pct = Math.round(rate * 10000) / 100; // e.g., 15.09

      if (isFinite(pct) && Math.abs(pct) < 500) { // sanity check
        await prisma.fundHolding.update({
          where: { id: h.id },
          data: { annualizedReturn: pct },
        });
        updated++;
      }
    } catch (e) {
      errors++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(`  ${i + 1}/${holdings.length} processed, ${updated} updated, ${errors} errors`);
    }
  }

  console.log(`Done: ${updated} updated, ${errors} errors out of ${holdings.length} holdings`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
