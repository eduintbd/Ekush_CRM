import { getSession } from "@/lib/auth";
import { prisma, withRetry } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatBDT } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortfolioStatementPage() {
  let session;
  try { session = await getSession(); } catch { redirect("/login"); }
  if (!session) redirect("/login");

  let investor: any = null;
  let holdings: any[] = [];

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

    holdings = await withRetry(() => prisma.fundHolding.findMany({
      where: { investorId },
      include: { fund: true },
    }));
  } catch (err) {
    console.error("Portfolio statement error:", err);
    return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Could not load data. Please refresh.</div>;
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const GREY_BG = "#f0f0f0";

  // Compute totals
  let totalCost = 0;
  let totalMarket = 0;
  let totalGain = 0;

  const rows = holdings.map((h) => {
    const units = Number(h.totalCurrentUnits);
    const avgCost = Number(h.avgCost);
    const nav = Number(h.fund.currentNav);
    const costValue = Number(h.totalCostValueCurrent);
    const marketValue = units * nav;
    const gain = marketValue - costValue;
    const returnPct = Number(h.annualizedReturn) || (costValue > 0 ? (gain / costValue) * 100 : 0);
    totalCost += costValue;
    totalMarket += marketValue;
    totalGain += gain;
    return { code: h.fund.code, name: h.fund.name, units, avgCost, nav, costValue, marketValue, gain, returnPct };
  });

  const totalReturn = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;} .no-print{display:none!important;} .print-page{width:210mm;min-height:297mm;padding:0;margin:0;box-shadow:none!important;} }
        @page { size: A4 portrait; margin: 0; }
      `}} />

      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 50, display: "flex", gap: 8 }}>
        <button id="print-btn" style={{ padding: "8px 16px", background: "#F27023", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save as PDF / Print</button>
        <a href="/statements" style={{ padding: "8px 16px", background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, textDecoration: "none" }}>Back</a>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `document.getElementById('print-btn').addEventListener('click',function(){window.print()});` }} />

      <div className="print-page" style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", background: "#fff", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "11pt", color: "#000", lineHeight: "1.5", position: "relative" }}>

        {/* Banner */}
        <img src="/banner_for_portfolio.png" alt="" style={{ width: "100%", display: "block" }} />

        {/* Content */}
        <div style={{ padding: "8mm 22mm 20mm 22mm" }}>

          {/* Date */}
          <p style={{ fontSize: "11pt", marginBottom: "6mm" }}>{dateStr}</p>

          {/* Investor */}
          <p style={{ fontSize: "12pt", fontWeight: 700, margin: "0 0 1mm 0" }}>{investor.name}</p>
          <p style={{ fontSize: "11pt", marginBottom: "6mm" }}>Investor Code: {investor.investorCode}</p>

          {/* Title */}
          <p style={{ fontSize: "14pt", fontWeight: 700, marginBottom: "4mm" }}>Portfolio Statement</p>

          {/* Holdings table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6mm", fontSize: "9.5pt" }}>
            <thead>
              <tr>
                <th style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", textAlign: "left", fontWeight: 700, background: GREY_BG }}>Fund</th>
                <th style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", textAlign: "right", fontWeight: 700, background: GREY_BG }}>Units</th>
                <th style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", textAlign: "right", fontWeight: 700, background: GREY_BG }}>Avg Cost</th>
                <th style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", textAlign: "right", fontWeight: 700, background: GREY_BG }}>NAV</th>
                <th style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", textAlign: "right", fontWeight: 700, background: GREY_BG }}>Cost Value</th>
                <th style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", textAlign: "right", fontWeight: 700, background: GREY_BG }}>Market Value</th>
                <th style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", textAlign: "right", fontWeight: 700, background: GREY_BG }}>Gain/Loss</th>
                <th style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", textAlign: "right", fontWeight: 700, background: GREY_BG }}>Return</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <td style={{ borderBottom: "1px solid #ccc", padding: "5px 6px", fontWeight: 700 }}>{r.code}</td>
                  <td style={{ borderBottom: "1px solid #ccc", padding: "5px 6px", textAlign: "right" }}>{r.units.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  <td style={{ borderBottom: "1px solid #ccc", padding: "5px 6px", textAlign: "right" }}>{r.avgCost.toFixed(4)}</td>
                  <td style={{ borderBottom: "1px solid #ccc", padding: "5px 6px", textAlign: "right" }}>{r.nav.toFixed(4)}</td>
                  <td style={{ borderBottom: "1px solid #ccc", padding: "5px 6px", textAlign: "right" }}>{fmt(r.costValue)}</td>
                  <td style={{ borderBottom: "1px solid #ccc", padding: "5px 6px", textAlign: "right" }}>{fmt(r.marketValue)}</td>
                  <td style={{ borderBottom: "1px solid #ccc", padding: "5px 6px", textAlign: "right" }}>{fmt(r.gain)}</td>
                  <td style={{ borderBottom: "1px solid #ccc", padding: "5px 6px", textAlign: "right" }}>{r.returnPct >= 0 ? "+" : ""}{r.returnPct.toFixed(2)}%</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700 }}>
                <td style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", background: GREY_BG }}>TOTAL</td>
                <td style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", background: GREY_BG }} colSpan={3}></td>
                <td style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", textAlign: "right", background: GREY_BG }}>{fmt(totalCost)}</td>
                <td style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", textAlign: "right", background: GREY_BG }}>{fmt(totalMarket)}</td>
                <td style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", textAlign: "right", background: GREY_BG }}>{fmt(totalGain)}</td>
                <td style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "5px 6px", textAlign: "right", background: GREY_BG }}>{totalReturn.toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>

          {/* Disclaimer */}
          <p style={{ fontSize: "8pt", color: "#888", marginTop: "8mm" }}>
            This is a computer-generated statement. NAV values are as of the statement date.<br />
            Past performance does not guarantee future results. Investments are subject to market risk.<br />
            Ekush Wealth Management Ltd | www.ekushwml.com
          </p>
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
