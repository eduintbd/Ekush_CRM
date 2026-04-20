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
    // /api/public/* is consumed cross-origin by the marketing site
    // (ekushwml.com + ekush.aibd.bd) — no auth, safe to expose with CORS.
    return [
      {
        source: "/api/public/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
