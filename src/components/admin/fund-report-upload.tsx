"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  fundId: string;
  fundCode: string;
  reportType: string;
  reportLabel: string;
}

export function FundReportUpload({ fundId, fundCode, reportType, reportLabel }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setSuccess(false);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fundId", fundId);
      formData.append("reportType", reportType);
      formData.append("title", `${fundCode} - ${reportLabel}`);

      const res = await fetch("/api/admin/fund-reports", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setSuccess(true);
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={() => !loading && fileRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
        success
          ? "border-green-500 bg-green-50"
          : error
            ? "border-red-300 bg-red-50"
            : "border-gray-200 bg-gray-50 hover:border-ekush-orange hover:bg-orange-50/30"
      }`}
    >
      <div className="flex items-center justify-center mb-1">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-ekush-orange" />
        ) : success ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : (
          <Upload className="w-4 h-4 text-gray-400" />
        )}
      </div>
      <p className="text-[11px] font-medium text-text-dark">{reportLabel}</p>
      <p className="text-[10px] text-text-muted">
        {loading ? "Uploading..." : success ? "Uploaded!" : error || "Click to upload .xlsx / .xls"}
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleUpload}
        className="hidden"
        disabled={loading}
      />
    </div>
  );
}
