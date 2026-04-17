import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPPORT", "SUPER_ADMIN"];

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const investor = await prisma.investor.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      bankAccounts: { where: { isPrimary: true }, take: 1 },
      nominees: { take: 1 },
      documents: true,
      kycRecords: { where: { type: "REGISTRATION" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!investor) {
    return NextResponse.json({ error: "Investor not found" }, { status: 404 });
  }

  // Registration JSON snapshot lives in the KycRecord.documentUrl column
  // (there is no dedicated JSON column on KycRecord in the schema)
  let snapshot: any = {};
  const rawSnapshot = investor.kycRecords[0]?.documentUrl;
  if (rawSnapshot) {
    try {
      snapshot = JSON.parse(rawSnapshot);
    } catch {
      snapshot = {};
    }
  }

  const bank = investor.bankAccounts[0];
  const nominee = investor.nominees[0];
  const findDoc = (type: string) =>
    investor.documents.find((d) => d.type === type)?.filePath || null;

  return NextResponse.json({
    profile: {
      name: investor.name,
      email: investor.user.email || "",
      phone: investor.user.phone || "",
    },
    applicant: {
      nidNumber: investor.nidNumber || snapshot.applicant?.nidNumber || "",
      fatherName: snapshot.applicant?.fatherName || "",
      motherName: snapshot.applicant?.motherName || "",
      presentAddress: investor.address || snapshot.applicant?.presentAddress || "",
      permanentAddress: snapshot.applicant?.permanentAddress || "",
    },
    nominee: {
      name: nominee?.name || snapshot.nominee?.name || "",
      nidNumber: nominee?.nidNumber || snapshot.nominee?.nidNumber || "",
      fatherName: snapshot.nominee?.fatherName || "",
      motherName: snapshot.nominee?.motherName || "",
      presentAddress: snapshot.nominee?.presentAddress || "",
      permanentAddress: snapshot.nominee?.permanentAddress || "",
    },
    bank: {
      bankName: bank?.bankName || "",
      branchName: bank?.branchName || "",
      accountNumber: bank?.accountNumber || "",
      routingNumber: bank?.routingNumber || "",
      boAccountNo: investor.boId || "",
    },
    tinNumber: investor.tinNumber || snapshot.applicant?.tinNumber || "",
    dividendOption: investor.dividendOption || "CASH",
    nomineeRelationship: nominee?.relationship || snapshot.nominee?.relationship || "",
    files: {
      nidFront: findDoc("NID_FRONT"),
      nidBack: findDoc("NID_BACK"),
      photo: findDoc("PHOTO"),
      signature: findDoc("SIGNATURE"),
      nomineeNidFront: findDoc("NOMINEE_NID_FRONT"),
      nomineeNidBack: findDoc("NOMINEE_NID_BACK"),
      nomineePhoto: findDoc("NOMINEE_PHOTO"),
      nomineeSignature: findDoc("NOMINEE_SIGNATURE"),
      tinCert: findDoc("TIN_CERT"),
      chequeLeafPhoto: findDoc("CHEQUE_LEAF_PHOTO"),
      boAcknowledgement: findDoc("BO_ACKNOWLEDGEMENT"),
    },
  });
}
