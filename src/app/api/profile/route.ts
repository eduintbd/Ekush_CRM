import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  let investorId = (session?.user as any)?.investorId;
  const userId = (session?.user as any)?.id;

  // Fallback: if investorId missing from session metadata, look it up from DB
  if (!investorId && userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { investor: { select: { id: true } } },
    });
    investorId = user?.investor?.id;
  }

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

    // If first bank account, make it primary and active. Additional accounts
    // are PENDING_APPROVAL until an admin reviews them and marks them ACTIVE —
    // only then they show as secondary accounts in the portal + SIP page.
    const existingCount = await prisma.bankAccount.count({ where: { investorId } });
    // Cap at 2 (primary + secondary). Extra accounts would have no UI slot and
    // would only add noise to the admin queue.
    if (existingCount >= 2) {
      return NextResponse.json(
        { error: "Maximum of 2 bank accounts already registered." },
        { status: 400 },
      );
    }
    const isFirst = existingCount === 0;

    const newBank = await prisma.bankAccount.create({
      data: {
        investorId,
        bankName,
        branchName: branchName || null,
        accountNumber,
        routingNumber: routingNumber || null,
        isPrimary: isFirst,
        status: isFirst ? "ACTIVE" : "PENDING_APPROVAL",
      },
    });

    // Secondary bank submissions (not the first one) always create a
    // BANK_VERIFICATION ticket — admin reviews in /admin/tickets and
    // approves, which flips the bank status from PENDING_APPROVAL to ACTIVE.
    if (!isFirst) {
      const investor = await prisma.investor.findUnique({ where: { id: investorId }, select: { investorCode: true, name: true } });
      if (investor) {
        const trackingNumber = `BNK-${Date.now().toString(36).toUpperCase()}`;
        await prisma.serviceRequest.create({
          data: {
            investorId,
            type: "BANK_VERIFICATION",
            status: "OPEN",
            description: `Bank account added/changed by ${investor.name} (${investor.investorCode}): ${bankName} - A/C: ${accountNumber}. Bank Account ID: ${newBank.id}`,
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
