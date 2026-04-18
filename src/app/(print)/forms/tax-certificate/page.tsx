import { getSession } from "@/lib/auth";
import { prisma, withRetry } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { buildTaxCertificateBody } from "@/lib/mail/tax-certificate-html";

export const dynamic = "force-dynamic";

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
  try {
    cert = await withRetry(() => prisma.taxCertificate.findUnique({
      where: { id: certId },
      include: { fund: true, investor: true },
    }));
    if (!cert) return <div style={{ padding: 40, textAlign: "center" }}>Certificate not found.</div>;
  } catch (err) {
    console.error("Tax cert error:", err);
    return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Could not load data. Please refresh.</div>;
  }

  const body = buildTaxCertificateBody({
    investorName: cert.investor.name,
    investorCode: cert.investor.investorCode,
    investorTitle: cert.investor.title,
    nidNumber: cert.investor.nidNumber,
    tinNumber: cert.investor.tinNumber,
    fundCode: cert.fund.code,
    fundName: cert.fund.name,
    periodStart: cert.periodStart ? new Date(cert.periodStart) : null,
    periodEnd: cert.periodEnd ? new Date(cert.periodEnd) : null,
    beginningCostValue: Number(cert.beginningCostValue),
    endingCostValue: Number(cert.endingCostValue),
    beginningMarketValue: Number(cert.beginningMarketValue),
    endingMarketValue: Number(cert.endingMarketValue),
    beginningUnrealizedGain: Number(cert.beginningUnrealizedGain),
    endingUnrealizedGain: Number(cert.endingUnrealizedGain),
    totalRealizedGain: Number(cert.totalRealizedGain),
    totalAdditionAtCost: Number(cert.totalAdditionAtCost),
    totalRedemptionAtCost: Number(cert.totalRedemptionAtCost),
    netInvestment: Number(cert.netInvestment),
    totalGrossDividend: Number(cert.totalGrossDividend),
    totalTax: Number(cert.totalTax),
    totalNetDividend: Number(cert.totalNetDividend),
    // bannerDataUrl omitted so the browser resolves /banner_for_portfolio.png
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;} .no-print{display:none!important;} .print-page{width:210mm;min-height:297mm;padding:0;margin:0;box-shadow:none!important;} }
        @page { size: A4 portrait; margin: 0; }
      `}} />

      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 50, display: "flex", gap: 8 }}>
        <button id="print-btn" style={{ padding: "8px 16px", background: "#F27023", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save as PDF / Print</button>
        <a href="/tax-certificate" style={{ padding: "8px 16px", background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, textDecoration: "none" }}>Back</a>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `document.getElementById('print-btn').addEventListener('click',function(){window.print()});` }} />

      <div dangerouslySetInnerHTML={{ __html: body }} />
    </>
  );
}
