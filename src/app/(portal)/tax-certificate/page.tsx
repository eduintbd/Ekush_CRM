import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBDT, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloadTaxCertificate } from "@/components/statements/pdf-buttons";
import { Shield } from "lucide-react";

async function getTaxCertificates(investorId: string) {
  return prisma.taxCertificate.findMany({
    where: { investorId },
    include: { fund: { select: { code: true, name: true } } },
    orderBy: { periodEnd: "desc" },
  });
}

export default async function TaxCertificatePage() {
  const session = await getServerSession(authOptions);
  const investorId = (session?.user as any)?.investorId;

  if (!investorId) {
    return <p className="text-text-body text-center py-20">Investor profile not found.</p>;
  }

  const taxCerts = await getTaxCertificates(investorId);

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Tax Certificate</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-[16px] flex items-center gap-2">
            <Shield className="w-4 h-4 text-icon-muted" /> Tax Certificates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {taxCerts.length === 0 ? (
            <p className="text-text-body text-sm text-center py-10">No tax certificates available.</p>
          ) : (
            <div className="space-y-3">
              {taxCerts.map((tc) => (
                <div key={tc.id} className="flex items-center justify-between p-4 bg-page-bg rounded-[10px]">
                  <div>
                    <p className="font-medium text-text-dark">{tc.fund.code} — Tax Certificate</p>
                    <p className="text-xs text-text-body mt-1">
                      Period: {tc.periodStart ? formatDate(tc.periodStart) : "N/A"} – {tc.periodEnd ? formatDate(tc.periodEnd) : "N/A"}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-text-body">
                      <span>Realized Gain: {formatBDT(Number(tc.totalRealizedGain))}</span>
                      <span>Tax: {formatBDT(Number(tc.totalTax))}</span>
                      <span>Net Dividend: {formatBDT(Number(tc.totalNetDividend))}</span>
                    </div>
                  </div>
                  <DownloadTaxCertificate certId={tc.id} fundCode={tc.fund.code} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
