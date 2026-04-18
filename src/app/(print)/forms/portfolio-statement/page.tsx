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
  let investorId: string | undefined;
  let fundCode = searchParams.fundCode || null;

  try {
    // Admin preview mode
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
    } else {
      const userId = (session.user as any)?.id;
      investorId = (session.user as any)?.investorId;
      if (!investorId && userId) {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { investor: { select: { id: true } } },
        });
        investorId = u?.investor?.id;
      }
      if (!investorId) redirect("/dashboard");

      investor = await withRetry(() =>
        prisma.investor.findUnique({ where: { id: investorId } }),
      );
      if (!investor) redirect("/dashboard");
    }
  } catch (err) {
    console.error("Portfolio statement error:", err);
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
        Could not load data. Please refresh.
      </div>
    );
  }

  // If no fundCode was provided (e.g. "Download PDF" from /statements), pick
  // the investor's highest-market-value holding so the page never 404s.
  let fund: any = null;
  let holding: any = null;
  try {
    if (!fundCode) {
      const holdings = await withRetry(() =>
        prisma.fundHolding.findMany({ where: { investorId }, include: { fund: true } }),
      );
      if (holdings.length === 0) {
        return (
          <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
            No holdings found.
          </div>
        );
      }
      const best = holdings
        .map((h) => ({
          h,
          mv: Number(h.totalCurrentUnits) * Number(h.fund.currentNav),
        }))
        .sort((a, b) => b.mv - a.mv)[0];
      holding = best.h;
      fund = best.h.fund;
      fundCode = fund.code;
    } else {
      fund = await prisma.fund.findUnique({ where: { code: fundCode } });
      if (!fund) {
        return (
          <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
            Fund {fundCode} not found.
          </div>
        );
      }
      holding = await prisma.fundHolding.findUnique({
        where: { investorId_fundId: { investorId: investorId!, fundId: fund.id } },
      });
      if (!holding) {
        return (
          <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
            No holdings in fund {fundCode}.
          </div>
        );
      }
    }
  } catch (err) {
    console.error("Portfolio statement data error:", err);
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
        Could not load fund data.
      </div>
    );
  }

  const divAgg = await prisma.dividend.aggregate({
    where: { investorId, fundId: fund.id },
    _sum: { grossDividend: true },
  });
  const dividendTotal = Number(divAgg._sum.grossDividend || 0);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const totalUnits = Number(holding.totalCurrentUnits);
  const avgCost = Number(holding.avgCost);
  const costValue = Number(holding.totalCostValueCurrent);
  const realizedGain = Number(holding.totalRealizedGain);
  const nav = Number(fund.currentNav);
  const marketValue = totalUnits * nav;

  const fileName = `Portfolio-Statement-${investor.investorCode}-${fund.code}.pdf`;

  // Shared builder — same output the email-attachment PDF uses.
  const body = buildPortfolioStatementBody({
    dateStr,
    investorName: investor.name,
    investorCode: investor.investorCode,
    fundName: fund.name,
    fundCode: fund.code,
    totalUnits,
    avgCost,
    costValue,
    marketValue,
    realizedGain,
    dividendTotal,
    nav,
    entryLoad: Number(fund.entryLoad),
    exitLoad: Number(fund.exitLoad),
    // bannerDataUrl omitted so the browser resolves /banner_for_portfolio.png
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
