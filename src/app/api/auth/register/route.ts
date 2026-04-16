import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { uploadFile } from "@/lib/upload";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  // Bank
  const bankName = formData.get("bankName") as string;
  const branchName = formData.get("branchName") as string;
  const accountNumber = formData.get("accountNumber") as string;
  const routingNumber = formData.get("routingNumber") as string;
  const boAccountNo = formData.get("boAccountNo") as string;
  const dividendOption = (formData.get("dividendOption") as string) === "CIP" ? "CIP" : "CASH";

  // Nominee (relationship selected on the documents step)
  const nomineeRelationship = formData.get("nomineeRelationship") as string;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Check if email already exists
  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
  }

  const passwordHash = await hash(password, 10);

  try {
    // Create user + investor in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          phone: phone || null,
          passwordHash,
          role: "INVESTOR",
          status: "PENDING", // Pending until admin approves
          investor: {
            create: {
              investorCode: `PENDING-${Date.now().toString(36).toUpperCase()}`, // Temp — admin assigns real code during approval
              name,
              investorType: "INDIVIDUAL",
              boId: boAccountNo || null,
              dividendOption,
            },
          },
        },
        include: { investor: true },
      });

      // Create bank account
      if (bankName && accountNumber) {
        await tx.bankAccount.create({
          data: {
            investorId: user.investor!.id,
            bankName,
            branchName: branchName || null,
            accountNumber,
            routingNumber: routingNumber || null,
            isPrimary: true,
          },
        });
      }

      // Create nominee (only relationship is captured on the registration form now)
      if (nomineeRelationship) {
        await tx.nominee.create({
          data: {
            investorId: user.investor!.id,
            name: "",
            relationship: nomineeRelationship,
            share: 100,
          },
        });
      }

      return user;
    });

    // Upload documents
    const investorId = result.investor!.id;
    const docTypes = [
      { key: "nidFront", type: "NID_FRONT" },
      { key: "nidBack", type: "NID_BACK" },
      { key: "photo", type: "PHOTO" },
      { key: "signature", type: "SIGNATURE" },
      { key: "nomineeNidFront", type: "NOMINEE_NID_FRONT" },
      { key: "nomineeNidBack", type: "NOMINEE_NID_BACK" },
      { key: "nomineePhoto", type: "NOMINEE_PHOTO" },
      { key: "nomineeSignature", type: "NOMINEE_SIGNATURE" },
      { key: "tinCert", type: "TIN_CERT" },
      { key: "chequeLeafPhoto", type: "CHEQUE_LEAF_PHOTO" },
      { key: "boAcknowledgement", type: "BO_ACKNOWLEDGEMENT" },
    ];

    for (const { key, type } of docTypes) {
      const file = formData.get(key) as File | null;
      if (file && file.size > 0) {
        const ext = file.name.split(".").pop() || "jpg";
        const filePath = await uploadFile(file, `registration/${investorId}/${type}.${ext}`);
        await prisma.document.create({
          data: {
            investorId,
            type,
            fileName: file.name,
            filePath,
            mimeType: file.type || null,
          },
        });
      }
    }

    // Create a KYC record in PENDING state
    await prisma.kycRecord.create({
      data: {
        investorId,
        type: "REGISTRATION",
        status: "PENDING",
        data: JSON.stringify({ name, email, phone, bankName, accountNumber, dividendOption }),
      },
    });

    // Send notification email to admin (best-effort)
    try {
      // Create an audit log entry that admin can see
      await prisma.auditLog.create({
        data: {
          userId: result.id,
          action: "REGISTRATION",
          entity: "Investor",
          entityId: investorId,
          newValue: JSON.stringify({ name, email, phone }),
        },
      });

      // Create a service request for admin
      await prisma.serviceRequest.create({
        data: {
          investorId,
          type: "NEW_REGISTRATION",
          status: "OPEN",
          description: `New investor registration: ${name} (${email}, ${phone}). Pending approval and investor code assignment.`,
          trackingNumber: `REG-${Date.now().toString(36).toUpperCase()}`,
          slaDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Registration error:", err);
    if (err.code === "P2002") {
      return NextResponse.json({ error: "An account with this information already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
