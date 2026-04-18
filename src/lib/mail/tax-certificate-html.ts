// Tax Certificate HTML builder — single source of truth for both the
// investor-facing print page (/forms/tax-certificate) and the admin PDF
// download + bulk-mail attachment. Keeping these in lockstep means design
// tweaks automatically flow everywhere.
//
// Callers that embed this in the browser can leave `bannerDataUrl` unset —
// the browser will resolve /banner_for_portfolio.png directly. Puppeteer-
// based server rendering should pass a data URL so setContent() doesn't
// need network access back to the origin.

export interface TaxCertificateData {
  // Investor
  investorName: string;
  investorCode: string;
  investorTitle: string | null; // "Mr.", "Ms.", etc.
  nidNumber: string | null;
  tinNumber: string | null;

  // Fund
  fundCode: string;
  fundName: string;

  // Period
  periodStart: Date | null;
  periodEnd: Date | null;

  // Cert figures
  beginningCostValue: number;
  endingCostValue: number;
  beginningMarketValue: number;
  endingMarketValue: number;
  beginningUnrealizedGain: number;
  endingUnrealizedGain: number;
  totalRealizedGain: number;
  totalAdditionAtCost: number;
  totalRedemptionAtCost: number;
  netInvestment: number;
  totalGrossDividend: number;
  totalTax: number;
  totalNetDividend: number;

  bannerDataUrl?: string; // falls back to /banner_for_portfolio.png
}

const FUND_REG: Record<string, { regNo: string }> = {
  EFUF: { regNo: "BSEC/Mutual Fund/2019/106" },
  EGF: { regNo: "BSEC/Mutual Fund/2022/129" },
  ESRF: { regNo: "BSEC/Mutual Fund/2022/130" },
};

// Chalan details are per-fund and not stored on TaxCertificate. Kept here
// for now; move to a Fund field when the operations team needs to edit them.
const CHALAN_INFO: Record<string, { number: string; date: string }> = {
  EFUF: { number: "2425-00302670771", date: "April 22, 2025" },
  EGF: { number: "2425-00302681821", date: "April 22, 2025" },
};

const ORANGE = "#F27023";
const GREY_BG = "#f0f0f0";
const YELLOW_BG = "#fffde7";
const FONT = "Arial, Helvetica, sans-serif";

