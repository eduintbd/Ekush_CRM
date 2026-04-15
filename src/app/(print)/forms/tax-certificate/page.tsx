import { getSession } from "@/lib/auth";
import { prisma, withRetry } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const FUND_REG: Record<string, { regNo: string }> = {
  EFUF: { regNo: "BSEC/Mutual Fund/2019/106" },
  EGF: { regNo: "BSEC/Mutual Fund/2022/129" },
  ESRF: { regNo: "BSEC/Mutual Fund/2022/130" },
};

export default async function TaxCertificatePrintPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  let session;
  try { session = await getSession(); } catch { redirect("/login"); }
  if (!session) redirect("/login");

  const certId = searchParams.id;
  if (!certId) return <div style={{ padding: 40, textAlign: "center" }}>No certificate ID provided.</div>;

  let cert: any = null;
  let investor: any = null;

  try {
    cert = await withRetry(() => prisma.taxCertificate.findUnique({
      where: { id: certId },
      include: { fund: true, investor: true },
    }));
    if (!cert) return <div style={{ padding: 40, textAlign: "center" }}>Certificate not found.</div>;
    investor = cert.investor;
  } catch (err) {
    console.error("Tax cert error:", err);
    return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Could not load data. Please refresh.</div>;
  }

  const fund = cert.fund;
  const regInfo = FUND_REG[fund.code] || FUND_REG.EFUF;
  const fmt = (n: number) => n === 0 ? "-" : Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const periodStart = cert.periodStart ? new Date(cert.periodStart) : null;
  const periodEnd = cert.periodEnd ? new Date(cert.periodEnd) : null;
  const fmtDateShort = (d: Date | null) => d ? d.toLocaleDateString("en-GB", { month: "long", day: "2-digit", year: "numeric" }) : "N/A";

  const today = new Date();
  const issueDate = `1st July ${periodEnd ? periodEnd.getFullYear() : today.getFullYear()}`;

  const title = investor.title || "Mr./Ms.";

  const GREY_BG = "#f0f0f0";
  const YELLOW_BG = "#fffde7";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;} .no-print{display:none!important;} .print-page{width:210mm;min-height:297mm;padding:0;margin:0;box-shadow:none!important;} }
        @page { size: A4 portrait; margin: 0; }
        .cert-table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 4mm; }
        .cert-table td { border: 1px solid #000; padding: 3px 8px; }
        .cert-table .label { font-weight: 700; width: 35%; background: #fff; }
        .cert-table .value { text-align: right; background: ${YELLOW_BG}; }
      `}} />

      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 50, display: "flex", gap: 8 }}>
        <button id="print-btn" style={{ padding: "8px 16px", background: "#F27023", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save as PDF / Print</button>
        <a href="/tax-certificate" style={{ padding: "8px 16px", background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, textDecoration: "none" }}>Back</a>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `document.getElementById('print-btn').addEventListener('click',function(){window.print()});` }} />

      <div className="print-page" style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", background: "#fff", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "11pt", color: "#000", lineHeight: "1.5", position: "relative" }}>

        {/* Banner */}
        <img src="/banner_for_portfolio.png" alt="" style={{ width: "100%", display: "block" }} />

        <div style={{ padding: "6mm 20mm 20mm 20mm" }}>

          {/* Date */}
          <p style={{ fontWeight: 700, marginBottom: "4mm" }}>{issueDate}</p>

          {/* Investor */}
          <p style={{ fontWeight: 700, marginBottom: "0" }}>{title} {investor.name}</p>
          <p style={{ fontSize: "10pt", marginBottom: "0" }}>National ID: {investor.nidNumber || "N/A"}</p>
          <p style={{ fontSize: "10pt", marginBottom: "6mm" }}>TIN: {investor.tinNumber || "N/A"}</p>

          {/* Fund info box */}
          <div style={{ border: "1px solid #999", padding: "4mm 6mm", marginBottom: "5mm", background: GREY_BG }}>
            <h2 style={{ fontSize: "12pt", fontWeight: 700, textAlign: "center", marginBottom: "2mm" }}>{fund.name.toUpperCase()}</h2>
            <p style={{ fontSize: "9pt", textAlign: "center", color: "#444", marginBottom: "3mm" }}>
              Registered under the Bangladesh Securities &amp; Exchange Commission (Mutual Fund) Rules, 2001.
            </p>
            <table style={{ width: "80%", margin: "0 auto", fontSize: "9.5pt", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Registration No", regInfo.regNo],
                  ["Sponsor", "Ekush Wealth Management Limited"],
                  ["Asset Manager", "Ekush Wealth Management Limited"],
                  ["Trustee", "Sandhani Life Insurance Co. Ltd"],
                  ["Custodian", "BRAC Bank Limited"],
                ].map(([label, val], i) => (
                  <tr key={i}>
                    <td style={{ padding: "1px 0", fontWeight: 600, width: "35%" }}>{label}</td>
                    <td style={{ padding: "1px 6px", width: "5%" }}>:</td>
                    <td style={{ padding: "1px 0" }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* To Whom It May Concern */}
          <h3 style={{ fontSize: "13pt", fontWeight: 700, textAlign: "center", marginBottom: "3mm" }}>To Whom It May Concern</h3>
          <p style={{ fontSize: "10pt", textAlign: "justify", marginBottom: "4mm" }}>
            This is to certify <strong>{title} {investor.name}</strong> is a registered unit holder of <strong>{fund.name}</strong>.
            His/Her detailed information regarding investment in the fund is given below:
          </p>

          {/* Investment Period + Code */}
          <table style={{ fontSize: "10pt", marginBottom: "4mm" }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600, paddingRight: "8px" }}>Investment Period</td>
                <td style={{ paddingRight: "8px" }}>:</td>
                <td style={{ fontWeight: 700 }}>{fmtDateShort(periodStart)} to {fmtDateShort(periodEnd)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, paddingRight: "8px" }}>Investor Code</td>
                <td style={{ paddingRight: "8px" }}>:</td>
                <td style={{ fontWeight: 700 }}>{investor.investorCode}</td>
              </tr>
            </tbody>
          </table>

          {/* Main data table — merged Beginning/End + one-liner During */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: "4mm" }}>
            <thead>
              <tr style={{ background: "#333", color: "#fff" }}>
                <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: 700 }}>Particulars</td>
                <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: 700, textAlign: "right" }}>Beginning of Period</td>
                <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: 700, textAlign: "right" }}>End of Period</td>
              </tr>
            </thead>
            <tbody>
              {/* Cost Value */}
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px 8px" }}>Cost Value</td>
                <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", background: YELLOW_BG }}>{fmt(Number(cert.beginningCostValue))}</td>
                <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", background: YELLOW_BG }}>{fmt(Number(cert.endingCostValue))}</td>
              </tr>
              {/* Market Value */}
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px 8px" }}>Market Value</td>
                <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", background: YELLOW_BG }}>{fmt(Number(cert.beginningMarketValue))}</td>
                <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", background: YELLOW_BG }}>{fmt(Number(cert.endingMarketValue))}</td>
              </tr>
              {/* Unrealized Gain */}
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px 8px" }}>Unrealized Gain</td>
                <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", background: YELLOW_BG }}>{fmt(Number(cert.beginningUnrealizedGain))}</td>
                <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", background: YELLOW_BG }}>{fmt(Number(cert.endingUnrealizedGain))}</td>
              </tr>
            </tbody>
          </table>

          {/* During the Period — one-liner rows */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: "4mm" }}>
            <thead>
              <tr style={{ background: GREY_BG }}>
                <td colSpan={2} style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: 700 }}>During the Period</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px 8px", width: "70%" }}>Total Realized Gain during the Period</td>
                <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", background: YELLOW_BG }}>{fmt(Number(cert.totalRealizedGain))}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px 8px" }}>Total Addition during the Period</td>
                <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", background: YELLOW_BG }}>{fmt(Number(cert.totalAdditionAtCost))}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px 8px" }}>Total Redemption during the Period</td>
                <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", background: YELLOW_BG }}>{fmt(Number(cert.totalRedemptionAtCost))}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px 8px" }}>Net Investment (Net of Addition and Redemption) during the Period</td>
                <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", fontWeight: 700, background: YELLOW_BG }}>{fmt(Number(cert.netInvestment))}</td>
              </tr>
            </tbody>
          </table>

          {/* Dividend Summary */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: "4mm" }}>
            <thead>
              <tr style={{ background: GREY_BG }}>
                <td colSpan={2} style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: 700 }}>Dividend Summary</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px 8px", width: "70%" }}>Gross Dividend</td>
                <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", background: YELLOW_BG }}>{fmt(Number(cert.totalGrossDividend))}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px 8px" }}>Tax Deducted at Source</td>
                <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", background: YELLOW_BG }}>{fmt(Number(cert.totalTax))}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px 8px" }}>Net Dividend</td>
                <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", fontWeight: 700, background: YELLOW_BG }}>{fmt(Number(cert.totalNetDividend))}</td>
              </tr>
            </tbody>
          </table>

          {/* Chalan details — only for EFUF and EGF */}
          {(fund.code === "EFUF" || fund.code === "EGF") && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: "4mm" }}>
              <tbody>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "3px 8px", width: "70%" }}>Chalan Number</td>
                  <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", background: YELLOW_BG }}>
                    {fund.code === "EFUF" ? "2425-00302670771" : "2425-00302681821"}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #000", padding: "3px 8px" }}>Chalan Date</td>
                  <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "right", background: YELLOW_BG }}>April 22, 2025</td>
                </tr>
              </tbody>
            </table>
          )}

          {/* Disclaimer */}
          <p style={{ fontSize: "8pt", color: "#666", marginTop: "6mm" }}>
            This certificate is issued for income tax purposes as per NBR requirements.<br />
            Ekush Wealth Management Ltd | Licensed by BSEC | www.ekushwml.com
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
