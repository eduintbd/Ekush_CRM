"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignatureUploadProps {
  onUploaded?: (url: string | null) => void;
}

// Optional signature upload. If the investor already has a signature on
// record, it's shown with a Replace option. If not, a "Wet signature on file
// at Ekush will be used" note is shown so investors know they can skip.
export function SignatureUpload({ onUploaded }: SignatureUploadProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/investor/signature")
      .then((r) => r.json())
      .then((d) => {
        setSignatureUrl(d.signatureUrl ?? null);
        onUploaded?.(d.signatureUrl ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingCurrent(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG or JPG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("File must be under 2MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.set("signature", file);
      const res = await fetch("/api/investor/signature", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setSignatureUrl(data.signatureUrl);
      onUploaded?.(data.signatureUrl);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[14px] font-medium text-text-label block">
        Digital Signature{" "}
        <span className="text-[12px] font-normal text-text-muted">(optional)</span>
      </label>

      {loadingCurrent ? (
        <div className="h-[60px] flex items-center justify-center text-text-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
        </div>
      ) : signatureUrl ? (
        <div className="flex items-center gap-3 p-3 border border-input-border rounded-[8px] bg-white">
          <img
            src={signatureUrl}
            alt="Signature on file"
            className="h-14 w-auto max-w-[200px] object-contain bg-page-bg rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-text-dark font-medium flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-green-600" />
              Signature on file
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              This signature will be applied to the DDI form.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Replace"}
          </Button>
        </div>
      ) : (
        <>
          <label className="flex items-center gap-3 h-[60px] rounded-[8px] border border-dashed border-input-border bg-input-bg px-5 cursor-pointer hover:border-ekush-orange transition-colors">
            {uploading ? (
              <Loader2 className="w-4 h-4 text-ekush-orange animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-ekush-orange" />
            )}
            <span className="text-[13px] text-text-body">
              {uploading ? "Uploading…" : "Upload your digital signature (PNG/JPG)"}
            </span>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Optional — if you skip, the wet signature you provided at registration will be
            used to process this DDI.
          </p>
        </>
      )}

      {error && (
        <p className="text-[11px] text-red-600 flex items-center gap-1">
          <Trash2 className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
