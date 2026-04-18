// Pure HTML builder for the Portfolio Statement document. Returns the
// A4-sized content block — both the print page and the email-attachment
// PDF renderer use this so the two outputs stay byte-for-byte identical.

export interface PortfolioStatementRow {
  fundCode: string;
  units: number;
  avgCost: number;
  nav: number;
  costValue: number;
  marketValue: number;
  gain: number;
  returnPct: number;
}

export interface PortfolioStatementData {
  dateStr: string;
  investorName: string;
  investorCode: string;
  rows: PortfolioStatementRow[];
  totalCost: number;
  totalMarket: number;
  totalGain: number;
  totalReturn: number;
  // Full-width banner used as the page header. If omitted, the file served
  // from /banner_for_portfolio.png is referenced directly — suitable for the
  // print page; Puppeteer-based email attachment should pass a data URL.
  bannerDataUrl?: string;
}

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

// Returns just the A4 page (no <html>/<head>). Safe to embed inside the
// print page's server component.
export function buildPortfolioStatementBody(data: PortfolioStatementData): string {
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

    <div style="padding:40px 60px 60px 60px;">
      <p style="font-family:${FONT};font-size:11pt;font-weight:400;color:#000;margin:0;">${escapeHtml(data.dateStr)}</p>
      <p style="font-family:${FONT};font-size:12pt;font-weight:700;color:#000;margin:20px 0 0 0;">${escapeHtml(data.investorName)}</p>
      <p style="font-family:${FONT};font-size:11pt;font-weight:400;color:#000;margin:4px 0 0 0;">Investor Code: ${escapeHtml(data.investorCode)}</p>
      <p style="font-family:${FONT};font-size:18pt;font-weight:700;color:#000;margin:30px 0 0 0;">Portfolio Statement</p>

      <table style="width:100%;border-collapse:collapse;margin-top:15px;table-layout:fixed;">
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
          <tr style="border-bottom:1px solid ${BORDER_GREY};">
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
  </div>
  `.trim();
}

// Wrap the body in a minimal HTML document ready for Puppeteer.
export function buildPortfolioStatementFullHtml(data: PortfolioStatementData): string {
  const body = buildPortfolioStatementBody(data);
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
