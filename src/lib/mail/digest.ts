import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/smtp";

const RECIPIENTS_KEY = "notifications.recipients";
const LAST_SENT_KEY = "notifications.lastDigestSentAt";

export async function getRecipients(): Promise<string[]> {
  const row = await prisma.appSetting.findUnique({ where: { key: RECIPIENTS_KEY } });
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string" && x.includes("@"));
  } catch {
    return [];
  }
}

export async function saveRecipients(list: string[]): Promise<void> {
  const clean = Array.from(
    new Set(
      list
        .map((s) => (typeof s === "string" ? s.trim().toLowerCase() : ""))
        .filter((s) => s.includes("@")),
    ),
  );
  await prisma.appSetting.upsert({
    where: { key: RECIPIENTS_KEY },
    create: { key: RECIPIENTS_KEY, value: JSON.stringify(clean) },
    update: { value: JSON.stringify(clean) },
  });
}

async function getLastSentAt(): Promise<Date> {
  const row = await prisma.appSetting.findUnique({ where: { key: LAST_SENT_KEY } });
  if (row?.value) {
    const d = new Date(row.value);
    if (!isNaN(d.getTime())) return d;
  }
  // First run: look back 24h so the initial digest has a sane window.
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

async function setLastSentAt(d: Date): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: LAST_SENT_KEY },
    create: { key: LAST_SENT_KEY, value: d.toISOString() },
    update: { value: d.toISOString() },
  });
}

