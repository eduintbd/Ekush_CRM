import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatBDT } from "@/lib/utils";
import { DownloadTaxCertificate } from "@/components/statements/pdf-buttons";
import { TaxCertFilters } from "@/components/statements/tax-cert-filters";

function getAssessmentYear(periodEnd: Date | null): string {
  if (!periodEnd) return "N/A";
  const endYear = periodEnd.getFullYear();
  const endMonth = periodEnd.getMonth();
  if (endMonth <= 5) return `${endYear} - ${String(endYear + 1).slice(-2)}`;
  return `${endYear + 1} - ${String(endYear + 2).slice(-2)}`;
}

export default async function TaxCertificatePage({
  searchParams,
}: {
  searchParams: { fund?: string; year?: string };
}) {
  const session = await getSession();
  let investorId = (session?.user as any)?.investorId;
  if (!investorId && session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { investor: { select: { id: true } } } });
    investorId = user?.investor?.id;
  }
  if (!investorId) return <p className="text-text-body text-center py-20">Investor profile not found.</p>;

  const where: any = { investorId };
  if (searchParams.fund) {
    const fund = await prisma.fund.findUnique({ where: { code: searchParams.fund } });
    if (fund) where.fundId = fund.id;
  }

  const taxCerts = await prisma.taxCertificate.findMany({
    where,
    include: { fund: { select: { code: true, name: true } } },
    orderBy: { periodEnd: "desc" },
  });

  // Filter by year if provided
  const filteredCerts = searchParams.year
    ? taxCerts.filter((tc) => {
        const ay = getAssessmentYear(tc.periodEnd);
        return ay.startsWith(searchParams.year!);
      })
    : taxCerts;

  // Get unique funds and years for filters
  const fundCodes = [...new Set(taxCerts.map((tc) => tc.fund.code))];
  const years = [...new Set(taxCerts.map((tc) => getAssessmentYear(tc.periodEnd)))];

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Tax Certificate</h1>

      <TaxCertFilters fundCodes={fundCodes} years={years} currentFund={searchParams.fund} currentYear={searchParams.year} />

      <Card>
        <CardContent className="p-0">
          {filteredCerts.length === 0 ? (
            <p className="text-text-body text-sm text-center py-10">No tax certificates match the selected filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Fund</TableHead>
                  <TableHead>Assessment Year</TableHead>
                  <TableHead className="text-right">Net Investment</TableHead>
                  <TableHead className="text-right">Realized Gain</TableHead>
                  <TableHead className="text-right">Gross Dividend</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Net Dividend</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCerts.map((tc) => (
                  <TableRow key={tc.id}>
                    <TableCell className="font-medium text-text-dark">{tc.fund.name}</TableCell>
                    <TableCell>{getAssessmentYear(tc.periodEnd)}</TableCell>
                    <TableCell className="text-right">{formatBDT(Number(tc.netInvestment))}</TableCell>
                    <TableCell className="text-right">{formatBDT(Number(tc.totalRealizedGain))}</TableCell>
                    <TableCell className="text-right">{formatBDT(Number(tc.totalGrossDividend))}</TableCell>
                    <TableCell className="text-right text-red-500">{formatBDT(Number(tc.totalTax))}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">{formatBDT(Number(tc.totalNetDividend))}</TableCell>
                    <TableCell>
                      <DownloadTaxCertificate certId={tc.id} fundCode={tc.fund.code} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
