import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Shared helpers used by every /api/public/funds/[code]/* route handler.
 *
 * - `resolveFund` does the `code → fund.id` lookup the rebuild needs on
 *   every request. Returns the fund or a prebuilt 404 response.
 * - `absoluteUrl` wraps the `filePath.startsWith("http")` check used to
 *   turn relative paths under /public into absolute URLs.
 * - `cacheHeaders` keeps the rebuild's ISR + SWR contract consistent
 *   across all four PDF-list tabs (daily revalidate, weekly SWR).
 */

type FundRow = { id: string };

export async function resolveFund(
  code: string,
): Promise<{ fund: FundRow } | { notFound: NextResponse }> {
  const upper = code.toUpperCase();
  const fund = await prisma.fund.findUnique({
    where: { code: upper },
    select: { id: true },
  });
  if (!fund) {
    return {
      notFound: NextResponse.json(
        { error: "Fund not found" },
        { status: 404 },
      ),
    };
  }
  return { fund };
}

export function absoluteUrl(filePath: string): string {
  if (!filePath) return "";
  if (filePath.startsWith("http")) return filePath;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `${base}${filePath}`;
}

export const cacheHeaders = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
} as const;

export const navCacheHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
} as const;
