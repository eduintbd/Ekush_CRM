import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Ensure the Supabase pooler URL uses transaction mode (port 6543) with
// pgbouncer=true and connection_limit=1 so concurrent serverless
// invocations don't exhaust the 15-slot session-mode pool.
function buildDatasourceUrl(): string {
  let url = process.env.DATABASE_URL || "";

  // Switch session-mode port (5432) → transaction-mode port (6543)
  url = url.replace(
    /pooler\.supabase\.com:5432/,
    "pooler.supabase.com:6543",
  );

  // Ensure pgbouncer param is present
  if (!url.includes("pgbouncer=true")) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}pgbouncer=true`;
  }

  // Cap to 1 connection per isolate
  if (!url.includes("connection_limit")) {
    url = `${url}&connection_limit=1`;
  }

  return url;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : [],
    datasourceUrl: buildDatasourceUrl(),
  });

// Always cache in globalThis to reuse across serverless invocations
globalForPrisma.prisma = prisma;

/**
 * Retry a Prisma operation up to `retries` times on connection errors.
 * Use for critical page loads that fail due to Supabase pooler hiccups.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 500
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isConnectionError =
        err?.message?.includes("PrismaClient") ||
        err?.message?.includes("connection") ||
        err?.message?.includes("pool") ||
        err?.code === "P2024" ||
        err?.code === "P1001";

      if (isConnectionError && attempt < retries) {
        await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}
