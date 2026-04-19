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

export interface WelcomeEmailVars {
  investorName: string;
  investorCode: string;
  investorEmail: string;
  investorType: string; // "Individual" | "Joint" | "Corporate" | …
  investorTitle: string | null; // "Mr." | "Ms." | …
  portalLoginUrl: string; // e.g. "https://ekush.aibd.ai/login"
}

const CONTACT_BLOCK_HTML = `
  <p style="margin:0 0 4px;"><strong>📞 Phone:</strong> +88 01713086101</p>
  <p style="margin:0 0 4px;"><strong>✉ Email:</strong> info@ekushwml.com</p>
  <p style="margin:0 0 4px;"><strong>📍 Office:</strong> Apt#A3, House no.17, Road #1, Niketan, Gulshan 1, Dhaka 1214</p>
  <p style="margin:0 0 4px;"><strong>🌐 Website:</strong> <a href="https://www.ekushwml.com" style="color:#F27023;">www.ekushwml.com</a></p>
  <p style="margin:0;"><strong>🕘 Office Hours:</strong> Sunday to Thursday, 10:00 AM – 6:00 PM</p>
`;

function salutationLine(v: WelcomeEmailVars): string {
  const prefix = v.investorTitle ? `${v.investorTitle} ` : "";
  return `${prefix}${v.investorName}`;
}

