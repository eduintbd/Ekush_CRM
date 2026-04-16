import { getSession } from "@/lib/auth";
import { prisma, withRetry } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface SearchParams {
  fund?: string;
  year?: string;
  type?: string;
  from?: string;
  to?: string;
}

function buildFiscalYearRange(year?: string): { gte: Date; lt: Date } | undefined {
  if (!year) return undefined;
  const y = parseInt(year);
  if (isNaN(y)) return undefined;
  // Bangladesh fiscal year: July of `year` → June of `year + 1`
  return { gte: new Date(y, 6, 1), lt: new Date(y + 1, 6, 1) };
}

export default async function TransactionReportPrintPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  let session;
  try { session = await getSession(); } catch { redirect("/login"); }
  if (!session) redirect("/login");

  let investor: any = null;
  let transactions: any[] = [];
  let fundRow: { code: string; name: string } | null = null;

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
      fundRow = await prisma.fund.findUnique({
        where: { code: searchParams.fund },
        select: { id: true, code: true, name: true },
      }) as any;
      if (fundRow) where.fundId = (fundRow as any).id;
    }
    if (searchParams.type === "BUY" || searchParams.type === "SELL") {
      where.direction = searchParams.type;
    }
    if (searchParams.from || searchParams.to) {
      const range: { gte?: Date; lte?: Date } = {};
      if (searchParams.from) range.gte = new Date(searchParams.from);
      if (searchParams.to) {
        const to = new Date(searchParams.to);
        to.setHours(23, 59, 59, 999);
        range.lte = to;
      }
      where.orderDate = range;
    } else {
      const fy = buildFiscalYearRange(searchParams.year);
      if (fy) where.orderDate = fy;
    }

    transactions = await withRetry(() => prisma.transaction.findMany({
      where,
      include: { fund: { select: { code: true, name: true } } },
      orderBy: { orderDate: "asc" },
    }));
  } catch (err) {
    console.error("Transaction report error:", err);
    return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Could not load data. Please refresh.</div>;
  }

  const lumpsum = transactions.filter((t) => t.channel === "LS");
  const sip = transactions.filter((t) => t.channel === "SIP");

  const fmtAmount = (n: number) =>
    n === 0 ? "-" : Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtUnits = (n: number) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const fundLabel = fundRow ? `${fundRow.code} — ${fundRow.name}` : "All funds";
  const yearLabel = searchParams.year
    ? `FY ${searchParams.year}`
    : searchParams.from || searchParams.to
      ? [searchParams.from, searchParams.to].filter(Boolean).join(" → ")
      : "All years";
  const typeLabel =
    searchParams.type === "BUY" ? "Buy only" : searchParams.type === "SELL" ? "Sell only" : "All types";

  const totalBuy = transactions.filter((t) => t.direction === "BUY").reduce((s, t) => s + Number(t.amount), 0);
  const totalSell = transactions.filter((t) => t.direction === "SELL").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;} .no-print{display:none!important;} .print-page{width:210mm;min-height:297mm;padding:0;margin:0;box-shadow:none!important;} }
        @page { size: A4 portrait; margin: 0; }
      `}} />

      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 50, display: "flex", gap: 8 }}>
        <button id="print-btn" style={{ padding: "8px 16px", background: "#F27023", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save as PDF / Print</button>
        <a href="/transactions" style={{ padding: "8px 16px", background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, textDecoration: "none" }}>Back</a>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `document.getElementById('print-btn').addEventListener('click',function(){window.print()});` }} />

      <div className="print-page" style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", background: "#fff", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "10pt", color: "#000", lineHeight: "1.5", position: "relative", paddingBottom: "16mm" }}>

        {/* Banner */}
        <img src="/banner_for_portfolio.png" alt="" style={{ width: "100%", display: "block" }} />

        <div style={{ padding: "6mm 20mm 10mm 20mm" }}>

          {/* Title */}
          <h1 style={{ fontSize: "16pt", fontWeight: 700, marginBottom: "1mm" }}>Transaction Report</h1>
          <p style={{ fontSize: "9pt", color: "#666", marginBottom: "6mm" }}>
            Generated: {dateStr}
          </p>

          {/* Investor + filters row */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10mm", marginBottom: "6mm" }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, marginBottom: "1mm" }}>Investor Details</p>
              <p style={{ fontSize: "10pt" }}>Name: {investor.name}</p>
              <p style={{ fontSize: "10pt" }}>Code: {investor.investorCode}</p>
              <p style={{ fontSize: "10pt" }}>Type: {investor.investorType}</p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, marginBottom: "1mm" }}>Filters</p>
              <p style={{ fontSize: "10pt" }}>Fund: {fundLabel}</p>
              <p style={{ fontSize: "10pt" }}>Year: {yearLabel}</p>
              <p style={{ fontSize: "10pt" }}>Type: {typeLabel}</p>
            </div>
          </div>

          {/* Lumpsum History */}
          <SectionHeader title="Lumpsum History" count={lumpsum.length} />
          <TxnTable rows={lumpsum} fmtAmount={fmtAmount} fmtUnits={fmtUnits} fmtDate={fmtDate} />

          {/* SIP History */}
          <div style={{ height: "4mm" }} />
          <SectionHeader title="SIP History" count={sip.length} />
          <TxnTable rows={sip} fmtAmount={fmtAmount} fmtUnits={fmtUnits} fmtDate={fmtDate} />

          {/* Grand totals */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginTop: "4mm" }}>
            <tbody>
              <tr style={{ background: "#f0f0f0", fontWeight: 700 }}>
                <td style={{ border: "1px solid #000", padding: "4px 8px", width: "70%" }}>TOTAL BUY</td>
                <td style={{ border: "1px solid #000", padding: "4px 8px", textAlign: "right" }}>{fmtAmount(totalBuy)}</td>
              </tr>
              <tr style={{ background: "#f0f0f0", fontWeight: 700 }}>
                <td style={{ border: "1px solid #000", padding: "4px 8px" }}>TOTAL SELL</td>
                <td style={{ border: "1px solid #000", padding: "4px 8px", textAlign: "right" }}>{fmtAmount(totalSell)}</td>
              </tr>
            </tbody>
          </table>

          <p style={{ fontSize: "8pt", color: "#888", marginTop: "4mm" }}>
            Total {transactions.length} transaction(s) listed. This is a computer-generated report. For any
            discrepancy please contact support.
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

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div style={{ background: "#333", color: "#fff", padding: "4px 10px", fontWeight: 700, fontSize: "10.5pt", display: "flex", justifyContent: "space-between" }}>
      <span>{title}</span>
      <span style={{ fontSize: "9pt", fontWeight: 400, opacity: 0.85 }}>{count} record{count === 1 ? "" : "s"}</span>
    </div>
  );
}

function TxnTable({
  rows,
  fmtAmount,
  fmtUnits,
  fmtDate,
}: {
  rows: { id: string; orderDate: Date; direction: string; units: number; nav: number; amount: number; fund: { code: string } }[];
  fmtAmount: (n: number) => string;
  fmtUnits: (n: number) => string;
  fmtDate: (d: Date) => string;
}) {
  if (rows.length === 0) {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #ccc", padding: "6px", textAlign: "center", color: "#888", fontStyle: "italic" }}>
              No records in this range.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" }}>
      <thead>
        <tr style={{ background: "#555", color: "#fff" }}>
          {["#", "Date", "Fund", "Type", "Units", "NAV", "Amount (BDT)"].map((h, i) => (
            <td key={i} style={{ border: "1px solid #000", padding: "3px 6px", fontWeight: 700, textAlign: i >= 4 ? "right" : "left" }}>{h}</td>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((tx, i) => (
          <tr key={tx.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
            <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{i + 1}</td>
            <td style={{ border: "1px solid #ccc", padding: "3px 6px", whiteSpace: "nowrap" }}>{fmtDate(tx.orderDate)}</td>
            <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{tx.fund.code}</td>
            <td style={{ border: "1px solid #ccc", padding: "3px 6px", fontWeight: tx.direction === "SELL" ? 700 : 400, color: tx.direction === "SELL" ? "#F27023" : "#000" }}>
              {tx.direction === "BUY" ? "Buy" : "Sell"}
            </td>
            <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "right" }}>{fmtUnits(Number(tx.units))}</td>
            <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "right" }}>{Number(tx.nav).toFixed(2)}</td>
            <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "right" }}>{fmtAmount(Number(tx.amount))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
