"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { generatePortfolioStatementPDF, generateTaxCertificatePDF } from "@/lib/pdf";

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

export function DownloadTaxCertificate({ certId, fundCode }: { certId: string; fundCode: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/statements/tax-certificate?id=${certId}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const certs = await res.json();
      if (certs.length === 0) throw new Error("No certificate found");
      const data = certs[0];
      const doc = generateTaxCertificatePDF(data);
      doc.save(`Tax_Certificate_${data.investorCode}_${fundCode}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={loading} variant="outline" size="sm">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
    </Button>
  );
}
