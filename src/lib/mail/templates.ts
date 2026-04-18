// Email templates. HTML kept minimal — works in most clients.

export interface PortfolioStatementVars {
  investorName: string;
  investorCode: string;
  fundName: string;   // e.g. "EKUSH FIRST UNIT FUND"
  fundCode: string;   // e.g. "EFUF"
}

export function portfolioStatementEmail(v: PortfolioStatementVars): {
  subject: string;
  html: string;
} {
  return {
    subject: `${v.fundName} | Investment Update`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000; line-height: 1.55;">
        <p>Dear Valued Investor,</p>
        <p>We hope this email finds you well.</p>
        <p>
          Please find attached the latest update regarding your investment
          (Investor ID: <strong>${v.investorCode}</strong>) in <strong>${v.fundName}</strong>.
        </p>
        <p>
          If you have any questions or require further assistance, please feel free to
          contact our representatives at <strong>01906-440541</strong> or <strong>01303-957569</strong>.
        </p>
        <p style="margin-top: 18px;">Warm regards,<br />EKUSH Wealth Management Limited</p>
      </div>
    `.trim(),
  };
}

export interface TaxCertificateVars {
  investorName: string;
  investorCode: string;
  fundName: string;
  assessmentYear: string; // e.g. "2024 - 25"
}

export function taxCertificateEmail(v: TaxCertificateVars): {
  subject: string;
  html: string;
} {
  return {
    subject: `Tax Certificate — ${v.fundName} (${v.assessmentYear})`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000; line-height: 1.55;">
        <p>Dear Valued Investor,</p>
        <p>
          Please find attached your Tax Certificate for assessment year
          <strong>${v.assessmentYear}</strong> in respect of your investment
          (Investor ID: <strong>${v.investorCode}</strong>) in <strong>${v.fundName}</strong>.
        </p>
        <p>
          This certificate is issued for income tax purposes as per NBR
          requirements. Please retain it for your records and submit it with
          your annual tax filings where applicable.
        </p>
        <p>
          For any questions, contact our representatives at
          <strong>01906-440541</strong> or <strong>01303-957569</strong>.
        </p>
        <p style="margin-top: 18px;">Warm regards,<br />EKUSH Wealth Management Limited</p>
      </div>
    `.trim(),
  };
}

export const TEMPLATE_OPTIONS = [
  { id: "EFUF_PORTFOLIO", label: "EFUF Investment Update", fundCode: "EFUF", fundName: "EKUSH FIRST UNIT FUND" },
  { id: "EGF_PORTFOLIO", label: "EGF Investment Update", fundCode: "EGF", fundName: "EKUSH GROWTH FUND" },
  { id: "ESRF_PORTFOLIO", label: "ESRF Investment Update", fundCode: "ESRF", fundName: "EKUSH STABLE RETURN FUND" },
  { id: "TAX_CERT", label: "Tax Certificate", fundCode: null, fundName: null },
  { id: "WELCOME", label: "Welcome Email (template pending)", fundCode: null, fundName: null },
];
