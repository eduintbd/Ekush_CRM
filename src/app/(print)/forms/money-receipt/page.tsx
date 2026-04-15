import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MoneyReceiptPage({
  searchParams,
}: {
  searchParams: { fund?: string; amount?: string; units?: string; nav?: string; receiptNo?: string; date?: string };
}) {
  let session;
  try { session = await getSession(); } catch { redirect("/login"); }
  if (!session) redirect("/login");

  let investor: any = null;
  try {
    const userId = (session.user as any)?.id;
    let investorId = (session.user as any)?.investorId;
    if (!investorId && userId) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { investor: { select: { id: true } } } });
      investorId = u?.investor?.id;
    }
    if (investorId) investor = await prisma.investor.findUnique({ where: { id: investorId } });
  } catch {}

  const fundName = searchParams.fund || "";
  const amount = searchParams.amount || "0";
  const units = searchParams.units || "0";
  const nav = searchParams.nav || "0";
  const receiptNo = searchParams.receiptNo || String(Date.now()).slice(-6);
  const today = new Date();
  const dateStr = searchParams.date || today.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const amountNum = parseFloat(amount);
  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Number to words
  function numberToWords(n: number): string {
    if (n === 0) return "Zero";
    const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
    const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
    const intPart = Math.floor(Math.abs(n));
    if (intPart === 0) return "Zero";
    let remaining = intPart;
    const groups: number[] = [];
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
    while (remaining > 0) { groups.push(remaining % 100); remaining = Math.floor(remaining / 100); }
    const scales = ["","Thousand","Lakh","Crore"];
    const parts: string[] = [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const g = groups[i];
      if (g === 0) continue;
      let part = "";
      if (g >= 100) { part += ones[Math.floor(g/100)] + " Hundred "; const rem = g%100; if (rem >= 20) { part += tens[Math.floor(rem/10)] + " " + ones[rem%10]; } else if (rem > 0) { part += ones[rem]; } }
      else if (g >= 20) { part += tens[Math.floor(g/10)] + " " + ones[g%10]; }
      else { part += ones[g]; }
      parts.push(part.trim() + (scales[i] ? " " + scales[i] : ""));
    }
    return parts.join(" ").replace(/\s+/g, " ").trim() + " Only";
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;} .no-print{display:none!important;} .print-page{width:210mm;min-height:148mm;padding:0;margin:0;box-shadow:none!important;} }
        @page { size: A5 landscape; margin: 0; }
      `}} />

      <div className="no-print" style={{ position:"fixed", top:16, right:16, zIndex:50, display:"flex", gap:8 }}>
        <button id="print-btn" style={{ padding:"8px 16px", background:"#F27023", color:"#fff", border:"none", borderRadius:6, fontSize:14, fontWeight:600, cursor:"pointer" }}>Save as PDF / Print</button>
        <a href="/transactions/buy" style={{ padding:"8px 16px", background:"#fff", color:"#333", border:"1px solid #ddd", borderRadius:6, fontSize:14, textDecoration:"none" }}>Back</a>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `document.getElementById('print-btn').addEventListener('click',function(){window.print()});` }} />

      <div className="print-page" style={{ width: "210mm", minHeight: "148mm", margin: "20px auto", background: "#fff", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "11pt", color: "#000", position: "relative", border: "2px solid #F27023", borderRadius: "8px", overflow: "hidden" }}>

        {/* Header bar */}
        <div style={{ background: "linear-gradient(135deg, #F27023, #e85d04)", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src="/logo.png" alt="Ekush" style={{ height: "60px" }} />
          </div>
          <div style={{ textAlign: "right", color: "#fff" }}>
            <p style={{ fontSize: "18pt", fontWeight: 800, margin: 0, letterSpacing: "1px" }}>MONEY RECEIPT</p>
            <p style={{ fontSize: "8pt", margin: 0 }}>Ekush Wealth Management Limited</p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "16px 24px" }}>

          {/* Receipt No + Date row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <div>
              <span style={{ fontSize: "10pt", color: "#666" }}>Receipt No: </span>
              <span style={{ fontSize: "12pt", fontWeight: 700 }}>{receiptNo}</span>
            </div>
            <div>
              <span style={{ fontSize: "10pt", color: "#666" }}>Date: </span>
              <span style={{ fontSize: "12pt", fontWeight: 700 }}>{dateStr}</span>
            </div>
          </div>

          {/* Main content */}
          <div style={{ fontSize: "11pt", lineHeight: "2", marginBottom: "10px" }}>
            <p style={{ margin: 0 }}>
              Received with thanks from <strong>{investor?.name || "Investor"}</strong> ({investor?.investorCode || "N/A"})
            </p>
            <p style={{ margin: 0 }}>
              a total payment of <strong>BDT {fmt(amountNum)}</strong>
            </p>
            <p style={{ margin: "0 0 4px 0", fontSize: "10pt", color: "#666" }}>
              (In words: {numberToWords(amountNum)} Taka)
            </p>
          </div>

          {/* Details table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: "12px" }}>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #ccc", padding: "6px 10px", background: "#f9f9f9", fontWeight: 600, width: "30%" }}>Fund</td>
                <td style={{ border: "1px solid #ccc", padding: "6px 10px" }}>{fundName}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #ccc", padding: "6px 10px", background: "#f9f9f9", fontWeight: 600 }}>Amount (BDT)</td>
                <td style={{ border: "1px solid #ccc", padding: "6px 10px" }}>{fmt(amountNum)}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #ccc", padding: "6px 10px", background: "#f9f9f9", fontWeight: 600 }}>NAV per Unit</td>
                <td style={{ border: "1px solid #ccc", padding: "6px 10px" }}>{parseFloat(nav).toFixed(4)}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #ccc", padding: "6px 10px", background: "#f9f9f9", fontWeight: 600 }}>Est. Units</td>
                <td style={{ border: "1px solid #ccc", padding: "6px 10px" }}>{parseInt(units).toLocaleString("en-IN")}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #ccc", padding: "6px 10px", background: "#f9f9f9", fontWeight: 600 }}>Payment Method</td>
                <td style={{ border: "1px solid #ccc", padding: "6px 10px" }}>Bank Transfer</td>
              </tr>
            </tbody>
          </table>

          {/* Signature area */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <div style={{ textAlign: "center", width: "40%" }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: "4px", marginTop: "20px" }}>
                <span style={{ fontSize: "9pt", color: "#666" }}>Authorized Signature</span>
              </div>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div style={{ padding: "0 24px 8px 24px" }}>
          <p style={{ fontSize: "7.5pt", color: "#666", fontStyle: "italic", margin: 0, lineHeight: "1.4" }}>
            Conditions apply: This receipt will be upon encashment of your payment. If any delay due to any unavoidable circumstances which is not in control of Ekush, this receipt will become invalid.
          </p>
        </div>

        {/* Bottom strip */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#F27023", color: "#fff", padding: "4px 20px", display: "flex", justifyContent: "space-between", fontSize: "7pt" }}>
          <span>+8801713-086101</span>
          <span>info@ekushwml.com</span>
          <span>www.ekushwml.com</span>
        </div>
      </div>
    </>
  );
}
