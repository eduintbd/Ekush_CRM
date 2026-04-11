"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";

interface Props {
  fundId: string;
  fundCode: string;
  uploadType: "FIN_STATS" | "INVESTORS";
  label: string;
  hint: string;
}

export function DailyFundUpload({ fundId, fundCode, uploadType, label, hint }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fundId", fundId);
      formData.append("uploadType", uploadType);

      const res = await fetch("/api/admin/daily-uploads", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus("success");
        setMessage(`Processed ${data.record?.rowsProcessed ?? 0} rows`);
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        setStatus("error");
        setMessage(data.detail || data.error || "Upload failed");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={() => !loading && fileRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
        status === "success"
          ? "border-green-500 bg-green-50"
          : status === "error"
            ? "border-red-300 bg-red-50"
            : "border-ekush-orange/40 bg-orange-50/30 hover:border-ekush-orange hover:bg-orange-50/60"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-white flex items-center justify-center shrink-0 shadow-sm">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-ekush-orange" />
          ) : status === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : status === "error" ? (
            <AlertCircle className="w-5 h-5 text-red-500" />
          ) : (
            <FileSpreadsheet className="w-5 h-5 text-ekush-orange" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-text-dark">
            {fundCode} {label}
          </p>
          <p className="text-[11px] text-text-body truncate">
            {loading
              ? "Uploading & processing..."
              : status === "success"
                ? `✓ ${message || "Ingested successfully"}`
                : status === "error"
                  ? `✗ ${message}`
                  : hint}
          </p>
        </div>
        <Upload className="w-4 h-4 text-text-muted shrink-0" />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleUpload}
        className="hidden"
        disabled={loading}
      />
    </div>
  );
}
