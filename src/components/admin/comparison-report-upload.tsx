"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, FileText } from "lucide-react";

export function ComparisonReportUpload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleUpload = async () => {
    if (!file || !title) {
      setMessage({ type: "error", text: "File and title are required." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      if (source) formData.append("source", source);
      if (reportDate) formData.append("reportDate", reportDate);

      const res = await fetch("/api/admin/comparison-reports", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Report uploaded successfully." });
        setFile(null);
        setTitle("");
        setSource("");
        setReportDate("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data.error || "Upload failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Report Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Weekly Mutual Fund Review"
        />
        <Input
          label="Source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g., UCB Stock Brokerage"
        />
        <Input
          label="Report Date"
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
        />
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-ekush-orange hover:bg-orange-50/30 transition-colors"
      >
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium">{file.name}</span>
            <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Click to upload PDF (max 20MB)</p>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="hidden"
      />

      <div className="flex items-center gap-3">
        <Button
          onClick={handleUpload}
          disabled={loading || !file || !title}
          className="bg-ekush-orange hover:bg-ekush-orange-dark text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
          Upload Report
        </Button>
        {message && (
          <span className={`text-[12px] ${message.type === "success" ? "text-green-600" : "text-red-500"}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
