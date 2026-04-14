import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;
  const userId = (session?.user as any)?.id;

  if (!investorId || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "update_contact") {
    const { email, phone } = body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(email !== undefined ? { email: email || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
      },
    });

    // Sync email with Supabase Auth so login doesn't break
    if (email !== undefined && user.supabaseId) {
      const authEmail = email || `${user.phone ?? user.id}@ekush.internal`;
      await supabaseAdmin.auth.admin.updateUserById(user.supabaseId, {
        email: authEmail,
      });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "update_personal") {
    const { address, nidNumber, tinNumber } = body;
    await prisma.investor.update({
      where: { id: investorId },
      data: {
        ...(address !== undefined ? { address } : {}),
        ...(nidNumber !== undefined ? { nidNumber } : {}),
        ...(tinNumber !== undefined ? { tinNumber } : {}),
      },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "add_bank") {
    const { bankName, branchName, accountNumber, routingNumber } = body;
    if (!bankName || !accountNumber) {
      return NextResponse.json({ error: "Bank name and account number required" }, { status: 400 });
    }

    // If first bank account, make it primary
    const existingCount = await prisma.bankAccount.count({ where: { investorId } });

    const newBank = await prisma.bankAccount.create({
      data: {
        investorId,
        bankName,
        branchName: branchName || null,
        accountNumber,
        routingNumber: routingNumber || null,
        isPrimary: existingCount === 0,
      },
    });

    // For existing investors (not first bank), create a verification ticket
    if (existingCount > 0) {
      const investor = await prisma.investor.findUnique({ where: { id: investorId }, select: { investorCode: true, name: true } });
      if (investor) {
        const trackingNumber = `BNK-${Date.now().toString(36).toUpperCase()}`;
        await prisma.serviceRequest.create({
          data: {
            investorId,
            type: "BANK_VERIFICATION",
            status: "OPEN",
            description: `New bank account added by ${investor.name} (${investor.investorCode}): ${bankName} - A/C: ${accountNumber}. Bank Account ID: ${newBank.id}`,
            trackingNumber,
            slaDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  }

  if (action === "add_nominee") {
    const { name, relationship, nidNumber, share } = body;
    if (!name) {
      return NextResponse.json({ error: "Nominee name required" }, { status: 400 });
    }
    await prisma.nominee.create({
      data: {
        investorId,
        name,
        relationship: relationship || null,
        nidNumber: nidNumber || null,
        share: share || 100,
      },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "delete_bank") {
    const { id } = body;
    await prisma.bankAccount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  if (action === "delete_nominee") {
    const { id } = body;
    await prisma.nominee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
