import chromium from "@sparticuz/chromium-min";
import puppeteerCore, { type Browser } from "puppeteer-core";

// Remote URL that hosts a pre-packaged chromium binary compatible with the
// @sparticuz/chromium-min version installed. This keeps the Vercel bundle
// small; the binary is downloaded and cached on cold start.
const REMOTE_CHROMIUM_PACK =
  "https://github.com/Sparticuz/chromium/releases/download/v147.0.1/chromium-v147.0.1-pack.x64.tar";

// On a local dev machine we fall back to a locally-installed chromium
// if one is discoverable. In production (Vercel) we always use the
// serverless-optimised binary from @sparticuz/chromium-min.
async function resolveExecutablePath(): Promise<string> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return await chromium.executablePath(REMOTE_CHROMIUM_PACK);
  }
  // Local dev — prefer a system Chrome if CHROME_PATH is set, otherwise
  // fall back to downloading the sparticuz binary.
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  return await chromium.executablePath(REMOTE_CHROMIUM_PACK);
}

async function launchBrowser(): Promise<Browser> {
  const executablePath = await resolveExecutablePath();
  return puppeteerCore.launch({
    args: chromium.args,
    defaultViewport: { width: 1240, height: 1754 }, // ~A4 @ 150dpi
    executablePath,
    headless: true,
  });
}

// Render one HTML document to an A4-portrait PDF buffer. Callers should
// inline all CSS and reference any images via data URLs, since Puppeteer
// opens the page with `setContent` (no origin) and network fetches to
// relative paths will 404.
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30_000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// Same as renderHtmlToPdf but reuses a single browser across N documents —
// useful for mail-center batches so we don't pay the ~3-5s launch cost per
// investor.
export async function renderHtmlBatchToPdfs(htmls: string[]): Promise<Buffer[]> {
  const browser = await launchBrowser();
  try {
    const results: Buffer[] = [];
    for (const html of htmls) {
      const page = await browser.newPage();
      try {
        await page.setContent(html, { waitUntil: "networkidle0", timeout: 30_000 });
        const pdf = await page.pdf({
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        });
        results.push(Buffer.from(pdf));
      } finally {
        await page.close();
      }
    }
    return results;
  } finally {
    await browser.close();
  }
}
