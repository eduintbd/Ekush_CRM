import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const investors = await prisma.investor.findMany({
    where: { user: { status: { not: "PENDING" } } },
    include: {
      user: { select: { email: true, phone: true } },
      bankAccounts: {
        select: {
          bankName: true,
          branchName: true,
          accountNumber: true,
          routingNumber: true,
          isPrimary: true,
        },
      },
      nominees: {
        select: { name: true, relationship: true, share: true, nidNumber: true },
      },
    },
    orderBy: { investorCode: "asc" },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Ekush WML Admin";
  wb.created = new Date();
  const ws = wb.addWorksheet("Investors");

  ws.columns = [
    { header: "Code", key: "code", width: 10 },
    { header: "Name", key: "name", width: 32 },
    { header: "Contact", key: "contact", width: 30 },
    { header: "Mobile", key: "mobile", width: 18 },
    { header: "Father's Name", key: "father", width: 28 },
    { header: "Mother's Name", key: "mother", width: 28 },
    { header: "NID", key: "nid", width: 22 },
    { header: "Nominee", key: "nominee", width: 40 },
    { header: "ETIN", key: "etin", width: 18 },
    { header: "Present Address", key: "address", width: 50 },
    { header: "BO No.", key: "bo", width: 22 },
    { header: "Email", key: "email", width: 30 },
    { header: "Bank Details", key: "bank", width: 60 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle" };

  for (const inv of investors) {
    const nomineeText = inv.nominees
      .map((n) => {
        const parts = [n.name];
        if (n.relationship) parts.push(`(${n.relationship})`);
        if (n.share) parts.push(`${n.share}%`);
        if (n.nidNumber) parts.push(`NID ${n.nidNumber}`);
        return parts.join(" ");
      })
      .join("; ");

    const sortedBanks = [...inv.bankAccounts].sort(
      (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
    );
    const bankText = sortedBanks
      .map((b) => {
        const parts = [b.bankName];
        if (b.branchName) parts.push(b.branchName);
        parts.push(`A/C ${b.accountNumber}`);
        if (b.routingNumber) parts.push(`Routing ${b.routingNumber}`);
        if (b.isPrimary) parts.push("(Primary)");
        return parts.join(", ");
      })
      .join(" | ");

    ws.addRow({
      code: inv.investorCode,
      name: inv.name,
      contact: inv.user.email || inv.user.phone || "",
      mobile: inv.user.phone || "",
      father: inv.fatherName || "",
      mother: inv.motherName || "",
      nid: inv.nidNumber || "",
      nominee: nomineeText,
      etin: inv.tinNumber || "",
      address: inv.address || "",
      bo: inv.boId || "",
      email: inv.user.email || "",
      bank: bankText,
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="investors-${stamp}.xlsx"`,
    },
  });
}
