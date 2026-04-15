import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const FUND_REG: Record<string, { regNo: string }> = {
  EFUF: { regNo: "BSEC/Mutual Fund/2019/106" },
  EGF: { regNo: "BSEC/Mutual Fund/2022/129" },
  ESRF: { regNo: "BSEC/Mutual Fund/2022/130" },
};

export default async function InvestmentUpdatePage({
  searchParams,
}: {
  searchParams: { fundCode?: string };
}) {
  let session;
  try { session = await getSession(); } catch { redirect("/login"); }
  if (!session) redirect("/login");

  let investor: any = null;
  let holding: any = null;
  let fund: any = null;
  let dividendTotal = 0;

  try {
    const userId = (session.user as any)?.id;
    let investorId = (session.user as any)?.investorId;
    if (!investorId && userId) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { investor: { select: { id: true } } } });
      investorId = u?.investor?.id;
    }
    if (!investorId) redirect("/dashboard");

    investor = await prisma.investor.findUnique({ where: { id: investorId } });
    if (!investor) redirect("/dashboard");

    const fundCode = searchParams.fundCode || "EFUF";
    fund = await prisma.fund.findUnique({ where: { code: fundCode } });
    if (!fund) redirect("/statements");

    holding = await prisma.fundHolding.findUnique({
      where: { investorId_fundId: { investorId, fundId: fund.id } },
    });

    // Sum all dividends for this fund
    const divAgg = await prisma.dividend.aggregate({
      where: { investorId, fundId: fund.id },
      _sum: { grossDividend: true },
    });
    dividendTotal = Number(divAgg._sum.grossDividend || 0);
  } catch (err) {
    console.error("Investment Update error:", err);
    return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Could not load data. Please refresh.</div>;
  }

  if (!holding || !fund) {
    return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>No holdings found for this fund.</div>;
  }

  const fundCode = fund.code as string;
  const regInfo = FUND_REG[fundCode] || FUND_REG.EFUF;
  const totalUnits = Number(holding.totalCurrentUnits);
  const avgCost = Number(holding.avgCost);
  const costValue = Number(holding.totalCostValueCurrent);
  const nav = Number(fund.currentNav);
  const marketValue = totalUnits * nav;
  const realizedGain = Number(holding.totalRealizedGain);
  const unrealizedGain = marketValue - costValue;
  const totalValueCreation = realizedGain + dividendTotal + unrealizedGain;
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;} .no-print{display:none!important;} .print-page{width:210mm;min-height:297mm;padding:20mm 22mm;margin:0;box-shadow:none!important;} }
        @page { size: A4 portrait; margin: 0; }
      `}} />

      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 50, display: "flex", gap: 8 }}>
        <button id="print-btn" style={{ padding: "8px 16px", background: "#F27023", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save as PDF / Print</button>
        <a href="/statements" style={{ padding: "8px 16px", background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, textDecoration: "none" }}>Back</a>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `document.getElementById('print-btn').addEventListener('click',function(){window.print()});` }} />

      <div className="print-page" style={{ width: "210mm", minHeight: "297mm", padding: "20mm 22mm", margin: "0 auto", background: "#fff", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "11pt", color: "#000", lineHeight: "1.5", position: "relative" }}>

        {/* Orange banner + Logo (top right) */}
        <div style={{ position: "absolute", top: 0, right: 0 }}>
          <img src="/logo.png" alt="Ekush" style={{ height: "28mm" }} />
        </div>

        {/* Orange top line */}
        <div style={{ borderTop: "4px solid #F27023", marginBottom: "15mm", width: "60%" }} />

        {/* Date */}
        <p style={{ fontSize: "11pt", marginBottom: "12mm" }}>{dateStr}</p>

        {/* Investor name */}
        <p style={{ fontSize: "12pt", fontWeight: 700, margin: "0 0 1mm 0" }}>{investor.name}</p>
        <p style={{ fontSize: "11pt", marginBottom: "10mm" }}>Investor Code: {investor.investorCode}</p>

        {/* Fund box */}
        <div style={{ border: "1px solid #ccc", padding: "6mm 8mm", marginBottom: "6mm" }}>
          <h2 style={{ fontSize: "14pt", fontWeight: 700, textAlign: "center", marginBottom: "4mm" }}>{fund.name.toUpperCase()}</h2>
          <p style={{ fontSize: "10pt", textAlign: "center", color: "#444", marginBottom: "6mm" }}>
            Registered under the Bangladesh Securities &amp; Exchange Commission<br />(Mutual Fund) Rules, 2001.
          </p>
          <table style={{ width: "85%", margin: "0 auto", fontSize: "10pt", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Registration No", regInfo.regNo],
                ["Sponsor", "Ekush Wealth Management Limited"],
                ["Asset Manager", "Ekush Wealth Management Limited"],
                ["Trustee", "Sandhani Life Insurance Co. Ltd"],
                ["Custodian", "BRAC Bank Limited"],
              ].map(([label, val], i) => (
                <tr key={i}>
                  <td style={{ padding: "2px 0", fontWeight: 600, width: "35%" }}>{label}</td>
                  <td style={{ padding: "2px 8px", width: "5%" }}>:</td>
                  <td style={{ padding: "2px 0" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Units + Avg Cost row */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4mm" }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #ccc", padding: "6px 10px", fontWeight: 700, width: "25%", background: "#f5f5f5" }}>Number of Units</td>
              <td style={{ border: "1px solid #ccc", padding: "6px 10px", width: "25%", textAlign: "right" }}>{totalUnits.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
              <td style={{ border: "1px solid #ccc", padding: "6px 10px", fontWeight: 700, width: "25%", background: "#f5f5f5" }}>Average Cost/Unit</td>
              <td style={{ border: "1px solid #ccc", padding: "6px 10px", width: "25%", textAlign: "right" }}>{avgCost.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>

        {/* Investment Results */}
        <p style={{ fontSize: "11pt", fontWeight: 700, marginBottom: "3mm" }}>Investment Results:</p>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10mm" }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #ccc", padding: "5px 10px", width: "25%" }}>Cost Value of Investment</td>
              <td style={{ border: "1px solid #ccc", padding: "5px 10px", width: "25%", textAlign: "right" }}>{fmt(costValue)}</td>
              <td style={{ border: "1px solid #ccc", padding: "5px 10px", width: "25%" }}>Capital Gain on Unit Sold</td>
              <td style={{ border: "1px solid #ccc", padding: "5px 10px", width: "25%", textAlign: "right" }}>{fmt(realizedGain)}</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #ccc", padding: "5px 10px" }}>Wealth increased by</td>
              <td style={{ border: "1px solid #ccc", padding: "5px 10px", textAlign: "right" }}>{fmt(unrealizedGain)}</td>
              <td style={{ border: "1px solid #ccc", padding: "5px 10px" }}>Dividend Received</td>
              <td style={{ border: "1px solid #ccc", padding: "5px 10px", textAlign: "right" }}>{fmt(dividendTotal)}</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #ccc", padding: "5px 10px" }}>Current Value of Investment</td>
              <td style={{ border: "1px solid #ccc", padding: "5px 10px", textAlign: "right" }}>{fmt(marketValue)}</td>
              <td style={{ border: "1px solid #ccc", padding: "5px 10px", fontStyle: "italic" }}>Total Value Creation</td>
              <td style={{ border: "1px solid #ccc", padding: "5px 10px", textAlign: "right", fontStyle: "italic" }}>{fmt(totalValueCreation)}</td>
            </tr>
          </tbody>
        </table>

        {/* NAV section */}
        <p style={{ fontSize: "11pt", marginBottom: "4mm" }}>
          The current Net Asset Value (NAV) per unit, together with the applicable buy and sale prices of the fund, is presented below:
        </p>
        <table style={{ width: "80%", borderCollapse: "collapse", margin: "0 auto" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <td style={{ border: "1px solid #ccc", padding: "6px 10px", textAlign: "center", fontWeight: 700 }}>NAV</td>
              <td style={{ border: "1px solid #ccc", padding: "6px 10px", textAlign: "center", fontWeight: 700 }}>Buy Price</td>
              <td style={{ border: "1px solid #ccc", padding: "6px 10px", textAlign: "center", fontWeight: 700 }}>Sale Price</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #ccc", padding: "6px 10px", textAlign: "center" }}>{nav.toFixed(3)}</td>
              <td style={{ border: "1px solid #ccc", padding: "6px 10px", textAlign: "center" }}>{(nav * (1 + Number(fund.entryLoad))).toFixed(3)}</td>
              <td style={{ border: "1px solid #ccc", padding: "6px 10px", textAlign: "center" }}>{(nav * (1 - Number(fund.exitLoad))).toFixed(3)}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
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
