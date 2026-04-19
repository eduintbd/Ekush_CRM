import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { STAFF_ROLES } from "@/lib/roles";


import { prisma } from "@/lib/prisma";

function generateTrackingNumber(): string {
  const prefix = "SR";
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${date}${rand}`;
}

export async function GET() {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;
  const role = (session?.user as any)?.role;

  if (!investorId && role === "INVESTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin sees all tickets, investor sees own
    const where = STAFF_ROLES.includes(role) ? {} : { investorId };

  const tickets = await prisma.serviceRequest.findMany({
    where,
    include: {
      investor: { select: { id: true, name: true, investorCode: true } },
      comments: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const investorId = (session?.user as any)?.investorId;
  const userId = (session?.user as any)?.id;

  if (!investorId || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, description } = body;

  if (!type) {
    return NextResponse.json({ error: "Request type required" }, { status: 400 });
  }

  // Calculate SLA (3 business days)
  const slaDeadline = new Date();
  slaDeadline.setDate(slaDeadline.getDate() + 3);

  const ticket = await prisma.serviceRequest.create({
    data: {
      investorId,
      type,
      description: description || null,
      trackingNumber: generateTrackingNumber(),
      slaDeadline,
    },
  });

  // Notification depends on ticket.trackingNumber and ticket.id, so it runs after ticket creation
  await prisma.notification.create({
    data: {
      userId,
      type: "SERVICE",
      title: "Service Request Created",
      message: `Your request #${ticket.trackingNumber} (${type.replace(/_/g, " ")}) has been submitted. SLA: 3 business days.`,
      link: `/support/${ticket.id}`,
    },
  });

  return NextResponse.json(ticket);
}
