import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ticket = await prisma.serviceRequest.findUnique({
    where: { id: params.id },
    include: {
      investor: { select: { name: true, investorCode: true } },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(ticket);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Add comment
  if (body.comment) {
    await prisma.ticketComment.create({
      data: {
        serviceRequestId: params.id,
        authorId: userId,
        content: body.comment,
        attachmentUrl: body.attachmentUrl || null,
      },
    });
    return NextResponse.json({ success: true });
  }

  // Update status (admin only)
  if (body.status) {
    const role = (session?.user as any)?.role;
    const adminRoles = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPPORT", "SUPER_ADMIN"];
    if (!adminRoles.includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const ticket = await prisma.serviceRequest.findUnique({
      where: { id: params.id },
      include: { investor: true },
    });

    await prisma.serviceRequest.update({
      where: { id: params.id },
      data: { status: body.status },
    });

    // When a BANK_VERIFICATION ticket is resolved, mark the bank as verified
    // (only if still "Pending Review" — the admin bank-details form may have
    //  already updated it with real details via /api/admin/bank-accounts/[id])
    if (ticket && ticket.type === "BANK_VERIFICATION" && (body.status === "RESOLVED" || body.status === "CLOSED")) {
      const bankIdMatch = ticket.description?.match(/Bank Account ID:\s*(\S+)/);
      if (bankIdMatch) {
        const bankAccountId = bankIdMatch[1];
        const bankAccount = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
        if (bankAccount && bankAccount.bankName === "Pending Review") {
          await prisma.bankAccount.update({
            where: { id: bankAccountId },
            data: { bankName: "Verified (update details)", accountNumber: "Verified (update details)" },
          });
        }
      }
    }

    // Notify investor
    if (ticket) {
      await prisma.notification.create({
        data: {
          userId: ticket.investor.userId,
          type: "SERVICE",
          title: "Service Request Updated",
          message: `Your request #${ticket.trackingNumber} status changed to ${body.status}.`,
          link: `/support/${ticket.id}`,
        },
      });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
