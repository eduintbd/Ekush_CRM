import { getSession } from "@/lib/auth";
import { prisma, withRetry } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortfolioStatementPage({
  searchParams,
}: {
  searchParams: { investorCode?: string; fundCode?: string };
}) {
  let session;
  try { session = await getSession(); } catch { redirect("/login"); }
  if (!session) redirect("/login");

  let investor: any = null;
  let holdings: any[] = [];
  let filterFundCode: string | null = null;

  try {
    let investorId: string | undefined;

    // Admin preview mode: allow specifying investorCode and fundCode
    if (searchParams.investorCode) {
      const user = (session.user as any);
      const isAdmin = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPER_ADMIN"].includes(user?.role);

      if (!isAdmin) {
        return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Unauthorized</div>;
      }

      investor = await prisma.investor.findUnique({
        where: { investorCode: searchParams.investorCode },
      });

      if (!investor) {
        return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Investor not found</div>;
      }

      investorId = investor.id;
      filterFundCode = searchParams.fundCode || null;
    } else {
      const userId = (session.user as any)?.id;
      investorId = (session.user as any)?.investorId;
      if (!investorId && userId) {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { investor: { select: { id: true } } } });
        investorId = u?.investor?.id;
      }
      if (!investorId) redirect("/dashboard");

      investor = await withRetry(() => prisma.investor.findUnique({ where: { id: investorId } }));
      if (!investor) redirect("/dashboard");
    }

    holdings = await withRetry(() => prisma.fundHolding.findMany({
      where: { investorId },
      include: { fund: true },
    }));

    if (filterFundCode) {
      holdings = holdings.filter((h) => h.fund.code === filterFundCode);
    }
  } catch (err) {
    console.error("Portfolio statement error:", err);
    return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Could not load data. Please refresh.</div>;
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const fmt2 = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt0 = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

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
  const fileName = `Portfolio-Statement-${investor.investorCode}.pdf`;

  const FONT = "Arial, Helvetica, sans-serif";
  const BORDER_GREY = "#E5E5E5";
  const ORANGE = "#F27023";

  const numericTh = {
    fontFamily: FONT,
    fontSize: "10pt",
    fontWeight: 700,
    color: "#000",
    textAlign: "right" as const,
    padding: "10px 6px",
  };
  const numericTd = {
    fontFamily: FONT,
    fontSize: "10pt",
    fontWeight: 400,
    color: "#000",
    textAlign: "right" as const,
    padding: "12px 6px",
  };
  const numericTdBold = { ...numericTd, fontWeight: 700 };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        body { margin: 0; padding: 0; background: #f5f5f5; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .statement-page { box-shadow: none !important; margin: 0 !important; }
        }
      `}} />

      {/* html2pdf.js from CDN */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" async></script>

      {/* Floating action buttons */}
      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 50, display: "flex", gap: 8 }}>
        <button
          id="download-pdf-btn"
          style={{
            padding: "8px 16px",
            background: ORANGE,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: FONT,
          }}
          aria-label="Download PDF"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download PDF
        </button>
        <a
          href="/statements"
          style={{
            padding: "8px 16px",
            background: "#fff",
            color: "#333",
            border: "1px solid #ddd",
            borderRadius: 6,
            fontSize: 14,
            textDecoration: "none",
            fontFamily: FONT,
          }}
        >
          Back
        </a>
      </div>

      {/* Inline handler — polls for html2pdf to load (async script) then binds */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          var btn = document.getElementById('download-pdf-btn');
          if (!btn) return;
          btn.addEventListener('click', function() {
            var el = document.getElementById('statement-content');
            if (!el) return;
            var start = Date.now();
            (function tryRender() {
              if (typeof window.html2pdf === 'undefined') {
                if (Date.now() - start > 5000) { alert('PDF generator failed to load.'); return; }
                return setTimeout(tryRender, 80);
              }
              var originalText = btn.innerHTML;
              btn.innerHTML = 'Generating...';
              btn.disabled = true;
              window.html2pdf()
                .set({
                  margin: 0,
                  filename: ${JSON.stringify(fileName)},
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                })
                .from(el)
                .save()
                .then(function() { btn.innerHTML = originalText; btn.disabled = false; })
                .catch(function() { btn.innerHTML = originalText; btn.disabled = false; });
            })();
          });
        })();
      `}} />

      {/* A4 page */}
      <div
        id="statement-content"
        className="statement-page"
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "20px auto",
          background: "#fff",
          fontFamily: FONT,
          color: "#000",
          position: "relative",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header: full-bleed, ~130px tall */}
        <div style={{ position: "relative", width: "100%", height: "130px", overflow: "hidden" }}>
          {/* Orange wave SVG — bleeds from left, S-curve flowing right with layered lighter bands */}
          <svg
            viewBox="0 0 800 260"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          >
            {/* Background layered bands (lighter oranges), suggesting motion */}
            <path d="M0,0 L0,180 C 120,130 260,90 420,120 C 560,145 680,195 800,170 L800,0 Z" fill="#FCD7B8" />
            <path d="M0,0 L0,150 C 140,105 280,65 440,95 C 580,120 690,170 800,140 L800,0 Z" fill="#F9B582" />
            <path d="M0,0 L0,120 C 160,80 300,45 460,75 C 600,100 700,150 800,115 L800,0 Z" fill="#F48A46" />
            {/* Foreground bold orange S-curve */}
            <path d="M0,0 L0,95 C 170,50 320,20 480,55 C 620,85 710,135 800,95 L800,0 Z" fill={ORANGE} />
          </svg>

          {/* Logo in top-right corner */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Ekush Wealth Management Limited"
            style={{
              position: "absolute",
              top: "25px",
              right: "30px",
              width: "180px",
              height: "auto",
              zIndex: 2,
            }}
            crossOrigin="anonymous"
          />
        </div>

        {/* Body */}
        <div style={{ padding: "40px 60px 60px 60px" }}>
          {/* Date */}
          <p style={{ fontFamily: FONT, fontSize: "11pt", fontWeight: 400, color: "#000", margin: 0 }}>
            {dateStr}
          </p>

          {/* Investor name + code */}
          <p style={{ fontFamily: FONT, fontSize: "12pt", fontWeight: 700, color: "#000", margin: "20px 0 0 0" }}>
            {investor.name}
          </p>
          <p style={{ fontFamily: FONT, fontSize: "11pt", fontWeight: 400, color: "#000", margin: "4px 0 0 0" }}>
            Investor Code: {investor.investorCode}
          </p>

          {/* Title */}
          <p style={{ fontFamily: FONT, fontSize: "18pt", fontWeight: 700, color: "#000", margin: "30px 0 0 0" }}>
            Portfolio Statement
          </p>

          {/* Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "15px",
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr style={{ borderTop: "1.5px solid #000", borderBottom: `1px solid ${BORDER_GREY}` }}>
                <th style={{ ...numericTh, textAlign: "left" }}>Fund</th>
                <th style={numericTh}>Units</th>
                <th style={numericTh}>Avg Cost</th>
                <th style={numericTh}>NAV</th>
                <th style={numericTh}>Cost Value</th>
                <th style={numericTh}>Market Value</th>
                <th style={numericTh}>Gain/Loss</th>
                <th style={numericTh}>Return</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <td style={{ ...numericTd, textAlign: "left", fontWeight: 700 }}>{r.code}</td>
                  <td style={numericTd}>{fmt0(r.units)}</td>
                  <td style={numericTd}>{r.avgCost.toFixed(4)}</td>
                  <td style={numericTd}>{r.nav.toFixed(4)}</td>
                  <td style={numericTd}>{fmt2(r.costValue)}</td>
                  <td style={numericTd}>{fmt2(r.marketValue)}</td>
                  <td style={numericTd}>{fmt2(r.gain)}</td>
                  <td style={numericTd}>
                    {r.returnPct >= 0 ? "+" : ""}
                    {r.returnPct.toFixed(2)}%
                  </td>
                </tr>
              ))}
              <tr style={{ borderBottom: `1px solid ${BORDER_GREY}` }}>
                <td style={{ ...numericTd, textAlign: "left", fontWeight: 700 }}>TOTAL</td>
                <td style={numericTd}></td>
                <td style={numericTd}></td>
                <td style={numericTd}></td>
                <td style={numericTdBold}>{fmt2(totalCost)}</td>
                <td style={numericTdBold}>{fmt2(totalMarket)}</td>
                <td style={numericTdBold}>{fmt2(totalGain)}</td>
                <td style={numericTdBold}>{totalReturn.toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
