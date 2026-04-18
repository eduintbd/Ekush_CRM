import { getSession } from "@/lib/auth";
import { prisma, withRetry } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { buildPortfolioStatementBody } from "@/lib/mail/portfolio-statement-html";

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
    return {
      fundCode: h.fund.code,
      units,
      avgCost,
      nav,
      costValue,
      marketValue,
      gain,
      returnPct,
    };
  });

  const totalReturn = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const fileName = `Portfolio-Statement-${investor.investorCode}.pdf`;

  // Multi-fund builder — investor-facing Download PDF shows all holdings.
  // bannerDataUrl is omitted so /banner_for_portfolio.png resolves at browser
  // render time; the admin mail attachment uses a separate single-fund builder.
  const body = buildPortfolioStatementBody({
    dateStr,
    investorName: investor.name,
    investorCode: investor.investorCode,
    rows,
    totalCost,
    totalMarket,
    totalGain,
    totalReturn,
  });

  const ORANGE = "#F27023";
  const FONT = "Arial, Helvetica, sans-serif";

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
        .statement-page { box-shadow: 0 2px 10px rgba(0,0,0,0.08); margin: 20px auto !important; }
      `}} />

      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" async></script>

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

      <div dangerouslySetInnerHTML={{ __html: body }} />
    </>
  );
}
