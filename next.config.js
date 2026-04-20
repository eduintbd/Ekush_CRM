/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['exceljs', 'puppeteer-core', '@sparticuz/chromium-min'],
    optimizePackageImports: ['recharts', 'lucide-react', 'jspdf', 'jspdf-autotable'],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    // Routes consumed cross-origin by the marketing site
    // (ekushwml.com + ekush.aibd.bd). All are public read-only — no auth.
    const cors = [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Content-Type" },
    ];
    return [
      { source: "/api/public/:path*", headers: cors },
      { source: "/api/funds", headers: cors },
      { source: "/api/performance-comparison", headers: cors },
    ];
  },
};

module.exports = nextConfig;
