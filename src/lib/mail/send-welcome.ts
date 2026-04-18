import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/smtp";
import { welcomeEmail } from "@/lib/mail/templates";

const PORTAL_LOGIN_URL =
  process.env.NEXT_PUBLIC_PORTAL_LOGIN_URL ||
  `${process.env.NEXTAUTH_URL || "https://ekush.aibd.ai"}/login`;

export interface SendWelcomeResult {
  ok: boolean;
  error?: string;
}

// Renders + sends the welcome email for the given investor, logs to MailLog,
// and (on success) stamps investor.welcomeEmailSentAt. Does NOT re-check
// whether it's already been sent — callers do that.
export async function sendWelcomeEmailForInvestor(
  investorId: string,
  opts: { sentById?: string } = {},
): Promise<SendWelcomeResult> {
  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    include: { user: { select: { email: true } } },
  });
  if (!investor) return { ok: false, error: "Investor not found" };
  if (!investor.user.email) return { ok: false, error: "Investor has no email on file" };

  const { subject, html, text } = welcomeEmail({
    investorName: investor.name,
    investorCode: investor.investorCode,
    investorEmail: investor.user.email,
    investorType: investor.investorType,
    investorTitle: investor.title,
    portalLoginUrl: PORTAL_LOGIN_URL,
  });

  const result = await sendMail({
    to: investor.user.email,
    subject,
    html,
    text,
  });

  await prisma.mailLog.create({
    data: {
      investorId: investor.id,
      toEmail: investor.user.email,
      subject,
      template: "WELCOME",
      status: result.ok ? "SENT" : "FAILED",
      errorMessage: result.ok ? null : result.error,
      sentById: opts.sentById ?? null,
    },
  });

  if (result.ok) {
    await prisma.investor.update({
      where: { id: investor.id },
      data: { welcomeEmailSentAt: new Date() },
    });
  }

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
