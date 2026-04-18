// Multi-fund Portfolio Statement builder — used ONLY by the investor's
// "Download PDF" button on /statements, which shows all holdings in a
// single summary table. The admin mail attachment uses the single-fund
// Investment Update layout in ./portfolio-statement-html.ts instead —
// keep the two apart so tweaking one can't regress the other.

export interface PortfolioStatementMultiFundRow {
  fundCode: string;
  fundName: string;
  units: number;
  avgCost: number;
  nav: number;
  costValue: number;
  marketValue: number;
  gain: number;
  returnPct: number;
}

export interface PortfolioStatementMultiFundData {
  dateStr: string;
  investorName: string;
  investorCode: string;
  rows: PortfolioStatementMultiFundRow[];
  totalCost: number;
  totalMarket: number;
  totalGain: number;
  totalReturn: number;
  bannerDataUrl?: string; // if omitted, "/banner_for_portfolio.png" is used
}

const ORANGE = "#F27023";
const BORDER_GREY = "#E5E5E5";
const FONT = "Arial, Helvetica, sans-serif";

function fmt2(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmt0(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildPortfolioStatementMultiFundBody(
  data: PortfolioStatementMultiFundData,
): string {
  const bannerSrc = data.bannerDataUrl ?? "/banner_for_portfolio.png";

  const thNumeric =
    "font-family:" + FONT +
    ";font-size:10pt;font-weight:700;color:#000;text-align:right;padding:10px 6px;";
  const thLeft = thNumeric.replace("text-align:right", "text-align:left");
  const tdNumeric =
    "font-family:" + FONT +
    ";font-size:10pt;font-weight:400;color:#000;text-align:right;padding:12px 6px;";
  const tdLeftBold =
    "font-family:" + FONT +
    ";font-size:10pt;font-weight:700;color:#000;text-align:left;padding:12px 6px;";
  const tdNumericBold = tdNumeric.replace("font-weight:400", "font-weight:700");

  const rowsHtml = data.rows
    .map(
      (r) => `
        <tr>
          <td style="${tdLeftBold}">${escapeHtml(r.fundCode)}</td>
          <td style="${tdNumeric}">${fmt0(r.units)}</td>
          <td style="${tdNumeric}">${r.avgCost.toFixed(4)}</td>
          <td style="${tdNumeric}">${r.nav.toFixed(4)}</td>
          <td style="${tdNumeric}">${fmt2(r.costValue)}</td>
          <td style="${tdNumeric}">${fmt2(r.marketValue)}</td>
          <td style="${tdNumeric}">${fmt2(r.gain)}</td>
          <td style="${tdNumeric}">${r.returnPct >= 0 ? "+" : ""}${r.returnPct.toFixed(2)}%</td>
        </tr>
      `,
    )
    .join("");

  return `
  <div
    id="statement-content"
    class="statement-page"
    style="width:210mm;min-height:297mm;background:#fff;font-family:${FONT};color:#000;position:relative;margin:0 auto;"
  >
    <!-- Banner (full-width; already contains the Ekush logo on the right) -->
    <img src="${bannerSrc}" alt="" style="display:block;width:100%;height:auto;" crossorigin="anonymous" />

    <div style="padding:14mm 22mm 20mm 22mm;">
      <p style="font-family:${FONT};font-size:11pt;color:#000;margin:0 0 6mm 0;">${escapeHtml(data.dateStr)}</p>

      <p style="font-family:${FONT};font-size:12pt;font-weight:700;color:#000;margin:0 0 1mm 0;">${escapeHtml(data.investorName)}</p>
      <p style="font-family:${FONT};font-size:11pt;color:#000;margin:0 0 6mm 0;">Investor Code: ${escapeHtml(data.investorCode)}</p>

      <p style="font-family:${FONT};font-size:16pt;font-weight:700;color:#000;margin:4mm 0 3mm 0;">Portfolio Statement</p>

      <table style="width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed;">
        <colgroup>
          <col style="width:10%" /><col style="width:10%" /><col style="width:11%" /><col style="width:10%" />
          <col style="width:14%" /><col style="width:15%" /><col style="width:14%" /><col style="width:12%" />
        </colgroup>
        <thead>
          <tr style="border-top:1.5px solid #000;border-bottom:1px solid ${BORDER_GREY};">
            <th style="${thLeft}">Fund</th>
            <th style="${thNumeric}">Units</th>
            <th style="${thNumeric}">Avg Cost</th>
            <th style="${thNumeric}">NAV</th>
            <th style="${thNumeric}">Cost Value</th>
            <th style="${thNumeric}">Market Value</th>
            <th style="${thNumeric}">Gain/Loss</th>
            <th style="${thNumeric}">Return</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="border-top:1.5px solid #000;border-bottom:1.5px solid #000;">
            <td style="${tdLeftBold}">TOTAL</td>
            <td style="${tdNumeric}"></td>
            <td style="${tdNumeric}"></td>
            <td style="${tdNumeric}"></td>
            <td style="${tdNumericBold}">${fmt2(data.totalCost)}</td>
            <td style="${tdNumericBold}">${fmt2(data.totalMarket)}</td>
            <td style="${tdNumericBold}">${fmt2(data.totalGain)}</td>
            <td style="${tdNumericBold}">${data.totalReturn.toFixed(2)}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Orange footer strip (same as single-fund layout for visual parity) -->
    <div style="position:absolute;bottom:0;left:0;right:0;background:${ORANGE};color:#fff;padding:3mm 6mm;display:flex;justify-content:space-between;font-family:${FONT};font-size:8pt;">
      <span>+8801713-086101</span>
      <span>info@ekushwml.com</span>
      <span>Apt-A3, House: 17, Road: 01, Block: A, Niketon, Gulshan 01, Dhaka-1212</span>
      <span>www.ekushwml.com</span>
    </div>
  </div>
  `.trim();
}

export function buildPortfolioStatementMultiFundFullHtml(
  data: PortfolioStatementMultiFundData,
): string {
  const body = buildPortfolioStatementMultiFundBody(data);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Portfolio Statement</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  * { box-sizing: border-box; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}
