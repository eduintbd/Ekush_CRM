/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['exceljs', 'puppeteer-core', '@sparticuz/chromium-min'],
    optimizePackageImports: ['recharts', 'lucide-react', 'jspdf', 'jspdf-autotable'],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

module.exports = nextConfig;
