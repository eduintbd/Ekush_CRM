/**
 * Input parser for /api/admin/fund-fact-sheets. Fact sheet data is
 * two JSON blobs — asset allocation and top holdings — plus a date.
 * Both blobs are narrow enough to validate inline here rather than
 * pulling in zod.
 */

export type AssetAllocationEntry = {
  category: string;
  weightPct: number;
};

export type SectorAllocationEntry = {
  sector: string;
  weightPct: number;
};

export type TopHoldingEntry = {
  ticker: string;
  name: string;
  weightPct: number;
};

export type FactSheetInput = {
  fundCode: string;
  asOfDate: Date;
  assetAllocation: AssetAllocationEntry[];
  sectorAllocation: SectorAllocationEntry[];
  topHoldings: TopHoldingEntry[];
  sourcePdfUrl: string | null;
};

const ALLOWED_CODES = new Set(["EFUF", "EGF", "ESRF"]);

export function parseFactSheetInput(
  body: Record<string, unknown>,
): FactSheetInput | { error: string } {
  const fundCode = str(body.fundCode).toUpperCase();
  if (!ALLOWED_CODES.has(fundCode)) {
    return {
      error: `fundCode must be one of: ${[...ALLOWED_CODES].join(", ")}`,
    };
  }

  const asOfRaw = str(body.asOfDate);
  const asOfDate = new Date(asOfRaw);
  if (!asOfRaw || Number.isNaN(asOfDate.getTime())) {
    return { error: "asOfDate must be an ISO date" };
  }

  const allocationRaw = Array.isArray(body.assetAllocation)
    ? body.assetAllocation
    : [];
  const allocation: AssetAllocationEntry[] = [];
  for (const raw of allocationRaw) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const category = str(r.category);
    const weight = num(r.weightPct);
    if (!category || weight == null) continue;
    if (weight < 0 || weight > 100) {
      return {
        error: `assetAllocation weightPct must be 0–100 (got ${weight} for ${category})`,
      };
    }
    allocation.push({ category, weightPct: weight });
  }

  // Allocation doesn't have to sum to exactly 100 — rounding + a
  // small "Cash & others" residual is common — but we warn well
  // outside that window so admins catch typos.
  const total = allocation.reduce((s, r) => s + r.weightPct, 0);
  if (allocation.length && (total < 80 || total > 120)) {
    return {
      error: `assetAllocation weights total ${total.toFixed(1)}% — expected ~100%`,
    };
  }

  const sectorRaw = Array.isArray(body.sectorAllocation)
    ? body.sectorAllocation
    : [];
  const sector: SectorAllocationEntry[] = [];
  for (const raw of sectorRaw) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const s = str(r.sector);
    const weight = num(r.weightPct);
    if (!s || weight == null) continue;
    if (weight < 0 || weight > 100) {
      return {
        error: `sectorAllocation weightPct must be 0–100 (got ${weight} for ${s})`,
      };
    }
    sector.push({ sector: s, weightPct: weight });
  }

  const sectorTotal = sector.reduce((s, r) => s + r.weightPct, 0);
  // Sectors only cover equity buckets, so they should sum to roughly
  // the Stocks % (typically 95–100 on an Ekush portfolio). Let a
  // 60–105 window through to accommodate heavy-cash quarters.
  if (sector.length && (sectorTotal < 60 || sectorTotal > 105)) {
    return {
      error: `sectorAllocation weights total ${sectorTotal.toFixed(1)}% — expected 60–105% (sum of equity sectors)`,
    };
  }

  const holdingsRaw = Array.isArray(body.topHoldings) ? body.topHoldings : [];
  const holdings: TopHoldingEntry[] = [];
  for (const raw of holdingsRaw) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const ticker = str(r.ticker).toUpperCase();
    const name = str(r.name);
    const weight = num(r.weightPct);
    if (!ticker || !name || weight == null) continue;
    if (weight < 0 || weight > 100) {
      return {
        error: `topHoldings weightPct must be 0–100 (got ${weight} for ${ticker})`,
      };
    }
    holdings.push({ ticker, name, weightPct: weight });
    if (holdings.length >= 25) break; // generous cap, public renders top 5
  }

  const sourceUrlRaw = str(body.sourcePdfUrl);
  const sourcePdfUrl = sourceUrlRaw || null;
  if (sourcePdfUrl && !/^https?:\/\//i.test(sourcePdfUrl)) {
    return { error: "sourcePdfUrl must be an http(s) URL" };
  }

  return {
    fundCode,
    asOfDate,
    assetAllocation: allocation,
    sectorAllocation: sector,
    topHoldings: holdings,
    sourcePdfUrl,
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
