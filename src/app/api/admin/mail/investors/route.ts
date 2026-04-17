import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPER_ADMIN"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const investors = await prisma.investor.findMany({
    where: { holdings: { some: {} } }, // Only investors with at least one holding
    include: {
      user: { select: { email: true, phone: true, status: true } },
      holdings: {
        include: { fund: { select: { code: true, name: true, currentNav: true } } },
      },
      taxCertificates: {
        where: { periodEnd: { gte: new Date(new Date().getFullYear() - 1, 0, 1) } },
        select: { id: true, fundId: true },
        take: 1,
      },
    },
    orderBy: { investorCode: "asc" },
  });

  // Shape response into the table the admin needs. For each investor we
  // compute per-fund market value so the UI can disable zero-MV rows.
  const FUNDS = ["EFUF", "EGF", "ESRF"];
  const rows = investors.map((inv) => {
    const perFund: Record<string, { units: number; nav: number; marketValue: number; hasPortfolio: boolean }> = {};
    for (const code of FUNDS) {
      const h = inv.holdings.find((x) => x.fund.code === code);
      const units = h ? Number(h.totalCurrentUnits) : 0;
      const nav = h ? Number(h.fund.currentNav) : 0;
      const mv = units * nav;
      perFund[code] = { units, nav, marketValue: mv, hasPortfolio: mv > 0 };
    }
    return {
      id: inv.id,
      investorCode: inv.investorCode,
      name: inv.name,
      email: inv.user.email || "",
      phone: inv.user.phone || "",
      hasTaxCertificate: inv.taxCertificates.length > 0,
      funds: perFund,
    };
  });

  return NextResponse.json(rows);
}
