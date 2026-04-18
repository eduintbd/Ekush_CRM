// Single-fund Portfolio Statement builder — used ONLY for the admin
// "Send mail → Portfolio Statement" attachment. Layout matches the design
// shipped in commit 421ed34 (Investment Update style: banner, fund info
// box, Investment Results grid, NAV table).
//
// The investor-facing Download PDF on /statements uses the multi-fund
// builder in ./portfolio-statement-html.ts instead — keep the two apart
// so changes to one don't regress the other.

export interface PortfolioStatementSingleFundData {
  dateStr: string;
  investorName: string;
  investorCode: string;
  fundName: string;
  fundCode: string;
  totalUnits: number;
  avgCost: number;
  costValue: number;
  marketValue: number;
  realizedGain: number;
  dividendTotal: number;
  nav: number;
  entryLoad: number; // fractional, e.g. 0.02
  exitLoad: number;
  bannerDataUrl?: string; // if omitted, "/banner_for_portfolio.png" is used
}

const ORANGE = "#F27023";
const GREY_BG = "#f0f0f0";
const FONT = "Arial, Helvetica, sans-serif";

const FUND_REG_NO: Record<string, string> = {
  EFUF: "BSEC/Mutual Fund/2019/106",
  EGF: "BSEC/Mutual Fund/2022/129",
  ESRF: "BSEC/Mutual Fund/2022/130",
};

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

