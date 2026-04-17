import fs from "fs";
import path from "path";

function loadPublicPngAsDataUrl(filename: string): string | null {
  try {
    const abs = path.join(process.cwd(), "public", filename);
    const buf = fs.readFileSync(abs);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

let bannerCache: string | null | undefined;
export function getPortfolioBannerDataUrl(): string | null {
  if (bannerCache !== undefined) return bannerCache;
  bannerCache = loadPublicPngAsDataUrl("banner_for_portfolio.png");
  return bannerCache;
}

let logoCache: string | null | undefined;
export function getLogoDataUrl(): string | null {
  if (logoCache !== undefined) return logoCache;
  logoCache = loadPublicPngAsDataUrl("logo.png");
  return logoCache;
}
