import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

const SETTING_KEY = "mail.smtp";

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return null;
  try {
    const cfg = JSON.parse(row.value) as SmtpConfig;
    if (!cfg.host || !cfg.user || !cfg.pass) return null;
    return cfg;
  } catch {
    return null;
  }
}

export async function saveSmtpConfig(cfg: SmtpConfig): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: JSON.stringify(cfg) },
    update: { value: JSON.stringify(cfg) },
  });
}

export async function makeTransport(): Promise<Transporter | null> {
  const cfg = await getSmtpConfig();
  if (!cfg) return null;
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer | string; contentType?: string }[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = await getSmtpConfig();
  if (!cfg) return { ok: false, error: "SMTP is not configured. Please set it up in Mail Settings." };
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  try {
    await transport.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments: opts.attachments,
    });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Send failed";
    return { ok: false, error: msg };
  }
}
