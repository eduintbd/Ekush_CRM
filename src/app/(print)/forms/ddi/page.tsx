import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FUND_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const FUND_BANK: Record<string, { name: string; accountNo: string; bankName: string; branch: string; routing: string }> = {
  EFUF: { name: "EKUSH FIRST UNIT FUND", accountNo: "1513205101231001", bankName: "BRAC BANK LIMITED", branch: "R K MISSION ROAD", routing: "060272531" },
  EGF: { name: "EKUSH GROWTH FUND", accountNo: "1513205101212001", bankName: "BRAC BANK LIMITED", branch: "R K MISSION ROAD", routing: "060272531" },
  ESRF: { name: "EKUSH STABLE RETURN FUND", accountNo: "2055604070001", bankName: "BRAC BANK LIMITED", branch: "GRAPHICS BUILDING", routing: "060272531" },
};

export default async function DDIFormPage({
  searchParams,
}: {
  searchParams: { fundCode?: string; amount?: string; debitDay?: string; tenure?: string };
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
    if (!investorId) redirect("/dashboard");

    investor = await prisma.investor.findUnique({
      where: { id: investorId },
      include: { bankAccounts: { orderBy: { isPrimary: "desc" }, take: 1 } },
    });
  } catch (err) {
    console.error("DDI form data error:", err);
    return <div style={{padding:40,textAlign:"center",color:"#666"}}>Could not load form data. Please refresh the page.</div>;
  }
  if (!investor) redirect("/dashboard");

  const fundCode = searchParams.fundCode || "EFUF";
  const amount = Number(searchParams.amount || 5000);
  const debitDay = Number(searchParams.debitDay || 5);
  const tenure = Number(searchParams.tenure || 5);
  const fundBank = FUND_BANK[fundCode] || FUND_BANK.EFUF;
  const bank = investor.bankAccounts[0];

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = String(today.getFullYear());
  const dateDigits = (dd + mm + yyyy).split("");

  // DDI dates
  const startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + tenure);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const S: Record<string, React.CSSProperties> = {
    page: { width: "210mm", minHeight: "297mm", padding: "20mm 18mm", margin: "0 auto", background: "#fff", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "10pt", color: "#000", lineHeight: "1.4" },
    title: { fontSize: "14pt", fontWeight: 700, textAlign: "center" as const, marginBottom: "2mm" },
    subtitle: { fontSize: "11pt", textAlign: "center" as const, marginBottom: "1mm" },
    fundLine: { fontSize: "11pt", fontWeight: 700, textAlign: "center" as const, marginBottom: "10mm" },
    formTitle: { fontSize: "18pt", fontWeight: 700, textAlign: "center" as const, textTransform: "uppercase" as const, letterSpacing: "3px", borderBottom: "1px solid #000", paddingBottom: "3mm", marginBottom: "8mm" },
    sectionHeader: { fontSize: "12pt", fontWeight: 700, textTransform: "uppercase" as const, marginBottom: "3mm", marginTop: "6mm" },
    table: { width: "100%", borderCollapse: "collapse" as const, marginBottom: "4mm" },
    th: { border: "1px solid #000", padding: "6px 8px", fontWeight: 700, fontSize: "10pt", textAlign: "left" as const, background: "#f2f2f2" },
    td: { border: "1px solid #000", padding: "6px 8px", fontSize: "10pt", minHeight: "12mm" },
    tdLabel: { border: "1px solid #000", padding: "6px 8px", fontWeight: 700, fontSize: "10pt", width: "45%", background: "#fafafa" },
    tdValue: { border: "1px solid #000", padding: "6px 8px", fontSize: "10pt" },
    para: { fontSize: "10pt", textAlign: "justify" as const, lineHeight: "1.5", marginBottom: "4mm" },
    sigRow: { display: "flex", justifyContent: "space-between", marginTop: "20mm" },
    sigBox: { width: "45%", textAlign: "center" as const },
    sigLine: { borderTop: "1px solid #000", marginTop: "25mm", paddingTop: "2mm" },
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { body { margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; } .no-print { display:none!important; } .print-page { width:210mm; min-height:297mm; padding:20mm 18mm; margin:0; box-shadow:none!important; } }
        @page { size: A4 portrait; margin: 0; }
      `}} />

      <div className="no-print" style={{ position:"fixed", top:16, right:16, zIndex:50, display:"flex", gap:8 }}>
        <button id="print-btn" style={{ padding:"8px 16px", background:"#F27023", color:"#fff", border:"none", borderRadius:6, fontSize:14, fontWeight:600, cursor:"pointer" }}>
          Save as PDF / Print
        </button>
        <a href="/sip" style={{ padding:"8px 16px", background:"#fff", color:"#333", border:"1px solid #ddd", borderRadius:6, fontSize:14, textDecoration:"none" }}>Back</a>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `document.getElementById('print-btn').addEventListener('click',function(){window.print()});` }} />

      {/* ─── A4 Page ─────────────────────────────────────────── */}
      <div className="print-page" style={S.page}>

        {/* Header — text left, logo right, horizontally aligned */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10mm" }}>
          <div>
            <p style={{ fontSize:"14pt", fontWeight:700, fontStyle:"italic", margin:"0 0 2mm 0" }}>Systematic Investment Plan</p>
            <p style={{ fontSize:"11pt", margin:"0 0 1mm 0" }}>Asset Manager: Ekush Wealth Management Limited</p>
            <p style={{ fontSize:"11pt", fontWeight:700, margin:0 }}>Mutual Fund: {fundBank.name}</p>
          </div>
          <img src="/logo.png" alt="Ekush" style={{ height:"22mm", flexShrink:0 }} />
        </div>

        {/* Form Title */}
        <div style={S.formTitle}>AUTO DEBIT INSTRUCTION FORM</div>

        {/* Date of Application */}
        <div style={{ display:"flex", alignItems:"center", gap:"4mm", marginBottom:"8mm" }}>
          <span style={{ fontWeight:700, fontSize:"10pt" }}>Date of Application</span>
          <div style={{ display:"flex", gap:"1mm" }}>
            {dateDigits.map((d, i) => (
              <div key={i} style={{ width:"8mm", height:"8mm", border:"1px solid #000", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11pt", fontWeight:700 }}>{d}</div>
            ))}
          </div>
        </div>

        {/* INVESTOR'S INFORMATION */}
        <div style={S.sectionHeader}>INVESTOR&apos;S INFORMATION</div>
        <table style={S.table}>
          <tbody>
            <tr>
              <td style={{ ...S.tdLabel, width:"25%" }}>Name of the Investor</td>
              <td style={S.tdValue}>{investor.name}</td>
              <td style={{ ...S.tdLabel, width:"18%" }}>Investor Code</td>
              <td style={{ ...S.tdValue, width:"15%" }}>{investor.investorCode}</td>
            </tr>
          </tbody>
        </table>

        {/* DIRECT DEBIT INSTRUCTION (DDI) INFORMATION */}
        <div style={S.sectionHeader}>DIRECT DEBIT INSTRUCTION (DDI) INFORMATION</div>
        <table style={S.table}>
          <tbody>
            <tr><td style={S.tdLabel}>DDI START DATE</td><td style={S.tdValue}>{fmtDate(startDate)}</td></tr>
            <tr><td style={S.tdLabel}>DDI END DATE</td><td style={S.tdValue}>{fmtDate(endDate)}</td></tr>
            <tr><td style={S.tdLabel}>SIP TENURE</td><td style={S.tdValue}>{String(tenure).padStart(2, "0")} years</td></tr>
            <tr><td style={S.tdLabel}>DDI PULL DATE OF THE MONTH</td><td style={S.tdValue}>{debitDay}th day of each month</td></tr>
            <tr><td style={S.tdLabel}>MONTHLY DDI AMOUNT (BDT)</td><td style={S.tdValue}>BDT {amount.toLocaleString("en-IN")}</td></tr>
          </tbody>
        </table>

        {/* Investor bank details */}
        <table style={S.table}>
          <tbody>
            <tr><td style={S.tdLabel}>BANK ACCOUNT NAME</td><td style={S.tdValue}>{investor.name}</td></tr>
            <tr><td style={S.tdLabel}>BANK ACCOUNT NUMBER</td><td style={S.tdValue}>{bank?.accountNumber || ""}</td></tr>
            <tr><td style={S.tdLabel}>BANK NAME</td><td style={S.tdValue}>{bank?.bankName || ""}</td></tr>
            <tr><td style={S.tdLabel}>BRANCH NAME</td><td style={S.tdValue}>{bank?.branchName || ""}</td></tr>
            <tr><td style={S.tdLabel}>ROUTING NUMBER</td><td style={S.tdValue}>{bank?.routingNumber || ""}</td></tr>
          </tbody>
        </table>

        {/* FUND'S COLLECTION BANK DETAILS */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginTop:"6mm", marginBottom:"3mm" }}>
          <span style={{ fontSize:"12pt", fontWeight:700, textTransform:"uppercase" }}>FUND&apos;S (COLLECTION) BANK DETAILS</span>
          <span style={{ fontSize:"9pt", color:"#666" }}>FILLED BY OFFICE</span>
        </div>
        <table style={S.table}>
          <tbody>
            <tr><td style={S.tdLabel}>BANK ACCOUNT NAME</td><td style={S.tdValue}>{fundBank.name}</td></tr>
            <tr><td style={S.tdLabel}>BANK ACCOUNT NUMBER</td><td style={S.tdValue}>{fundBank.accountNo}</td></tr>
            <tr><td style={S.tdLabel}>BANK NAME</td><td style={S.tdValue}>{fundBank.bankName}</td></tr>
            <tr><td style={S.tdLabel}>BRANCH NAME</td><td style={S.tdValue}>{fundBank.branch}</td></tr>
            <tr><td style={S.tdLabel}>ROUTING NUMBER</td><td style={S.tdValue}>{fundBank.routing}</td></tr>
          </tbody>
        </table>

        {/* INVESTOR ACKNOWLEDGEMENT */}
        <div style={S.sectionHeader}>INVESTOR ACKNOWLEDGEMENT</div>
        <p style={S.para}>
          I/ We, maintaining an account with the above-mentioned bank, hereby would like to inform you that I/we have
          authorized {fundBank.name} to debit my/our account through online fund transfer processes by an
          amount not exceeding the above-mentioned amount. The auto debit instruction will be initiated by the designated
          Bank at the instruction of {fundBank.name} managed by Ekush Wealth Management Limited. The
          account shall be debited on a monthly basis and the instruction shall be valid from the debit start date to debit
          end date as mentioned above. Exit Load is 2% of the &apos;Investors Sale Price&apos; if surrendered before 12 months of the
          DDI Start Date and 1% of the &apos;Investors Sale Price&apos; if surrendered before 36 months of the DDI Start Date. This is
          for your kind information and support in this regard.
        </p>
        <p style={S.para}>
          I have read and understood the terms and conditions of payment through the Auto-debit payment process, which
          may be altered, modified, and replaced from time to time by Ekush Wealth Management Limited as per regulatory
          requirements.
        </p>

        {/* SIGNATURES */}
        <div style={{ ...S.sectionHeader, marginTop:"8mm" }}>SIGNATURES AS PER THE BANK ACCOUNT</div>
        <div style={S.sigRow}>
          <div style={S.sigBox}>
            <div style={S.sigLine}>Principal Applicant</div>
          </div>
          <div style={S.sigBox}>
            <div style={S.sigLine}>Joint Applicant (If Any)</div>
          </div>
        </div>
      </div>
    </>
  );
}