export function welcomeEmail(v: WelcomeEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Welcome to Ekush Wealth Management — Your Investor Account is Active (Code: ${v.investorCode})`;
  const greeting = salutationLine(v);

  const html = `
    <div style="font-family:'Segoe UI', Arial, sans-serif;font-size:14px;color:#0D0D0D;line-height:1.6;background:#F5F5F5;padding:24px 0;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#F28C28 0%,#E87722 100%);padding:28px 24px;text-align:center;color:#fff;">
          <h1 style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.2px;">Welcome to Ekush Wealth Management</h1>
          <p style="margin:6px 0 0;font-size:13px;opacity:0.95;">Your investor account is now active</p>
        </div>

        <div style="padding:28px 28px 8px;">
          <p style="margin:0 0 14px;">Dear <strong>${escapeHtml(greeting)}</strong>,</p>
          <p style="margin:0 0 14px;">Welcome to Ekush Wealth Management Limited. We're delighted to have you on board.</p>
          <p style="margin:0 0 20px;">Your registration has been reviewed and approved by our team. Your investor account is now <strong>ACTIVE</strong>, and you can access all the features of our investor portal.</p>

          <!-- Login credentials box (the key information) -->
          <div style="border:2px solid #F28C28;border-radius:10px;padding:20px;background:#FFF8F1;margin-bottom:20px;">
            <p style="margin:0 0 8px;font-size:12px;color:#6B4722;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Your Login Credentials</p>
            <p style="margin:0 0 6px;font-size:13px;">Investor Code</p>
            <p style="margin:0 0 14px;font-family:'SF Mono', Menlo, Consolas, monospace;font-size:22px;font-weight:700;color:#0D0D0D;background:#fff;border:1px solid #E8C69B;border-radius:6px;padding:10px 14px;display:inline-block;letter-spacing:1px;">${escapeHtml(v.investorCode)}</p>
            <p style="margin:0 0 14px;font-size:13px;">Registered Email: <strong>${escapeHtml(v.investorEmail)}</strong></p>
            <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#B45309;">⚠ You will log in using your Investor Code — not your email.</p>
            <p style="margin:0 0 12px;"><a href="${escapeHtml(v.portalLoginUrl)}" style="display:inline-block;background:#F28C28;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;font-size:14px;">Login to Your Portal →</a></p>
            <p style="margin:0;font-size:11px;color:#6B4722;">Keep this code safe and confidential. Never share it with anyone.</p>
          </div>

          <!-- Investor Details -->
          <div style="background:#F5F5F5;border-radius:8px;padding:16px 18px;margin-bottom:20px;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;">Your Investor Details</p>
            <p style="margin:0 0 4px;font-size:13px;"><strong>Investor Code:</strong> ${escapeHtml(v.investorCode)}</p>
            <p style="margin:0 0 4px;font-size:13px;"><strong>Name:</strong> ${escapeHtml(v.investorName)}</p>
            <p style="margin:0 0 4px;font-size:13px;"><strong>Email on File:</strong> ${escapeHtml(v.investorEmail)}</p>
            <p style="margin:0 0 4px;font-size:13px;"><strong>Account Status:</strong> <span style="display:inline-block;background:#DCFCE7;color:#166534;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;">Active</span></p>
            <p style="margin:0;font-size:13px;"><strong>Investor Type:</strong> ${escapeHtml(v.investorType)}</p>
          </div>

          <p style="margin:0 0 18px;font-size:13px;">Please quote your investor code <strong>${escapeHtml(v.investorCode)}</strong> in all future correspondence with us.</p>

          <!-- What You Can Do -->
          <h3 style="font-size:15px;margin:22px 0 8px;color:#0D0D0D;">What You Can Do on the Investor Portal</h3>
          <p style="margin:0 0 10px;font-size:13px;">Log in any time at <a href="${escapeHtml(v.portalLoginUrl)}" style="color:#F27023;">${escapeHtml(v.portalLoginUrl)}</a> using your investor code <strong>${escapeHtml(v.investorCode)}</strong>. From your dashboard you can:</p>
          <ul style="margin:0 0 20px 20px;padding:0;font-size:13px;line-height:1.7;">
            <li><strong>View your portfolio</strong> — See your current holdings, total cost, market value, and unrealized gain across all Ekush funds in real time</li>
            <li><strong>Buy units</strong> — Subscribe to any of our mutual funds directly from the portal with just a few clicks</li>
            <li><strong>Redeem units</strong> — Submit redemption requests online without paperwork</li>
            <li><strong>Set up SIPs</strong> — Create and manage Systematic Investment Plans to invest automatically on a monthly schedule</li>
            <li><strong>Download statements</strong> — Access your transaction history, dividend records, and annual tax certificates any time</li>
            <li><strong>Track dividends</strong> — See every dividend credited, TDS deducted, and chalan details for your tax filing</li>
            <li><strong>Update your profile</strong> — Change your contact information, nominee details, or bank account as needed</li>
          </ul>

          <!-- Weekly NAV Update -->
          <div style="background:#FFFBEB;border-left:4px solid #F28C28;padding:14px 16px;margin:0 0 20px;">
            <p style="margin:0 0 8px;font-size:14px;font-weight:700;">Weekly NAV Update — Stay Informed</p>
            <p style="margin:0 0 8px;font-size:13px;">Every week you'll receive a Weekly NAV Update email from us covering all Ekush funds, including:</p>
            <ul style="margin:0 0 8px 20px;padding:0;font-size:13px;">
              <li>Latest Net Asset Value (NAV) per unit for each fund</li>
              <li>Key portfolio highlights</li>
              <li>Market commentary from our research team</li>
              <li>Dividend announcements and upcoming corporate actions</li>
            </ul>
            <p style="margin:0;font-size:12px;color:#6B5800;">You can unsubscribe any time from your profile settings, but we recommend staying subscribed to keep informed.</p>
          </div>

          <!-- Fund Lineup -->
          <h3 style="font-size:15px;margin:22px 0 8px;">Our Fund Lineup</h3>
          <p style="margin:0 0 20px;font-size:13px;">Ekush Wealth Management currently manages several mutual funds registered with the Bangladesh Securities &amp; Exchange Commission, including the Ekush First Unit Fund and Ekush Growth Fund. Each fund has a distinct investment mandate — from income-focused to growth-oriented — so you can choose what aligns with your financial goals. Fund factsheets are available on the portal.</p>

          <!-- Need Help -->
          <h3 style="font-size:15px;margin:22px 0 8px;">Need Help?</h3>
          <div style="background:#F5F5F5;border-radius:8px;padding:14px 16px;font-size:13px;margin-bottom:16px;">
            ${CONTACT_BLOCK_HTML}
          </div>
          <p style="margin:0 0 18px;font-size:12px;color:#555;">When contacting us, please always mention your Investor Code (<strong>${escapeHtml(v.investorCode)}</strong>) so our team can assist you faster.</p>

          <p style="margin:0 0 6px;font-size:13px;">Thank you for choosing Ekush Wealth Management as your investment partner. We look forward to helping you grow your wealth.</p>
          <p style="margin:18px 0 4px;font-size:13px;">Warm regards,</p>
          <p style="margin:0 0 24px;font-size:13px;font-weight:700;">Team Ekush Wealth Management Limited</p>
        </div>

        <!-- Orange footer strip -->
        <div style="background:linear-gradient(90deg,#F28C28 0%,#E87722 100%);color:#fff;padding:14px 22px;font-size:11px;text-align:center;">
          <p style="margin:0 0 4px;"><strong>Ekush Wealth Management Limited</strong></p>
          <p style="margin:0;">+88 01713086101 · info@ekushwml.com · www.ekushwml.com</p>
        </div>

        <!-- Legal footnote -->
        <div style="padding:14px 22px;font-size:11px;color:#777;line-height:1.5;">
          <p style="margin:0 0 6px;">This is an automated message sent upon account approval. If you did not register for an Ekush investor account, please contact us immediately at <a href="mailto:info@ekushwml.com" style="color:#F27023;">info@ekushwml.com</a>.</p>
          <p style="margin:0;">For your security, never share your Investor Code with anyone. Ekush Wealth Management will never ask for your password or full credentials over phone or email.</p>
        </div>
      </div>
    </div>
  `.trim();

  const text = `
Welcome to Ekush Wealth Management Limited

Dear ${greeting},

Welcome to Ekush Wealth Management Limited. Your registration has been reviewed and approved. Your investor account is now ACTIVE.

YOUR LOGIN CREDENTIALS
----------------------
Investor Code:    ${v.investorCode}
Registered Email: ${v.investorEmail}

IMPORTANT: You will log in using your Investor Code (${v.investorCode}) — not your email. Keep this code safe and confidential.

Login: ${v.portalLoginUrl}

YOUR INVESTOR DETAILS
---------------------
Investor Code:    ${v.investorCode}
Name:             ${v.investorName}
Email on File:    ${v.investorEmail}
Account Status:   Active
Investor Type:    ${v.investorType}

Please quote your investor code ${v.investorCode} in all future correspondence with us.

WHAT YOU CAN DO ON THE INVESTOR PORTAL
Log in any time at ${v.portalLoginUrl} using your investor code ${v.investorCode}. From your dashboard you can:
  - View your portfolio in real time
  - Buy units in any of our mutual funds
  - Redeem units online without paperwork
  - Set up SIPs on a monthly schedule
  - Download statements, transaction history, and tax certificates
  - Track dividends, TDS, and chalan details
  - Update your profile, nominee, and bank details

WEEKLY NAV UPDATE
Every week you'll receive a NAV update covering all Ekush funds: latest NAV per unit, portfolio highlights, market commentary, and dividend announcements. You can unsubscribe any time from your profile settings.

NEED HELP?
Phone:   +88 01713086101
Email:   info@ekushwml.com
Office:  Apt#A3, House no.17, Road #1, Niketan, Gulshan 1, Dhaka 1214
Website: www.ekushwml.com
Hours:   Sunday – Thursday, 10:00 AM – 6:00 PM

Always mention your Investor Code (${v.investorCode}) when contacting support.

Warm regards,
Team Ekush Wealth Management Limited

---
This is an automated message sent upon account approval. If you did not register for an Ekush investor account, contact info@ekushwml.com immediately.
For your security, never share your Investor Code. Ekush Wealth Management will never ask for your password or full credentials over phone or email.
  `.trim();

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function staffInviteEmail(v: {
  fullName: string;
  role: string;
  acceptUrl: string;
  expiresIn: string; // e.g. "24 hours"
  inviterName: string;
  note?: string;
}): { subject: string; html: string; text: string } {
  const subject = `You've been invited to Ekush Wealth Management Admin (${v.role})`;
  const html = `
    <div style="font-family:'Segoe UI', Arial, sans-serif;font-size:14px;color:#0D0D0D;line-height:1.6;background:#F5F5F5;padding:24px 0;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <div style="background:linear-gradient(135deg,#F28C28 0%,#E87722 100%);padding:24px;color:#fff;text-align:center;">
          <h1 style="margin:0;font-size:18px;font-weight:700;">Ekush Wealth Management Admin</h1>
          <p style="margin:6px 0 0;font-size:13px;opacity:0.95;">Team invitation</p>
        </div>
        <div style="padding:24px;">
          <p>Hi ${escapeHtml(v.fullName)},</p>
          <p><strong>${escapeHtml(v.inviterName)}</strong> has invited you to the Ekush Wealth Management admin portal as <strong>${escapeHtml(v.role)}</strong>.</p>
          ${v.note ? `<p style="background:#FFFBEB;border-left:3px solid #F28C28;padding:10px 14px;margin:14px 0;font-size:13px;">${escapeHtml(v.note)}</p>` : ""}
          <p>Click the button below to set your password and finish creating your account. The link expires in ${escapeHtml(v.expiresIn)}.</p>
          <p style="text-align:center;margin:22px 0;"><a href="${escapeHtml(v.acceptUrl)}" style="display:inline-block;background:#F28C28;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">Accept invitation</a></p>
          <p style="font-size:11px;color:#777;">If the button doesn't work, paste this link into your browser:<br/><a href="${escapeHtml(v.acceptUrl)}" style="color:#F28C28;word-break:break-all;">${escapeHtml(v.acceptUrl)}</a></p>
          <p style="margin-top:24px;font-size:12px;color:#555;">If you weren't expecting this invitation, you can safely ignore it.</p>
        </div>
      </div>
    </div>
  `.trim();

  const text = `
Ekush Wealth Management Admin — team invitation

Hi ${v.fullName},

${v.inviterName} has invited you to the Ekush admin portal as ${v.role}.
${v.note ? `\nNote from the inviter:\n${v.note}\n` : ""}
Open this link to set your password and finish creating your account:
${v.acceptUrl}

The link expires in ${v.expiresIn}. If you weren't expecting this invitation, you can ignore it.
  `.trim();

  return { subject, html, text };
}

