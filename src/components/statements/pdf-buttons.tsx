"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { generatePortfolioStatementPDF } from "@/lib/pdf";

export function DownloadPortfolioStatement() {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/statements/portfolio");
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      const doc = generatePortfolioStatementPDF(data);
      doc.save(`Portfolio_Statement_${data.investorCode}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={loading} size="sm">
      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
      Download PDF
    </Button>
  );
}

export function DownloadTransactionReport({
  fund,
  year,
  type,
  from,
  to,
}: {
  fund?: string;
  year?: string;
  type?: string;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (fund) params.set("fund", fund);
  if (year) params.set("year", year);
  if (type) params.set("type", type);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const href = `/forms/transaction-report${params.toString() ? `?${params.toString()}` : ""}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <Button size="sm">
        <Download className="w-4 h-4 mr-2" />
        Download PDF
      </Button>
    </a>
  );
}

export function DownloadTaxCertificate({ certId, fundCode }: { certId: string; fundCode: string }) {
  return (
    <a
      href={`/forms/tax-certificate?id=${certId}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button size="sm" className="bg-[#2DAAB8] hover:bg-[#259BA8] text-white">
        <Download className="w-4 h-4 mr-2" />
        Download Tax Certificate
      </Button>
    </a>
  );
}
