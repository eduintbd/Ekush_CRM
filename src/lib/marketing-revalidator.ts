/**
 * Fire-and-forget webhook that tells the ekushwml.com marketing rebuild
 * to drop a specific Next.js cache tag. Called from the admin endpoints
 * that persist fund-related content (fund reports, NAV records,
 * dividends) so the public site reflects an admin save within seconds
 * rather than waiting for ISR's revalidate window.
 *
 * Never throws — a misconfigured or down rebuild must not block admin
 * operations. Logs at warn level for operational visibility.
 *
 * Env:
 *   REBUILD_REVALIDATE_URL     full URL of /api/revalidate on the rebuild
 *   REBUILD_REVALIDATE_SECRET  matches REVALIDATE_SECRET on the rebuild
 */

const FUND_CODES = ["efuf", "egf", "esrf"] as const;

/**
 * Matches the rebuild's fundCacheTag() helper in
 * web/src/lib/api/fund-detail.ts.
 */
export function fundTag(code: string, section: string): string {
  return `fund-${code.toLowerCase()}-${section}`;
}

export async function flushTag(tag: string): Promise<void> {
  const url = process.env.REBUILD_REVALIDATE_URL;
  const secret = process.env.REBUILD_REVALIDATE_SECRET;
  if (!url || !secret) return;

  try {
    const target = new URL(url);
    target.searchParams.set("tag", tag);
    const res = await fetch(target.toString(), {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
      // Non-blocking for the caller's happy path, but Node.js fetch needs
      // a duplex hint to stream a body we don't use. A short timeout
      // keeps admin saves snappy if the rebuild is down.
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(
        `[marketing-revalidator] ${tag} → HTTP ${res.status} ${res.statusText}`,
      );
    }
  } catch (e) {
    console.warn(
      `[marketing-revalidator] ${tag} failed: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
}

/**
 * Helper: flush every fund's tag for a given section. Useful when the
 * affected row isn't tied to a single code (global NAV upload) or when
 * you don't want to plumb the code through every caller.
 */
export async function flushAllFundsSection(section: string): Promise<void> {
  await Promise.all(FUND_CODES.map((c) => flushTag(fundTag(c, section))));
}