export function passwordResetEmail(v: {
  fullName: string;
  resetUrl: string;
  expiresIn: string;
}): { subject: string; html: string; text: string } {
  const subject = "Reset your Ekush Wealth Management Admin password";
  const html = `
    <div style="font-family:'Segoe UI', Arial, sans-serif;font-size:14px;color:#0D0D0D;line-height:1.6;background:#F5F5F5;padding:24px 0;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <div style="background:linear-gradient(135deg,#F28C28 0%,#E87722 100%);padding:24px;color:#fff;text-align:center;">
          <h1 style="margin:0;font-size:18px;font-weight:700;">Reset your password</h1>
        </div>
        <div style="padding:24px;">
          <p>Hi ${escapeHtml(v.fullName)},</p>
          <p>We received a request to reset your password. If that was you, click the button below to choose a new one. The link expires in ${escapeHtml(v.expiresIn)}.</p>
          <p style="text-align:center;margin:22px 0;"><a href="${escapeHtml(v.resetUrl)}" style="display:inline-block;background:#F28C28;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">Reset password</a></p>
          <p style="font-size:11px;color:#777;">If the button doesn't work, paste this link into your browser:<br/><a href="${escapeHtml(v.resetUrl)}" style="color:#F28C28;word-break:break-all;">${escapeHtml(v.resetUrl)}</a></p>
          <p style="margin-top:24px;font-size:12px;color:#555;">If you didn't request this reset, ignore this message and your password will stay the same.</p>
        </div>
      </div>
    </div>
  `.trim();
  const text = `Reset your Ekush admin password\n\nHi ${v.fullName},\n\nOpen this link to set a new password (expires in ${v.expiresIn}):\n${v.resetUrl}\n\nIf you didn't request this, ignore this message.`;
  return { subject, html, text };
}

export const TEMPLATE_OPTIONS = [
  { id: "EFUF_PORTFOLIO", label: "EFUF Investment Update", fundCode: "EFUF", fundName: "EKUSH FIRST UNIT FUND" },
  { id: "EGF_PORTFOLIO", label: "EGF Investment Update", fundCode: "EGF", fundName: "EKUSH GROWTH FUND" },
  { id: "ESRF_PORTFOLIO", label: "ESRF Investment Update", fundCode: "ESRF", fundName: "EKUSH STABLE RETURN FUND" },
  { id: "TAX_CERT", label: "Tax Certificate", fundCode: null, fundName: null },
  { id: "WELCOME", label: "Welcome Email", fundCode: null, fundName: null },
];
