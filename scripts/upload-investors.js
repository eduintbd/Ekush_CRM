/**
 * Upload INVESTORS.xlsx for a fund — run locally, no timeout limit.
 *
 * Usage:
 *   node scripts/upload-investors.js EFUF "C:/path/to/2026.03.25 INVESTORS.xlsx"
 *   node scripts/upload-investors.js EGF  "C:/path/to/EGF_2026.03.25 INVESTORS.xlsx"
 *   node scripts/upload-investors.js ESRF "C:/path/to/ESRF_2026.03.25 INVESTORS.xlsx"
 */
require("dotenv").config();
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const ExcelJS = require("exceljs");
const { hash } = require("bcryptjs");

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────
function getCellString(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "object" && "result" in val) return String(val.result || "").trim();
  return String(val).trim();
}

function parseExcelNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "object" && val !== null && "result" in val) {
    const r = val.result;
    if (typeof r === "number") return r;
    if (r === null || r === undefined) return 0;
    val = r;
  }
  let str = String(val).trim().replace(/,/g, "");
  if (str === "" || str === "-" || /^-\s*$/.test(str)) return 0;
  if (str.startsWith("(") && str.endsWith(")")) str = "-" + str.slice(1, -1);
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseExcelDate(val) {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    const epoch = new Date(1899, 11, 30);
    epoch.setDate(epoch.getDate() + val);
    return epoch;
  }
  if (typeof val === "object" && "result" in val) return parseExcelDate(val.result);
  const d = new Date(String(val).trim());
  return isNaN(d.getTime()) ? null : d;
}

function normalizeCode(val) {
  if (!val) return "";
  return String(val).trim().toUpperCase();
}

function mapType(t) {
  const s = String(t || "Individual").trim();
  const m = { Individual: "INDIVIDUAL", "Company/Organization": "COMPANY_ORGANIZATION", "Mutual Fund": "MUTUAL_FUND", "Provident Fund": "PROVIDENT_FUND", "Providend Fund": "PROVIDENT_FUND", "Gratuity Fund": "GRATUITY_FUND" };
  return m[s] || "INDIVIDUAL";
}