function fmt(n: number): string {
  if (n === 0) return "-";
  return Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDateShort(d: Date | null): string {
  if (!d) return "N/A";
  return d.toLocaleDateString("en-GB", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildTaxCertificateBody(data: TaxCertificateData): string {
  const bannerSrc = data.bannerDataUrl ?? "/banner_for_portfolio.png";
  const regInfo = FUND_REG[data.fundCode] || FUND_REG.EFUF;
  const chalan = CHALAN_INFO[data.fundCode];

  const title = data.investorTitle || "Mr./Ms.";
  const issueYear = data.periodEnd
    ? new Date(data.periodEnd).getFullYear()
    : new Date().getFullYear();
  const issueDate = `1st July ${issueYear}`;

  const cellTd =
    "border:1px solid #000;padding:3px 8px;font-family:" + FONT + ";font-size:10pt;";
  const cellTdRight = cellTd + "text-align:right;background:" + YELLOW_BG + ";";
  const cellTdHeader =
    "border:1px solid #000;padding:4px 8px;font-weight:700;font-family:" +
    FONT +
    ";font-size:10pt;";

  const rows = [
    ["Registration No", regInfo.regNo],
    ["Sponsor", "Ekush Wealth Management Limited"],
    ["Asset Manager", "Ekush Wealth Management Limited"],
    ["Trustee", "Sandhani Life Insurance Co. Ltd"],
    ["Custodian", "BRAC Bank Limited"],
  ]
    .map(
      ([label, val]) => `
        <tr>
          <td style="padding:1px 0;font-weight:600;width:35%;">${escapeHtml(label)}</td>
          <td style="padding:1px 6px;width:5%;">:</td>
          <td style="padding:1px 0;">${escapeHtml(val)}</td>
        </tr>`,
    )
    .join("");

  return `
  <div
    id="tax-cert"
    class="print-page"
    style="width:210mm;min-height:297mm;margin:0 auto;background:#fff;font-family:${FONT};font-size:11pt;color:#000;line-height:1.5;position:relative;"
  >
    <!-- Banner -->
    <img src="${bannerSrc}" alt="" style="width:100%;display:block;" crossorigin="anonymous" />

    <div style="padding:6mm 20mm 20mm 20mm;">

      <!-- Date -->
      <p style="font-weight:700;margin:0 0 4mm 0;">${issueDate}</p>

      <!-- Investor -->
      <p style="font-weight:700;margin:0;">${escapeHtml(title)} ${escapeHtml(data.investorName)}</p>
      <p style="font-size:10pt;margin:0;">National ID: ${escapeHtml(data.nidNumber || "N/A")}</p>
      <p style="font-size:10pt;margin:0 0 6mm 0;">TIN: ${escapeHtml(data.tinNumber || "N/A")}</p>

      <!-- Fund info box -->
      <div style="border:1px solid #999;padding:4mm 6mm;margin-bottom:5mm;background:${GREY_BG};">
        <h2 style="font-size:12pt;font-weight:700;text-align:center;margin:0 0 2mm 0;">${escapeHtml(data.fundName.toUpperCase())}</h2>
        <p style="font-size:9pt;text-align:center;color:#444;margin:0 0 3mm 0;">
          Registered under the Bangladesh Securities &amp; Exchange Commission (Mutual Fund) Rules, 2001.
        </p>
        <table style="width:80%;margin:0 auto;font-size:9.5pt;border-collapse:collapse;">
          <tbody>${rows}</tbody>
        </table>
      </div>

      <!-- To Whom It May Concern -->
      <h3 style="font-size:13pt;font-weight:700;text-align:center;margin:0 0 3mm 0;">To Whom It May Concern</h3>
      <p style="font-size:10pt;text-align:justify;margin:0 0 4mm 0;">
        This is to certify <strong>${escapeHtml(title)} ${escapeHtml(data.investorName)}</strong> is a registered unit holder of <strong>${escapeHtml(data.fundName)}</strong>.
        His/Her detailed information regarding investment in the fund is given below:
      </p>

      <!-- Investment Period + Code -->
      <table style="font-size:10pt;margin:0 0 4mm 0;">
        <tbody>
          <tr>
            <td style="font-weight:600;padding-right:8px;">Investment Period</td>
            <td style="padding-right:8px;">:</td>
            <td style="font-weight:700;">${escapeHtml(fmtDateShort(data.periodStart))} to ${escapeHtml(fmtDateShort(data.periodEnd))}</td>
          </tr>
          <tr>
            <td style="font-weight:600;padding-right:8px;">Investor Code</td>
            <td style="padding-right:8px;">:</td>
            <td style="font-weight:700;">${escapeHtml(data.investorCode)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Main Particulars table -->
      <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:4mm;">
        <thead>
          <tr style="background:#333;color:#fff;">
            <td style="${cellTdHeader}">Particulars</td>
            <td style="${cellTdHeader}text-align:right;">Beginning of Period</td>
            <td style="${cellTdHeader}text-align:right;">End of Period</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="${cellTd}">Cost Value</td>
            <td style="${cellTdRight}">${fmt(data.beginningCostValue)}</td>
            <td style="${cellTdRight}">${fmt(data.endingCostValue)}</td>
          </tr>
          <tr>
            <td style="${cellTd}">Market Value</td>
            <td style="${cellTdRight}">${fmt(data.beginningMarketValue)}</td>
            <td style="${cellTdRight}">${fmt(data.endingMarketValue)}</td>
          </tr>
          <tr>
            <td style="${cellTd}">Unrealized Gain</td>
            <td style="${cellTdRight}">${fmt(data.beginningUnrealizedGain)}</td>
            <td style="${cellTdRight}">${fmt(data.endingUnrealizedGain)}</td>
          </tr>
        </tbody>
      </table>

      <!-- During the Period -->
      <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:4mm;">
        <thead>
          <tr style="background:${GREY_BG};">
            <td colspan="2" style="${cellTdHeader}">During the Period</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="${cellTd}width:70%;">Total Realized Gain during the Period</td>
            <td style="${cellTdRight}">${fmt(data.totalRealizedGain)}</td>
          </tr>
          <tr>
            <td style="${cellTd}">Total Addition during the Period</td>
            <td style="${cellTdRight}">${fmt(data.totalAdditionAtCost)}</td>
          </tr>
          <tr>
            <td style="${cellTd}">Total Redemption during the Period</td>
            <td style="${cellTdRight}">${fmt(data.totalRedemptionAtCost)}</td>
          </tr>
          <tr>
            <td style="${cellTd}">Net Investment (Net of Addition and Redemption) during the Period</td>
            <td style="${cellTdRight}font-weight:700;">${fmt(data.netInvestment)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Dividend Summary -->
      <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:4mm;">
        <thead>
          <tr style="background:${GREY_BG};">
            <td colspan="2" style="${cellTdHeader}">Dividend Summary</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="${cellTd}width:70%;">Gross Dividend</td>
            <td style="${cellTdRight}">${fmt(data.totalGrossDividend)}</td>
          </tr>
          <tr>
            <td style="${cellTd}">Tax Deducted at Source</td>
            <td style="${cellTdRight}">${fmt(data.totalTax)}</td>
          </tr>
          <tr>
            <td style="${cellTd}">Net Dividend</td>
            <td style="${cellTdRight}font-weight:700;">${fmt(data.totalNetDividend)}</td>
          </tr>
        </tbody>
      </table>

      ${chalan ? `
      <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:4mm;">
        <tbody>
          <tr>
            <td style="${cellTd}width:70%;">Chalan Number</td>
            <td style="${cellTdRight}">${escapeHtml(chalan.number)}</td>
          </tr>
          <tr>
            <td style="${cellTd}">Chalan Date</td>
            <td style="${cellTdRight}">${escapeHtml(chalan.date)}</td>
          </tr>
        </tbody>
      </table>` : ""}

      <p style="font-size:8pt;color:#666;margin-top:6mm;">
        This certificate is issued for income tax purposes as per NBR requirements.<br />
        Ekush Wealth Management Ltd | Licensed by BSEC | www.ekushwml.com
      </p>
    </div>

    <!-- Orange footer -->
    <div style="position:absolute;bottom:0;left:0;right:0;background:${ORANGE};color:#fff;padding:3mm 6mm;display:flex;justify-content:space-between;font-size:8pt;">
      <span>+8801713-086101</span>
      <span>info@ekushwml.com</span>
      <span>Apt-A3, House: 17, Road: 01, Block: A, Niketon, Gulshan 01, Dhaka-1212</span>
      <span>www.ekushwml.com</span>
    </div>
  </div>
  `.trim();
}

export function buildTaxCertificateFullHtml(data: TaxCertificateData): string {
  const body = buildTaxCertificateBody(data);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Tax Certificate</title>
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
