import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;
  if (!investorId) return NextResponse.json([], { status: 200 });

  const banks = await prisma.bankAccount.findMany({
    where: { investorId },
    orderBy: { isPrimary: "desc" },
  });

  return NextResponse.json(banks);
}
