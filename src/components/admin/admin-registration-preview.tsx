"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
import { RegistrationFormPreview, type RegistrationPreviewData } from "@/components/auth/registration-form-preview";

interface AdminRegistrationPreviewProps {
  investorId: string;
}

async function urlToFile(url: string | null | undefined, name: string): Promise<File | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new File([blob], name, { type: blob.type || "image/jpeg" });
  } catch {
    return null;
  }
}

export function AdminRegistrationPreview({ investorId }: AdminRegistrationPreviewProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RegistrationPreviewData | null>(null);

  useEffect(() => {
    if (!open || data) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/investors/${investorId}/registration-data`);
        if (!res.ok) throw new Error("Failed to load registration data");
        const payload = await res.json();
        // Convert document URLs into File objects so the shared preview
        // component can use the same URL.createObjectURL pipeline.
        const files = payload.files || {};
        const [
          nidFront, nidBack, photo, signature,
          nomineeNidFront, nomineeNidBack, nomineePhoto, nomineeSignature,
          tinCert, chequeLeafPhoto, boAcknowledgement,
        ] = await Promise.all([
          urlToFile(files.nidFront, "nid-front.jpg"),
          urlToFile(files.nidBack, "nid-back.jpg"),
          urlToFile(files.photo, "photo.jpg"),
          urlToFile(files.signature, "signature.jpg"),
          urlToFile(files.nomineeNidFront, "nominee-nid-front.jpg"),
          urlToFile(files.nomineeNidBack, "nominee-nid-back.jpg"),
          urlToFile(files.nomineePhoto, "nominee-photo.jpg"),
          urlToFile(files.nomineeSignature, "nominee-signature.jpg"),
          urlToFile(files.tinCert, "tin.jpg"),
          urlToFile(files.chequeLeafPhoto, "cheque.jpg"),
          urlToFile(files.boAcknowledgement, "bo.jpg"),
        ]);
        if (cancelled) return;
        setData({
          profile: payload.profile,
          applicant: payload.applicant,
          nominee: payload.nominee,
          bank: payload.bank,
          tinNumber: payload.tinNumber || "",
          dividendOption: payload.dividendOption || "CASH",
          nomineeRelationship: payload.nomineeRelationship || "",
          files: {
            nidFront, nidBack, photo, signature,
            nomineeNidFront, nomineeNidBack, nomineePhoto, nomineeSignature,
            tinCert, chequeLeafPhoto, boAcknowledgement,
          },
        });
      } catch (e) {
        console.error(e);
        alert("Could not load the registration form data.");
        setOpen(false);
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, data, investorId]);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-ekush-orange text-ekush-orange hover:bg-orange-50"
        onClick={() => setOpen(true)}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
        Registration Form
      </Button>
      {open && data && (
        <RegistrationFormPreview
          open={open}
          onClose={() => setOpen(false)}
          data={data}
        />
      )}
    </>
  );
}
