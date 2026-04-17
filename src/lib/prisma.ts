import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Append connection_limit to the DB URL so each serverless isolate keeps a
// small pool (default is num_cpus*2+1 which overwhelms Supabase's 15-slot
// session-mode pooler on concurrent invocations).
function buildDatasourceUrl(): string {
  const url = process.env.DATABASE_URL || "";
  if (url.includes("connection_limit")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=3`;
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