// ── XIRR ─────────────────────────────────────────────────────────
function xirr(cashflows, dates) {
  if (cashflows.length < 2) return 0;
  const dayMs = 86400000;
  const f = (rate) => {
    let total = 0;
    for (let i = 0; i < cashflows.length; i++) {
      total += cashflows[i] / Math.pow(1 + rate, (dates[i] - dates[0]) / dayMs / 365);
    }
    return total;
  };
  const df = (rate) => {
    let total = 0;
    for (let i = 0; i < cashflows.length; i++) {
      const days = (dates[i] - dates[0]) / dayMs;
      total -= (days / 365) * cashflows[i] / Math.pow(1 + rate, days / 365 + 1);
    }
    return total;
  };
  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const fv = f(rate);
    const dfv = df(rate);
    if (Math.abs(dfv) < 1e-10) break;
    const nr = rate - fv / dfv;
    if (isNaN(nr) || !isFinite(nr)) break;
    rate = nr;
    if (Math.abs(fv) < 1e-6) break;
  }
  return isFinite(rate) ? rate : 0;
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  const [, , fundCode, filePath] = process.argv;

  if (!fundCode || !filePath) {
    console.log("Usage: node scripts/upload-investors.js <FUND_CODE> <FILE_PATH>");
    console.log("  e.g.: node scripts/upload-investors.js EGF \"C:/path/to/EGF_2026.03.25 INVESTORS.xlsx\"");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
  }

  const fund = await prisma.fund.findUnique({ where: { code: fundCode.toUpperCase() } });
  if (!fund) {
    console.error("Fund not found:", fundCode);
    process.exit(1);
  }

  console.log(`\n📂 Importing ${filePath} for ${fund.name} (${fund.code})...\n`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // ── Parse INVESTORS sheet (holdings) ─────────────────────────
  let holdingsSheet = null;
  for (const s of workbook.worksheets) {
    if (/^investors?$/i.test(s.name)) { holdingsSheet = s; break; }
  }
  if (!holdingsSheet) holdingsSheet = workbook.worksheets[0];

  const headerRow = holdingsSheet.getRow(1);
  const headers = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[getCellString(cell.value).toUpperCase().replace(/\s+/g, " ").trim()] = col;
  });

  const getNum = (row, ...names) => {
    for (const name of names) {
      const col = headers[name];
      if (col) { const v = parseExcelNumber(row.getCell(col).value); if (v !== null) return v; }
    }
    return 0;
  };

  const codeCol = headers["INVESTOR CODE"] || headers["INVESTOR"] || headers["CODE"];
  const nameCol = headers["INVESTOR NAME"] || headers["NAME"];
  const titleCol = headers["TITLE"];
  const typeCol = headers["TYPE OF INVESTOR"] || headers["INVESTOR TYPE"];

  const investorMap = new Map();
  const holdingsData = [];

  for (let rowNum = 2; rowNum <= holdingsSheet.rowCount; rowNum++) {
    const row = holdingsSheet.getRow(rowNum);
    let code = "";
    let name = "";
    if (nameCol) name = getCellString(row.getCell(nameCol).value);
    if (codeCol && codeCol !== nameCol) code = normalizeCode(row.getCell(codeCol).value);
    if (!code) {
      for (let c = 1; c <= Math.min(5, headerRow.cellCount); c++) {
        const v = getCellString(row.getCell(c).value);
        if (/^[A-Z]\d{4,6}$/.test(v)) { code = v; break; }
      }
    }
    if (!name) name = getCellString(row.getCell(1).value);
    if (!name || /^(Total|Grand|Summary)/i.test(name)) continue;
    if (!code) continue;

    const title = titleCol ? getCellString(row.getCell(titleCol).value) : "";
    const type = typeCol ? getCellString(row.getCell(typeCol).value) : "Individual";

    if (!investorMap.has(code)) investorMap.set(code, { code, name, title, type: mapType(type) });

    holdingsData.push({
      investorCode: code,
      lsUnitsBought: getNum(row, "LS_TOTAL UNITS BUY", "LS TOTAL UNITS BUY"),
      lsUnitsSold: getNum(row, "LS_TOTAL UNITS SOLD", "LS TOTAL UNITS SOLD"),
      lsCurrentUnits: getNum(row, "LS_TOTAL CURRENT UNITS", "LS TOTAL CURRENT UNITS"),
      lsCostValue: getNum(row, "LS_TOTAL COST VALUE", "LS TOTAL COST VALUE"),
      lsCostOfUnitsSold: getNum(row, "LS_TOTAL COST OF UNITS SOLD", "LS TOTAL COST OF UNITS SOLD"),
      lsCostValueCurrent: getNum(row, "LS_TOTAL COST VALUE OF CURRENT UNITS", "LS TOTAL COST VALUE OF CURRENT UNITS"),
      lsRealizedGain: getNum(row, "LS_TOTAL REALIZED GAIN", "LS TOTAL REALIZED GAIN"),
      lsWeight: getNum(row, "LS_WEIGHT", "LS WEIGHT"),
      lsAvgCost: getNum(row, "LS_AVERAGE COST", "LS AVERAGE COST"),
      lsMarketValue: getNum(row, "LS_TOTAL MARKET VALUE", "LS TOTAL MARKET VALUE"),
      sipUnitsBought: getNum(row, "SIP_TOTAL UNITS BUY", "SIP TOTAL UNITS BUY"),
      sipUnitsSold: getNum(row, "SIP_TOTAL UNITS SOLD", "SIP TOTAL UNITS SOLD"),
      sipCurrentUnits: getNum(row, "SIP_TOTAL CURRENT UNITS", "SIP TOTAL CURRENT UNITS"),
      sipCostValue: getNum(row, "SIP_TOTAL COST VALUE", "SIP TOTAL COST VALUE"),
      sipCostOfUnitsSold: getNum(row, "SIP_TOTAL COST OF UNITS SOLD", "SIP TOTAL COST OF UNITS SOLD"),
      sipCostValueCurrent: getNum(row, "SIP_TOTAL COST VALUE OF CURRENT UNITS", "SIP TOTAL COST VALUE OF CURRENT UNITS"),
      sipRealizedGain: getNum(row, "SIP_TOTAL REALIZED GAIN", "SIP TOTAL REALIZED GAIN"),
      sipWeight: getNum(row, "SIP_WEIGHT", "SIP WEIGHT"),
      sipAvgCost: getNum(row, "SIP_AVERAGE COST", "SIP AVERAGE COST"),
      sipMarketValue: getNum(row, "SIP_TOTAL MARKET VALUE", "SIP TOTAL MARKET VALUE"),
      totalUnitsBought: getNum(row, "TOTAL UNITS BUY", "TOTAL UNITS BOUGHT"),
      totalUnitsSold: getNum(row, "TOTAL UNITS SOLD"),
      boOpeningBalance: getNum(row, "BO OPENING BALANCE"),
      totalCurrentUnits: getNum(row, "TOTAL CURRENT UNITS", "TOTAL UNITS"),
      totalCostValueCurrent: getNum(row, "TOTAL COST VALUE OF CURRENT INVESTMENT", "TOTAL COST VALUE"),
      avgCost: getNum(row, "AVERAGE COST", "AVG COST"),
      nav: getNum(row, "NAV"),
      totalMarketValue: getNum(row, "TOTAL MARKET VALUE"),
      totalSellableUnits: getNum(row, "TOTAL SELLABLE UNITS"),
      marketValueSellable: getNum(row, "MARKET VALUE OF SELLABLE UNITS"),
      totalRealizedGain: getNum(row, "TOTAL REALIZED GAIN"),
      totalUnrealizedGain: getNum(row, "TOTAL UNREALIZED GAIN"),
      percentUnitsHold: getNum(row, "% OF UNITS HOLD", "PERCENT OF UNITS HOLD"),
      grossDividend: getNum(row, "GROSS DIVIDEND"),
    });
  }

  console.log(`📊 Found ${investorMap.size} investors, ${holdingsData.length} holdings`);

  // ── Parse T. History for XIRR values ─────────────────────────
  const xirrMap = new Map();
  for (const s of workbook.worksheets) {
    if (/t\.?\s*history/i.test(s.name)) {
      let currentCode = "";
      s.eachRow((row) => {
        row.eachCell((cell) => {
          const v = getCellString(cell.value);
          if (/^[A-Z]\d{4,6}$/.test(v.trim())) currentCode = v.trim();
        });
        row.eachCell((cell, colNumber) => {
          const v = getCellString(cell.value).toLowerCase();
          if (v.includes("annualized return") || v.includes("anualized return")) {
            const nextCell = row.getCell(colNumber + 1);
            const val = parseExcelNumber(nextCell.value);
            if (val !== null && val !== 0 && currentCode) {
              xirrMap.set(currentCode, val);
            }
          }
        });
      });
      console.log(`📈 Found ${xirrMap.size} XIRR values from T. History sheet`);
      break;
    }
  }

  // ── Parse LS/SIP transaction sheets ──────────────────────────
  let txCount = 0;
  for (const s of workbook.worksheets) {
    const n = s.name.toLowerCase();
    if (/^ls$/i.test(s.name) || /lump.?sum/i.test(n) || /^sip$/i.test(s.name)) {
      const channel = /^sip$/i.test(s.name) ? "SIP" : "LS";
      const hdrRow = s.getRow(2);
      const hdr = {};
      hdrRow.eachCell({ includeEmpty: false }, (cell, col) => {
        const key = getCellString(cell.value).toLowerCase().replace(/\s+/g, " ").trim();
        if (key) hdr[key] = col;
      });
      const invCol = hdr["investor id"];
      const bsCol = hdr["b/s"];
      const amtCol = hdr["amount"];
      if (!invCol || !bsCol || !amtCol) continue;

      for (let r = 3; r <= s.rowCount; r++) {
        const row = s.getRow(r);
        const code = normalizeCode(row.getCell(invCol).value);
        if (!code) continue;
        const bs = getCellString(row.getCell(bsCol).value).toUpperCase();
        if (bs !== "B" && bs !== "S") continue;
        const amount = parseExcelNumber(row.getCell(amtCol).value);
        if (!amount) continue;

        let date = null;
        if (hdr["date value"]) date = parseExcelDate(row.getCell(hdr["date value"]).value);
        if (!date && hdr["year"] && hdr["month"] && hdr["day"]) {
          const y = parseExcelNumber(row.getCell(hdr["year"]).value);
          const m = parseExcelNumber(row.getCell(hdr["month"]).value);
          const d = parseExcelNumber(row.getCell(hdr["day"]).value);
          if (y && m && d) date = new Date(y, m - 1, d);
        }
        if (!date) continue;

        const uniqueCode = hdr["unique code"]
          ? getCellString(row.getCell(hdr["unique code"]).value)
          : `${code}-${channel}-${r}`;

        // Check if exists
        const existing = await prisma.transaction.findFirst({
          where: { investorId: investorMap.has(code) ? undefined : "none", fundId: fund.id, uniqueCode },
          select: { id: true },
        });

        if (!existing) {
          const inv = await prisma.investor.findUnique({ where: { investorCode: code } });
          if (inv) {
            try {
              await prisma.transaction.create({
                data: {
                  investorId: inv.id, fundId: fund.id, channel, direction: bs === "B" ? "BUY" : "SELL",
                  amount, nav: hdr["nav (strike rate)"] ? parseExcelNumber(row.getCell(hdr["nav (strike rate)"]).value) : 0,
                  units: hdr["unit"] ? parseExcelNumber(row.getCell(hdr["unit"]).value) : 0,
                  cumulativeUnits: hdr["cumulative unit"] ? parseExcelNumber(row.getCell(hdr["cumulative unit"]).value) : 0,
                  unitCapital: hdr["unit capital"] ? parseExcelNumber(row.getCell(hdr["unit capital"]).value) : 0,
                  unitPremium: hdr["unit premium reserve"] ? parseExcelNumber(row.getCell(hdr["unit premium reserve"]).value) : 0,
                  avgCostAtTime: hdr["nav at cost (average)"] ? parseExcelNumber(row.getCell(hdr["nav at cost (average)"]).value) : 0,
                  realizedGain: hdr["realized gain"] ? parseExcelNumber(row.getCell(hdr["realized gain"]).value) : 0,
                  costOfUnitsSold: hdr["cost of units sold"] ? parseExcelNumber(row.getCell(hdr["cost of units sold"]).value) : 0,
                  uniqueCode, orderDate: date, status: "EXECUTED",
                },
              });
              txCount++;
            } catch {}
          }
        }
      }
    }
  }
  console.log(`📝 Imported ${txCount} new transactions`);

  // ── Create new investors ─────────────────────────────────────
  let usersCreated = 0;
  for (const [code, data] of investorMap) {
    const exists = await prisma.investor.findUnique({ where: { investorCode: code } });
    if (exists) continue;
    try {
      const passwordHash = await hash(`Ekush@${code}2026`, 10);
      await prisma.user.create({
        data: { passwordHash, role: "INVESTOR", status: "PENDING", investor: { create: { investorCode: code, name: data.name, title: data.title || null, investorType: data.type } } },
      });
      usersCreated++;
    } catch {}
  }
  console.log(`👤 Created ${usersCreated} new investors`);

  // ── Upsert holdings ──────────────────────────────────────────
  const allCodes = [...new Set(holdingsData.map(h => h.investorCode))];
  const allInvestors = await prisma.investor.findMany({ where: { investorCode: { in: allCodes } }, select: { id: true, investorCode: true } });
  const idMap = new Map(allInvestors.map(i => [i.investorCode, i.id]));

  let holdingsUpserted = 0;
  for (const h of holdingsData) {
    const investorId = idMap.get(h.investorCode);
    if (!investorId) continue;

    const xirrVal = xirrMap.get(h.investorCode);
    const data = { ...h };
    delete data.investorCode;
    if (xirrVal !== undefined) data.annualizedReturn = xirrVal;

    await prisma.fundHolding.upsert({
      where: { investorId_fundId: { investorId, fundId: fund.id } },
      update: data,
      create: { investorId, fundId: fund.id, ...data },
    });
    holdingsUpserted++;
    if (holdingsUpserted % 100 === 0) console.log(`  ${holdingsUpserted}/${holdingsData.length} holdings...`);
  }

  // ── Sync dividends into grossDividend field ──────────────────
  const divGroups = await prisma.dividend.groupBy({
    by: ["investorId", "fundId"],
    where: { fundId: fund.id },
    _sum: { grossDividend: true },
  });
  let divSynced = 0;
  for (const d of divGroups) {
    const total = Number(d._sum.grossDividend || 0);
    if (total <= 0) continue;
    const holding = await prisma.fundHolding.findUnique({
      where: { investorId_fundId: { investorId: d.investorId, fundId: d.fundId } },
    });
    if (holding) {
      await prisma.fundHolding.update({ where: { id: holding.id }, data: { grossDividend: total } });
      divSynced++;
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   ${usersCreated} new investors`);
  console.log(`   ${holdingsUpserted} holdings updated`);
  console.log(`   ${txCount} new transactions`);
  console.log(`   ${xirrMap.size} XIRR values from T. History`);
  console.log(`   ${divSynced} dividend totals synced`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