// BDT = Asia/Dhaka (UTC+6, no DST)
function formatBdt(d: Date): string {
  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

interface DigestData {
  registrations: Array<{ name: string; investorCode: string; createdAt: Date }>;
  buys: Array<{ investorCode: string; name: string; fundCode: string; amount: number; createdAt: Date }>;
  sells: Array<{ investorCode: string; name: string; fundCode: string; units: number; createdAt: Date }>;
  sips: Array<{ investorCode: string; name: string; fundCode: string; amount: number; createdAt: Date }>;
}

async function collectActivity(since: Date): Promise<DigestData> {
  const [investors, transactions, sipPlans] = await Promise.all([
    prisma.investor.findMany({
      where: { createdAt: { gt: since } },
      select: { name: true, investorCode: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.findMany({
      where: {
        createdAt: { gt: since },
        channel: "LS",
        direction: { in: ["BUY", "SELL"] },
      },
      select: {
        direction: true,
        amount: true,
        units: true,
        createdAt: true,
        investor: { select: { name: true, investorCode: true } },
        fund: { select: { code: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sipPlan.findMany({
      where: { createdAt: { gt: since } },
      select: {
        amount: true,
        createdAt: true,
        investor: { select: { name: true, investorCode: true } },
        fund: { select: { code: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const buys = transactions
    .filter((t) => t.direction === "BUY")
    .map((t) => ({
      investorCode: t.investor.investorCode,
      name: t.investor.name,
      fundCode: t.fund.code,
      amount: Number(t.amount),
      createdAt: t.createdAt,
    }));

  const sells = transactions
    .filter((t) => t.direction === "SELL")
    .map((t) => ({
      investorCode: t.investor.investorCode,
      name: t.investor.name,
      fundCode: t.fund.code,
      units: Number(t.units),
      createdAt: t.createdAt,
    }));

  return {
    registrations: investors,
    buys,
    sells,
    sips: sipPlans.map((s) => ({
      investorCode: s.investor.investorCode,
      name: s.investor.name,
      fundCode: s.fund.code,
      amount: Number(s.amount),
      createdAt: s.createdAt,
    })),
  };
}

function fmtBdt(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function section(title: string, rows: string[]): string {
  const body = rows.length === 0
    ? `<p style="margin: 4px 0 0 16px; color: #888; font-style: italic;">— none —</p>`
    : `<ul style="margin: 4px 0 0 16px; padding-left: 20px;">${rows
        .map((r) => `<li style="margin-bottom: 3px;">${r}</li>`)
        .join("")}</ul>`;
  return `
    <div style="margin-top: 14px;">
      <h3 style="margin: 0; font-size: 14px; color: #1e3a5f;">${title}</h3>
      ${body}
    </div>
  `;
}

function renderDigest(data: DigestData, windowStart: Date, windowEnd: Date): string {
  const regRows = data.registrations.map(
    (r) => `New investor — <strong>${escapeHtml(r.name)}</strong> submits form`,
  );
  const buyRows = data.buys.map(
    (r) =>
      `<span style="font-family: monospace;">${escapeHtml(r.investorCode)}</span> — ${escapeHtml(r.name)} · BDT ${fmtBdt(r.amount)} · ${escapeHtml(r.fundCode)}`,
  );
  const sellRows = data.sells.map(
    (r) =>
      `<span style="font-family: monospace;">${escapeHtml(r.investorCode)}</span> — ${escapeHtml(r.name)} · ${fmtBdt(r.units)} units · ${escapeHtml(r.fundCode)}`,
  );
  const sipRows = data.sips.map(
    (r) =>
      `<span style="font-family: monospace;">${escapeHtml(r.investorCode)}</span> — ${escapeHtml(r.name)} · BDT ${fmtBdt(r.amount)}/mo · ${escapeHtml(r.fundCode)}`,
  );

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111; line-height: 1.5;">
      <p style="margin: 0;">Activity window (BDT): <strong>${formatBdt(windowStart)}</strong> → <strong>${formatBdt(windowEnd)}</strong></p>
      ${section(`New investors (${data.registrations.length})`, regRows)}
      ${section(`Buy requests (${data.buys.length})`, buyRows)}
      ${section(`Sell requests (${data.sells.length})`, sellRows)}
      ${section(`SIP requests (${data.sips.length})`, sipRows)}
      <p style="margin-top: 20px; font-size: 11px; color: #888;">
        This is an automated digest from the Ekush admin portal.
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface DigestRunResult {
  skipped?: "no-recipients" | "no-activity";
  windowStart?: string;
  windowEnd?: string;
  counts?: { registrations: number; buys: number; sells: number; sips: number };
  mail?: { ok: boolean; error?: string };
}

// The two daily crons (10:00 and 16:00 BDT) invoke this. It queries
// activity since the last successful run, emails the digest, and
// advances the watermark. If there's nothing to report, it skips but
// still advances so the next window doesn't overlap.
export async function runDigest(): Promise<DigestRunResult> {
  const recipients = await getRecipients();
  if (recipients.length === 0) {
    return { skipped: "no-recipients" };
  }

  const windowStart = await getLastSentAt();
  const windowEnd = new Date();
  const data = await collectActivity(windowStart);

  const counts = {
    registrations: data.registrations.length,
    buys: data.buys.length,
    sells: data.sells.length,
    sips: data.sips.length,
  };
  const total = counts.registrations + counts.buys + counts.sells + counts.sips;

  if (total === 0) {
    // Advance the watermark so the next window starts from now.
    await setLastSentAt(windowEnd);
    return {
      skipped: "no-activity",
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      counts,
    };
  }

  const subject = `Ekush Activity Digest — ${formatBdt(windowEnd)}`;
  const html = renderDigest(data, windowStart, windowEnd);

  const r = await sendMail({
    to: recipients.join(", "),
    subject,
    html,
  });

  await prisma.mailLog.create({
    data: {
      investorId: null,
      toEmail: recipients.join(", "),
      subject,
      template: "NOTIFY_DIGEST",
      status: r.ok ? "SENT" : "FAILED",
      errorMessage: r.ok ? null : r.error,
    },
  });

  // Only advance the watermark on a successful send — if SMTP blew up we
  // want the next run to retry the same window.
  if (r.ok) await setLastSentAt(windowEnd);

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    counts,
    mail: r.ok ? { ok: true } : { ok: false, error: r.error },
  };
}
