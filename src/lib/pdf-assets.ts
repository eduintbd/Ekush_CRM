import fs from "fs";
import path from "path";

let cached: string | null = null;

// Load /public/banner_for_portfolio.png once and cache it as a
// data-URL so jsPDF's addImage can embed it without additional
// filesystem reads on each mail-send iteration.
export function getPortfolioBannerDataUrl(): string | null {
  if (cached !== null) return cached;
  try {
    const abs = path.join(process.cwd(), "public", "banner_for_portfolio.png");
    const buf = fs.readFileSync(abs);
    cached = `data:image/png;base64,${buf.toString("base64")}`;
    return cached;
  } catch {
    cached = "";
    return null;
  }
}
