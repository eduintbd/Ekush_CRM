import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  let investorId = (session?.user as any)?.investorId;

  // Fallback: look up from DB if not in session metadata
  if (!investorId && session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { investor: { select: { id: true } } },
    });
    investorId = user?.investor?.id;
  }

  if (!investorId) return NextResponse.json([], { status: 200 });

  const banks = await prisma.bankAccount.findMany({
    where: { investorId },
    orderBy: { isPrimary: "desc" },
  });

  return NextResponse.json(banks);
}
