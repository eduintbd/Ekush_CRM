import { getSession } from "@/lib/auth";
import { prisma, withRetry } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DividendReportPage({
  searchParams,
}: {
  searchParams: { fund?: string; year?: string };
}) {
  let session;
  try { session = await getSession(); } catch { redirect("/login"); }
  if (!session) redirect("/login");

  let investor: any = null;
  let dividends: any[] = [];

  try {
    const userId = (session.user as any)?.id;
    let investorId = (session.user as any)?.investorId;
    if (!investorId && userId) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { investor: { select: { id: true } } } });
      investorId = u?.investor?.id;
    }
    if (!investorId) redirect("/dashboard");

    investor = await withRetry(() => prisma.investor.findUnique({ where: { id: investorId } }));
    if (!investor) redirect("/dashboard");

    const where: any = { investorId };
    if (searchParams.fund) {
      const fund = await prisma.fund.findUnique({ where: { code: searchParams.fund } });
      if (fund) where.fundId = fund.id;
    }
    if (searchParams.year) where.accountingYear = searchParams.year;

    dividends = await withRetry(() => prisma.dividend.findMany({
      where,
      include: { fund: { select: { code: true } } },
      orderBy: { paymentDate: "desc" },
    }));
  } catch (err) {
    console.error("Dividend report error:", err);
    return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Could not load data. Please refresh.</div>;
  }

  const fmt = (n: number) => n === 0 ? "-" : Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const totalGross = dividends.reduce((s, d) => s + Number(d.grossDividend), 0);
  const totalTax = dividends.reduce((s, d) => s + Number(d.taxAmount), 0);
  const totalNet = dividends.reduce((s, d) => s + Number(d.netDividend), 0);

  const filterLabel = [
    searchParams.fund ? `Fund: ${searchParams.fund}` : "All funds",
    searchParams.year ? `Year: ${searchParams.year}` : "All years",
  ].join(" | ");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;} .no-print{display:none!important;} .print-page{width:210mm;min-height:297mm;padding:0;margin:0;box-shadow:none!important;} }
        @page { size: A4 portrait; margin: 0; }
      `}} />

      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 50, display: "flex", gap: 8 }}>
        <button id="print-btn" style={{ padding: "8px 16px", background: "#F27023", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save as PDF / Print</button>
        <a href="/dividends" style={{ padding: "8px 16px", background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, textDecoration: "none" }}>Back</a>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `document.getElementById('print-btn').addEventListener('click',function(){window.print()});` }} />

      <div className="print-page" style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", background: "#fff", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "10pt", color: "#000", lineHeight: "1.5", position: "relative" }}>

        {/* Banner */}
        <img src="/banner_for_portfolio.png" alt="" style={{ width: "100%", display: "block" }} />

        <div style={{ padding: "6mm 20mm 20mm 20mm" }}>

          {/* Title */}
          <h1 style={{ fontSize: "16pt", fontWeight: 700, marginBottom: "2mm" }}>Dividend Report</h1>
          <p style={{ fontSize: "9pt", color: "#666", marginBottom: "6mm" }}>Generated: {dateStr} | {filterLabel}</p>

          {/* Investor details */}
          <div style={{ marginBottom: "6mm" }}>
            <p style={{ fontWeight: 700, marginBottom: "1mm" }}>Investor Details</p>
            <p style={{ fontSize: "10pt" }}>Name: {investor.name}</p>
            <p style={{ fontSize: "10pt" }}>Code: {investor.investorCode}</p>
            <p style={{ fontSize: "10pt" }}>Type: {investor.investorType}</p>
          </div>

          {/* Dividend table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt", marginBottom: "6mm" }}>
            <thead>
              <tr style={{ background: "#333", color: "#fff" }}>
                {["Year", "Fund", "Payment Date", "Units", "DPU", "Gross (BDT)", "Tax (BDT)", "Net (BDT)", "Option"].map((h, i) => (
                  <td key={i} style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: 700, textAlign: i >= 3 ? "right" : "left" }}>{h}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {dividends.map((d, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{d.accountingYear || "—"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", fontWeight: 600 }}>{d.fund.code}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>
                    {d.paymentDate ? new Date(d.paymentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "right" }}>{Number(d.totalUnits).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "right" }}>{Number(d.dividendPerUnit).toFixed(2)}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "right" }}>{fmt(Number(d.grossDividend))}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "right" }}>{fmt(Number(d.taxAmount))}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "right", fontWeight: 600 }}>{fmt(Number(d.netDividend))}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{d.dividendOption}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ background: "#f0f0f0", fontWeight: 700 }}>
                <td colSpan={5} style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>TOTAL</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>{fmt(totalGross)}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>{fmt(totalTax)}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>{fmt(totalNet)}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px" }}></td>
              </tr>
            </tbody>
          </table>

          {/* Footer note */}
          <p style={{ fontSize: "8pt", color: "#999" }}>Total {dividends.length} dividend entry(ies).</p>
          <p style={{ fontSize: "8pt", color: "#999" }}>Ekush Wealth Management Ltd | www.ekushwml.com</p>
        </div>

        {/* Orange footer */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#F27023", color: "#fff", padding: "3mm 6mm", display: "flex", justifyContent: "space-between", fontSize: "8pt" }}>
          <span>+8801713-086101</span>
          <span>info@ekushwml.com</span>
          <span>Apt-A3, House: 17, Road: 01, Block: A, Niketon, Gulshan 01, Dhaka-1212</span>
          <span>www.ekushwml.com</span>
        </div>
      </div>
    </>
  );
}