export function buildPortfolioStatementSingleFundBody(
  data: PortfolioStatementSingleFundData,
): string {
  const bannerSrc = data.bannerDataUrl ?? "/banner_for_portfolio.png";
  const regNo = FUND_REG_NO[data.fundCode] || FUND_REG_NO.EFUF;

  const unrealizedGain = data.marketValue - data.costValue;
  const totalValueCreation = data.realizedGain + data.dividendTotal + unrealizedGain;

  const buyPrice = data.nav * (1 + (data.entryLoad || 0));
  const sellPrice = data.nav * (1 - (data.exitLoad || 0));

  return `
  <div
    id="statement-content"
    class="statement-page"
    style="width:210mm;min-height:297mm;background:#fff;font-family:${FONT};color:#000;position:relative;margin:0 auto;"
  >
    <!-- Banner (full-width) -->
    <img src="${bannerSrc}" alt="" style="display:block;width:100%;height:auto;" crossorigin="anonymous" />

    <!-- Content -->
    <div style="padding:8mm 22mm 20mm 22mm;">

      <!-- Date -->
      <p style="font-family:${FONT};font-size:11pt;color:#000;margin:0 0 6mm 0;">${escapeHtml(data.dateStr)}</p>

      <!-- Investor -->
      <p style="font-family:${FONT};font-size:12pt;font-weight:700;color:#000;margin:0 0 1mm 0;">${escapeHtml(data.investorName)}</p>
      <p style="font-family:${FONT};font-size:11pt;color:#000;margin:0 0 5mm 0;">Investor Code: ${escapeHtml(data.investorCode)}</p>

      <!-- Fund info grey box -->
      <div style="border:1px solid #ccc;padding:4mm 6mm;margin-bottom:4mm;background:${GREY_BG};">
        <h2 style="font-family:${FONT};font-size:13pt;font-weight:700;color:#000;text-align:center;margin:0 0 2mm 0;">${escapeHtml(data.fundName.toUpperCase())}</h2>
        <p style="font-family:${FONT};font-size:9pt;color:#444;text-align:center;margin:0 0 3mm 0;">
          Registered under the Bangladesh Securities &amp; Exchange Commission (Mutual Fund) Rules, 2001.
        </p>
        <table style="width:80%;margin:0 auto;font-family:${FONT};font-size:9.5pt;border-collapse:collapse;">
          <tbody>
            <tr>
              <td style="padding:1px 0;font-weight:600;width:35%;">Registration No</td>
              <td style="padding:1px 6px;width:5%;">:</td>
              <td style="padding:1px 0;">${escapeHtml(regNo)}</td>
            </tr>
            <tr>
              <td style="padding:1px 0;font-weight:600;">Sponsor</td>
              <td style="padding:1px 6px;">:</td>
              <td style="padding:1px 0;">Ekush Wealth Management Limited</td>
            </tr>
            <tr>
              <td style="padding:1px 0;font-weight:600;">Asset Manager</td>
              <td style="padding:1px 6px;">:</td>
              <td style="padding:1px 0;">Ekush Wealth Management Limited</td>
            </tr>
            <tr>
              <td style="padding:1px 0;font-weight:600;">Trustee</td>
              <td style="padding:1px 6px;">:</td>
              <td style="padding:1px 0;">Sandhani Life Insurance Co. Ltd</td>
            </tr>
            <tr>
              <td style="padding:1px 0;font-weight:600;">Custodian</td>
              <td style="padding:1px 6px;">:</td>
              <td style="padding:1px 0;">BRAC Bank Limited</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Units / Avg Cost row -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:3mm;">
        <tbody>
          <tr>
            <td style="border-top:2px solid #000;border-bottom:1px solid #000;padding:5px 10px;font-family:${FONT};font-size:10pt;font-weight:700;width:25%;">Number of Units</td>
            <td style="border-top:2px solid #000;border-bottom:1px solid #000;padding:5px 10px;font-family:${FONT};font-size:10pt;width:25%;text-align:right;">${fmt0(data.totalUnits)}</td>
            <td style="border-top:2px solid #000;border-bottom:1px solid #000;padding:5px 10px;font-family:${FONT};font-size:10pt;font-weight:700;width:25%;">Average Cost/Unit</td>
            <td style="border-top:2px solid #000;border-bottom:1px solid #000;padding:5px 10px;font-family:${FONT};font-size:10pt;width:25%;text-align:right;">${data.avgCost.toFixed(3)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Investment Results -->
      <div style="margin-bottom:3mm;">
        <div style="border-bottom:3px double #000;padding-bottom:2px;margin-bottom:2mm;">
          <span style="font-family:${FONT};font-size:11pt;font-weight:400;">Investment Results:</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-family:${FONT};font-size:9.5pt;white-space:nowrap;">
          <tbody>
            <tr>
              <td style="border-bottom:1px solid #000;padding:4px 4px 4px 0;width:28%;">Cost Value of Investment</td>
              <td style="border-bottom:1px solid #000;padding:4px 6px;width:18%;text-align:right;font-weight:700;">${fmt2(data.costValue)}</td>
              <td style="border-bottom:1px solid #000;padding:4px 6px;width:28%;">Capital Gain on Unit Sold</td>
              <td style="border-bottom:1px solid #000;padding:4px 0 4px 6px;width:18%;text-align:right;font-weight:700;">${fmt2(data.realizedGain)}</td>
            </tr>
            <tr>
              <td style="border-bottom:1px solid #000;padding:4px 4px 4px 0;">Wealth increased by</td>
              <td style="border-bottom:1px solid #000;padding:4px 6px;text-align:right;font-weight:700;">${fmt2(unrealizedGain)}</td>
              <td style="border-bottom:1px solid #000;padding:4px 6px;">Dividend Received</td>
              <td style="border-bottom:1px solid #000;padding:4px 0 4px 6px;text-align:right;font-weight:700;">${fmt2(data.dividendTotal)}</td>
            </tr>
            <tr>
              <td style="border-bottom:1px solid #000;padding:4px 4px 4px 0;">Current Value of Investment</td>
              <td style="border-bottom:1px solid #000;padding:4px 6px;text-align:right;font-weight:700;">${fmt2(data.marketValue)}</td>
              <td style="border-bottom:1px solid #000;padding:4px 6px;font-style:italic;background:${GREY_BG};">Total Value Creation</td>
              <td style="border-bottom:1px solid #000;padding:4px 0 4px 6px;text-align:right;font-weight:700;font-style:italic;background:${GREY_BG};">${fmt2(totalValueCreation)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- NAV paragraph -->
      <p style="font-family:${FONT};font-size:10pt;color:#000;margin:6mm 0 4mm 0;">
        The current Net Asset Value (NAV) per unit, together with the applicable buy and sale prices of the fund, is presented below:
      </p>

      <!-- NAV table -->
      <table style="width:80%;border-collapse:collapse;margin:0 auto;">
        <thead>
          <tr>
            <td style="border-top:2px solid #000;border-bottom:2px solid #000;padding:6px 10px;text-align:center;font-family:${FONT};font-size:10pt;font-weight:700;background:${GREY_BG};width:33%;">NAV</td>
            <td style="border-top:2px solid #000;border-bottom:2px solid #000;padding:6px 10px;text-align:center;font-family:${FONT};font-size:10pt;font-weight:700;background:${GREY_BG};width:33%;">Buy Price</td>
            <td style="border-top:2px solid #000;border-bottom:2px solid #000;padding:6px 10px;text-align:center;font-family:${FONT};font-size:10pt;font-weight:700;background:${GREY_BG};width:33%;">Sale Price</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border-bottom:2px solid #000;padding:6px 10px;text-align:center;font-family:${FONT};font-size:10pt;">${data.nav.toFixed(3)}</td>
            <td style="border-bottom:2px solid #000;padding:6px 10px;text-align:center;font-family:${FONT};font-size:10pt;">${buyPrice.toFixed(3)}</td>
            <td style="border-bottom:2px solid #000;padding:6px 10px;text-align:center;font-family:${FONT};font-size:10pt;">${sellPrice.toFixed(3)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Orange footer strip -->
      <div style="position:absolute;bottom:0;left:0;right:0;background:${ORANGE};color:#fff;padding:3mm 6mm;display:flex;justify-content:space-between;font-family:${FONT};font-size:8pt;">
        <span>+8801713-086101</span>
        <span>info@ekushwml.com</span>
        <span>Apt-A3, House: 17, Road: 01, Block: A, Niketon, Gulshan 01, Dhaka-1212</span>
        <span>www.ekushwml.com</span>
      </div>
    </div>
  </div>
  `.trim();
}

export function buildPortfolioStatementSingleFundFullHtml(
  data: PortfolioStatementSingleFundData,
): string {
  const body = buildPortfolioStatementSingleFundBody(data);
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
