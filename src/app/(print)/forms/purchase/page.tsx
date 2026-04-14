import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PurchaseFormPage({
  searchParams,
}: {
  searchParams: {
    fundName?: string;
    amount?: string;
    units?: string;
    nav?: string;
    payment?: string;
  };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const investorId = (session.user as any)?.investorId;
  if (!investorId) redirect("/dashboard");

  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    include: {
      bankAccounts: { where: { isPrimary: true }, take: 1 },
    },
  });

  if (!investor) redirect("/dashboard");

  const fundName = searchParams.fundName || "";
  const amountNum = parseFloat(searchParams.amount || "0");
  const unitsNum = parseInt(searchParams.units || "0");
  const navNum = parseFloat(searchParams.nav || "0");
  const paymentMethod = searchParams.payment || "Bank Transfer";
  const bank = investor.bankAccounts[0];

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = String(today.getFullYear());
  const dateDigits = (dd + mm + yyyy).split("");

  const isOnline = /transfer|online/i.test(paymentMethod);
  const isCheque = /cheque|pay.?order/i.test(paymentMethod);
  const isCash = /cash/i.test(paymentMethod);

  return (
    <>
      {/* Print-only styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              .print-page { width: 210mm; min-height: 297mm; padding: 14mm 18mm; margin: 0; box-shadow: none !important; }
            }
            @page { size: A4 portrait; margin: 0; }
          `,
        }}
      />

      {/* Print button */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => {}}
          className="px-4 py-2 bg-ekush-orange text-white rounded-md text-sm font-medium shadow-lg hover:bg-ekush-orange-dark"
          id="print-btn"
        >
          Save as PDF / Print
        </button>
        <a
          href="/transactions/buy"
          className="px-4 py-2 bg-white text-text-dark rounded-md text-sm font-medium shadow-lg border hover:bg-gray-50"
        >
          Back
        </a>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById('print-btn').onclick = function() { window.print(); };`,
        }}
      />

      {/* ─── A4 Page ───────────────────────────────────────────────── */}
      <div className="print-page mx-auto bg-white shadow-2xl" style={{ width: "210mm", minHeight: "297mm", padding: "14mm 18mm", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>

        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1">
            <h1 style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.3px", color: "#000", lineHeight: 1.1 }}>
              INVESTOR&apos;S PURCHASE FORM
            </h1>
            <p style={{ fontSize: "11px", color: "#666", marginTop: "4px", fontWeight: 500, letterSpacing: "0.5px" }}>
              ASSET MANAGER: EKUSH WEALTH MANAGEMENT LIMITED
            </p>
          </div>
          <div className="shrink-0" style={{ marginTop: "-4px" }}>
            <img src="/logo.png" alt="Ekush" style={{ height: "52px" }} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderBottom: "1.5px solid #ccc", marginBottom: "12px" }} />

        {/* Fund Name + Date */}
        <div className="flex gap-3" style={{ marginBottom: "10px" }}>
          <div className="flex-1" style={{ background: "#d8edbb", border: "1px solid #b8d4a0", padding: "6px 10px", minHeight: "44px" }}>
            <div style={{ fontSize: "8px", color: "#777", marginBottom: "3px" }}>Name of the Fund</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#000" }}>{fundName}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span style={{ fontSize: "10px", color: "#777", fontWeight: 500 }}>Date</span>
            <div className="flex gap-0.5">
              {dateDigits.map((d, i) => (
                <div
                  key={i}
                  style={{
                    width: "22px",
                    height: "28px",
                    border: "1px solid #bbb",
                    background: "#f7f7f7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#000",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Investor Code */}
        <div style={{ background: "#d8edbb", border: "1px solid #b8d4a0", padding: "6px 10px", minHeight: "40px", marginBottom: "8px" }}>
          <div style={{ fontSize: "8px", color: "#777", marginBottom: "2px" }}>Investor Code</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#000" }}>{investor.investorCode}</div>
        </div>

        {/* Investor Name */}
        <div style={{ background: "#d8edbb", border: "1px solid #b8d4a0", padding: "6px 10px", minHeight: "40px", marginBottom: "20px" }}>
          <div style={{ fontSize: "8px", color: "#777", marginBottom: "2px" }}>Investor Name</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#000" }}>{investor.name}</div>
        </div>

        {/* CONFIRMATION OF UNIT ALLOCATION */}
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <div style={{ display: "inline-block", borderBottom: "1.5px solid #000", paddingBottom: "2px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.5px" }}>
              CONFIRMATION OF UNIT ALLOCATION
            </span>
          </div>
        </div>

        {/* Allocation Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
          <tbody>
            {[
              {
                label: "Investment Amount",
                value: amountNum.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
                words: numberToWords(amountNum),
              },
              {
                label: "Cost Price Per Unit",
                value: navNum.toFixed(4),
                words: numberToWords(Math.round(navNum)) + " (per unit)",
              },
              {
                label: "Number of Allotted Units",
                value: unitsNum.toLocaleString("en-IN"),
                words: numberToWords(unitsNum),
              },
            ].map((row, i) => (
              <tr key={i}>
                <td
                  style={{
                    background: "#d8edbb",
                    border: "1px solid #b8d4a0",
                    padding: "10px 10px",
                    fontWeight: 700,
                    fontSize: "11px",
                    width: "155px",
                    verticalAlign: "middle",
                  }}
                >
                  {row.label}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "10px 10px",
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: "12px",
                    width: "100px",
                    verticalAlign: "middle",
                  }}
                >
                  {row.value}
                </td>
                <td
                  style={{
                    background: "#d8edbb",
                    border: "1px solid #b8d4a0",
                    padding: "10px 6px",
                    fontSize: "9px",
                    color: "#666",
                    width: "50px",
                    verticalAlign: "middle",
                    textAlign: "center",
                  }}
                >
                  In Words
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "10px 10px",
                    fontSize: "11px",
                    fontStyle: "italic",
                    verticalAlign: "middle",
                  }}
                >
                  {row.words}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mode of Transaction */}
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <div style={{ display: "inline-block", borderBottom: "1.5px solid #000", paddingBottom: "2px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700 }}>Mode of Transaction</span>
          </div>
        </div>

        <div className="flex justify-between" style={{ marginBottom: "12px", padding: "0 20px" }}>
          {[
            { label: "Online Transfer", checked: isOnline },
            { label: "Cheque/Pay Order", checked: isCheque },
            { label: "Cash", checked: isCash },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  border: "1.5px solid #999",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: item.checked ? "#0a8a0a" : "transparent",
                  background: item.checked ? "#e8f5e9" : "#fff",
                }}
              >
                X
              </div>
              <span style={{ fontSize: "11px" }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Bank fields */}
        {[
          { label: "Bank Name", value: bank?.bankName || "" },
          { label: "Branch Name", value: bank?.branchName || "" },
          { label: "Routing Number", value: bank?.routingNumber || "" },
          { label: "Cheque Number/Pay Order Number (if any)", value: "" },
          { label: "Remarks (if any)", value: "" },
        ].map((field, i) => (
          <div
            key={i}
            style={{
              background: "#d8edbb",
              border: "1px solid #b8d4a0",
              padding: "5px 10px",
              minHeight: "36px",
              marginBottom: "6px",
            }}
          >
            <div style={{ fontSize: "8px", color: "#777", marginBottom: "1px" }}>{field.label}</div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#000", minHeight: "14px" }}>{field.value}</div>
          </div>
        ))}

        {/* Spacer for signatures */}
        <div style={{ height: "40px" }} />

        {/* Signatures */}
        <div className="flex justify-between" style={{ padding: "0 4px" }}>
          {["Principal Signatory", "Secondary Signatory", "Additional Signatory (if any)"].map(
            (label, i) => (
              <div key={i} style={{ width: "30%", textAlign: "center" }}>
                <div style={{ borderTop: "1.5px solid #000", paddingTop: "4px" }}>
                  <span style={{ fontSize: "9px", color: "#777" }}>{label}</span>
                </div>
              </div>
            )
          )}
        </div>

        {/* Verifier box */}
        <div
          style={{
            border: "1px solid #000",
            marginTop: "14px",
            padding: "0",
          }}
        >
          <div className="flex">
            <div className="flex-1" style={{ padding: "6px 10px", borderRight: "1px solid #000" }}>
              <div style={{ fontSize: "8px", color: "#777", marginBottom: "10px" }}>Verifier Name</div>
              <div style={{ borderTop: "1px solid #ccc", paddingTop: "6px" }}>
                <span style={{ fontSize: "8px", color: "#777" }}>Designation</span>
              </div>
            </div>
            <div style={{ width: "100px", padding: "6px 10px" }}>
              <div style={{ fontSize: "8px", color: "#777", textAlign: "right" }}>Signature</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const intPart = Math.floor(Math.abs(n));
  if (intPart === 0) return "Zero";

  let remaining = intPart;
  const groups: number[] = [];
  groups.push(remaining % 1000);
  remaining = Math.floor(remaining / 1000);
  while (remaining > 0) {
    groups.push(remaining % 100);
    remaining = Math.floor(remaining / 100);
  }

  const scales = ["", "Thousand", "Lakh", "Crore"];
  const parts: string[] = [];

  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    let part = "";
    if (g >= 100) {
      part += ones[Math.floor(g / 100)] + " Hundred ";
      const rem = g % 100;
      if (rem >= 20) {
        part += tens[Math.floor(rem / 10)] + " " + ones[rem % 10];
      } else if (rem > 0) {
        part += ones[rem];
      }
    } else if (g >= 20) {
      part += tens[Math.floor(g / 10)] + " " + ones[g % 10];
    } else {
      part += ones[g];
    }
    parts.push(part.trim() + (scales[i] ? " " + scales[i] : ""));
  }

  return parts.join(" ").replace(/\s+/g, " ").trim() + " Only";
}
