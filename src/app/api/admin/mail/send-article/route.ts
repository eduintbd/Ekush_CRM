import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/smtp";
import { customArticleEmail } from "@/lib/mail/templates";

export const runtime = "nodejs";
// Larger attachments + per-investor sends — give the route headroom.
export const maxDuration = 60;

// Per-file and total caps so an admin can't accidentally upload a
// gigabyte of PDFs and try to fan it out to hundreds of investors.
// 10 MB / 25 MB matches the practical Gmail / Outlook attachment limit
// most receivers will accept.
const PER_FILE_LIMIT = 10 * 1024 * 1024;
const TOTAL_LIMIT = 25 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

/**
 * Custom Article mail-send endpoint.
 *
 * Accepts multipart/form-data so admin-uploaded PDF/JPG attachments
 * can ride along with the request without a separate blob-upload
 * round-trip. Body fields:
 *
 *   articleId    string
 *   investorIds  JSON-stringified string[]
 *   attachments  zero or more File entries (key = "attachments")
 *
 * Forks off /api/admin/mail/send instead of extending it because that
 * route is JSON-typed and runs heavy Puppeteer-based PDF rendering
 * inline; this flow needs neither.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const articleId = String(form.get("articleId") ?? "").trim();
  if (!articleId) {
    return NextResponse.json({ error: "articleId is required" }, { status: 400 });
  }

  const investorIdsRaw = String(form.get("investorIds") ?? "");
  let investorIds: string[];
  try {
    const parsed = JSON.parse(investorIdsRaw);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
    investorIds = parsed.filter((x): x is string => typeof x === "string");
    if (investorIds.length === 0) throw new Error();
  } catch {
    return NextResponse.json(
      { error: "investorIds must be a non-empty JSON array" },
      { status: 400 },
    );
  }

  const article = await prisma.marketCommentary.findUnique({
    where: { id: articleId },
  });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Read attachments. Files larger than the per-file cap, MIME types
  // outside the allowlist, or a total payload over the budget all
  // reject the whole batch — we'd rather error early than silently
  // drop attachments halfway through a fan-out.
  const attachmentEntries = form.getAll("attachments");
  const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
  let totalBytes = 0;
  for (const entry of attachmentEntries) {
    if (!(entry instanceof File)) continue;
    if (entry.size === 0) continue;
    if (entry.size > PER_FILE_LIMIT) {
      return NextResponse.json(
        { error: `Attachment "${entry.name}" exceeds the ${PER_FILE_LIMIT / 1024 / 1024} MB per-file limit.` },
        { status: 400 },
      );
    }
    const mime = entry.type || "application/octet-stream";
    if (!ALLOWED_MIME.has(mime.toLowerCase())) {
      return NextResponse.json(
        { error: `Attachment "${entry.name}" has unsupported type ${mime}. Allowed: PDF, JPG, PNG.` },
        { status: 400 },
      );
    }
    totalBytes += entry.size;
    if (totalBytes > TOTAL_LIMIT) {
      return NextResponse.json(
        { error: `Attachments total exceeds the ${TOTAL_LIMIT / 1024 / 1024} MB batch limit.` },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await entry.arrayBuffer());
    attachments.push({ filename: entry.name, content: buf, contentType: mime });
  }

  const investors = await prisma.investor.findMany({
    where: { id: { in: investorIds } },
    include: { user: { select: { email: true } } },
  });

  const adminId = (session.user as any).id as string;
  const results: Array<{
    investorId: string;
    investorCode: string;
    status: "SENT" | "FAILED" | "SKIPPED";
    error?: string;
  }> = [];

  for (const inv of investors) {
    if (!inv.user?.email) {
      results.push({
        investorId: inv.id,
        investorCode: inv.investorCode,
        status: "SKIPPED",
        error: "No email on file",
      });
      continue;
    }

    const { subject, html } = customArticleEmail({
      title: article.title,
      bodyText: article.content,
      category: article.category,
      investorName: inv.name,
      investorCode: inv.investorCode,
      hasAttachments: attachments.length > 0,
    });

    const r = await sendMail({
      to: inv.user.email,
      subject,
      html,
      // Attachments are reused per investor — same buffer references,
      // nodemailer copies them when sending.
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    const log = await prisma.mailLog.create({
      data: {
        investorId: inv.id,
        toEmail: inv.user.email,
        subject,
        // template field carries the article id so MailLog rows can be
        // grouped by article without a separate join column.
        template: `CUSTOM_ARTICLE:${article.id}`,
        status: r.ok ? "SENT" : "FAILED",
        errorMessage: r.ok ? null : r.error,
        sentById: adminId,
      },
    });

    results.push({
      investorId: inv.id,
      investorCode: inv.investorCode,
      status: r.ok ? "SENT" : "FAILED",
      error: r.ok ? undefined : r.error,
    });

    // Same SMTP-misconfigured short-circuit as the portfolio route:
    // bail on the whole batch and roll back the log row that recorded
    // the misleading "FAILED" status.
    if (!r.ok && r.error.startsWith("SMTP is not configured")) {
      await prisma.mailLog.delete({ where: { id: log.id } });
      return NextResponse.json(
        {
          error: "SMTP is not configured. Save valid credentials in Mail Settings first.",
          sent: 0,
          failed: 0,
          skipped: 0,
        },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({
    success: true,
    total: investors.length,
    sent: results.filter((r) => r.status === "SENT").length,
    failed: results.filter((r) => r.status === "FAILED").length,
    skipped: results.filter((r) => r.status === "SKIPPED").length,
    results,
  });
}
