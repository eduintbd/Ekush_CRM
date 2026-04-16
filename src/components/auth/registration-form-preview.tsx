"use client";

import { useEffect, useMemo } from "react";
import { X, Printer } from "lucide-react";

export interface PersonInfo {
  nidNumber: string;
  fatherName: string;
  motherName: string;
  presentAddress: string;
  permanentAddress: string;
}

export interface RegistrationPreviewData {
  profile: { name: string; email: string; phone: string };
  applicant: PersonInfo;
  nominee: PersonInfo & { name: string };
  bank: {
    bankName: string;
    branchName: string;
    accountNumber: string;
    routingNumber: string;
    boAccountNo: string;
  };
  tinNumber: string;
  dividendOption: "CASH" | "CIP" | string;
  nomineeRelationship: string;
  files: {
    nidFront: File | null;
    nidBack: File | null;
    photo: File | null;
    signature: File | null;
    nomineeNidFront: File | null;
    nomineeNidBack: File | null;
    nomineePhoto: File | null;
    nomineeSignature: File | null;
    tinCert: File | null;
    chequeLeafPhoto: File | null;
    boAcknowledgement: File | null;
  };
}

function useObjectUrls(files: Record<string, File | null>) {
  return useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const [k, f] of Object.entries(files)) {
      map[k] = f ? URL.createObjectURL(f) : null;
    }
    return map;
  }, [files]);
}

export function RegistrationFormPreview({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: RegistrationPreviewData;
}) {
  const urls = useObjectUrls(data.files);

  useEffect(() => {
    return () => {
      Object.values(urls).forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, [urls]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const today = new Date();
  const d = String(today.getDate()).padStart(2, "0");
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const y = String(today.getFullYear());
  const dateStr = `${d}/${m}/${y}`;

  const isCIP = data.dividendOption === "CIP";
  const isCash = !isCIP;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; }
          body * { visibility: hidden; }
          .reg-preview, .reg-preview * { visibility: visible; }
          .reg-preview { position: static !important; inset: auto !important; background: #fff !important; overflow: visible !important; }
          .reg-preview .no-print { display: none !important; }
          .reg-preview .reg-page {
            box-shadow: none !important;
            margin: 0 !important;
            page-break-after: always;
            break-after: page;
            width: 210mm !important;
            min-height: 297mm !important;
          }
          .reg-preview .reg-page:last-child { page-break-after: auto; break-after: auto; }
        }
        .reg-field { border-bottom: 1px solid #333; min-height: 18px; padding: 2px 4px; }
        .reg-box { border: 1px solid #333; }
        .reg-section-title { background: #333; color: #fff; padding: 6px 10px; font-weight: 700; font-size: 12pt; letter-spacing: 0.5px; }
        .reg-sub-title { background: #e5e5e5; padding: 4px 10px; font-weight: 700; font-size: 10.5pt; }
        .reg-label { font-weight: 600; font-size: 9.5pt; }
      `}</style>

      <div className="reg-preview fixed inset-0 bg-black/60 z-[100] overflow-y-auto">
        {/* Toolbar */}
        <div className="no-print sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
          <h2 className="text-[15px] font-semibold text-text-dark font-rajdhani">Registration Form Preview</h2>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 px-4 py-2 bg-ekush-orange text-white rounded-md text-[13px] font-medium hover:bg-ekush-orange-dark"
            >
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 text-text-dark rounded-md text-[13px] hover:bg-gray-50"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>

        {/* Page 1 — Principal Applicant */}
        <div className="reg-page bg-white mx-auto my-4 shadow-lg" style={{ width: "210mm", minHeight: "297mm", padding: "15mm" }}>
          <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "10pt", color: "#000", lineHeight: 1.4 }}>

            {/* Header strip */}
            <div className="flex items-center justify-between mb-3">
              <img src="/logo.png" alt="Ekush" style={{ height: "40px" }} />
              <div className="text-right">
                <p style={{ fontSize: "10pt", fontWeight: 700 }}>Ekush Wealth Management Limited</p>
                <p style={{ fontSize: "8.5pt", color: "#555" }}>www.ekushwml.com</p>
              </div>
            </div>

            <div className="reg-section-title text-center">PRINCIPAL APPLICANT&rsquo;S INFORMATION</div>

            <div className="flex gap-3 my-3">
              <div className="flex-1">
                <p className="reg-label">DATE</p>
                <div className="flex gap-1 mt-1">
                  {dateStr.split("").filter((c) => c !== "/").map((ch, i) => (
                    <div key={i} className="reg-box" style={{ width: "22px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{ch}</div>
                  ))}
                </div>
                <div className="flex gap-1 text-[8pt] mt-1" style={{ color: "#555" }}>
                  <div style={{ width: "22px", textAlign: "center" }}>D</div>
                  <div style={{ width: "22px", textAlign: "center" }}>D</div>
                  <div style={{ width: "22px", textAlign: "center" }}>M</div>
                  <div style={{ width: "22px", textAlign: "center" }}>M</div>
                  <div style={{ width: "22px", textAlign: "center" }}>Y</div>
                  <div style={{ width: "22px", textAlign: "center" }}>Y</div>
                  <div style={{ width: "22px", textAlign: "center" }}>Y</div>
                  <div style={{ width: "22px", textAlign: "center" }}>Y</div>
                </div>

                {/* Principal applicant signature shown right after the Date */}
                <div className="mt-3">
                  <p className="reg-label">Principal Applicant&rsquo;s Signature</p>
                  <div
                    className="reg-box"
                    style={{
                      width: "55mm",
                      height: "20mm",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: "4px",
                      padding: "2px",
                    }}
                  >
                    {urls.signature ? (
                      <img
                        src={urls.signature}
                        alt="Principal signature"
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <span className="text-[8pt]" style={{ color: "#777" }}>Signature</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="reg-box text-center" style={{ width: "32mm", height: "38mm", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2px" }}>
                  {urls.photo ? (
                    <img src={urls.photo} alt="Photo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "cover" }} />
                  ) : (
                    <p className="text-[8pt]" style={{ color: "#777" }}>Passport Size<br/>Photograph</p>
                  )}
                </div>
              </div>
            </div>

            <div className="reg-sub-title">PERSONAL INFORMATION</div>
            <LabeledField label="Name (in BLOCK LETTER)" value={data.profile.name.toUpperCase()} />
            <LabeledField label="Father&rsquo;s / Husband&rsquo;s Name" value={data.applicant.fatherName} />
            <LabeledField label="Mother&rsquo;s Name" value={data.applicant.motherName} />
            <LabeledField label="NID / Passport Number" value={data.applicant.nidNumber} />

            <div className="reg-sub-title mt-3">CONTACT INFORMATION</div>
            <LabeledField label="Contact Number/s" value={data.profile.phone} />
            <LabeledField label="Email Address" value={data.profile.email} />
            <LabeledField label="Present Address" value={data.applicant.presentAddress} />
            <LabeledField label="Permanent Address" value={data.applicant.permanentAddress} />

            <div className="reg-sub-title mt-3">FINANCIAL AND INVESTMENT-RELATED INFORMATION</div>
            <LabeledField label="Investor&rsquo;s Bank Account&rsquo;s Name" value={data.profile.name} />
            <LabeledField label="Account Number" value={data.bank.accountNumber} />
            <LabeledField label="Bank Name" value={data.bank.bankName} />
            <LabeledField label="Branch Name" value={data.bank.branchName} />

            <div className="flex items-center gap-6 my-2">
              <span className="reg-label">Dividend Option:</span>
              <div className="flex items-center gap-1">
                <div className="reg-box" style={{ width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{isCash ? "✓" : ""}</div>
                <span>Cash</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="reg-box" style={{ width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{isCIP ? "✓" : ""}</div>
                <span>CIP (Cumulative Investment Plan)</span>
              </div>
            </div>

            <LabeledField label="BO Account Number" value={data.bank.boAccountNo} />
            <LabeledField label="TAX Identification Number (TIN)" value={data.tinNumber} />
          </div>
        </div>

        {/* Page 2 — Nominee */}
        <div className="reg-page bg-white mx-auto my-4 shadow-lg" style={{ width: "210mm", minHeight: "297mm", padding: "15mm" }}>
          <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "10pt", color: "#000", lineHeight: 1.4 }}>

            <div className="reg-section-title text-center">NOMINEE&rsquo;S INFORMATION</div>

            <div className="flex justify-end gap-3 my-3">
              <div className="reg-box text-center" style={{ width: "32mm", height: "38mm", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2px" }}>
                {urls.nomineePhoto ? (
                  <img src={urls.nomineePhoto} alt="Nominee photo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "cover" }} />
                ) : (
                  <p className="text-[8pt]" style={{ color: "#777" }}>Passport Size<br/>Photograph</p>
                )}
              </div>
            </div>

            <div className="reg-sub-title">PERSONAL INFORMATION</div>
            <LabeledField label="Name (in BLOCK LETTER)" value={(data.nominee.name || "").toUpperCase()} />
            <LabeledField label="Father&rsquo;s / Husband&rsquo;s Name" value={data.nominee.fatherName} />
            <LabeledField label="Mother&rsquo;s Name" value={data.nominee.motherName} />
            <LabeledField label="NID / Passport Number" value={data.nominee.nidNumber} />

            <div className="reg-sub-title mt-3">CONTACT INFORMATION</div>
            <LabeledField label="Present Address" value={data.nominee.presentAddress} />
            <LabeledField label="Permanent Address" value={data.nominee.permanentAddress} />

            <div className="reg-sub-title mt-3">RELATIONSHIP</div>
            <div className="my-2" style={{ fontSize: "10pt" }}>
              The nominee is the{" "}
              <span style={{ borderBottom: "1px solid #333", padding: "0 40px", fontWeight: 600 }}>
                {data.nomineeRelationship || ""}
              </span>{" "}
              of the Principal Applicant.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function LabeledField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid my-1" style={{ gridTemplateColumns: "40% 60%" }}>
      <div className="reg-label py-1" dangerouslySetInnerHTML={{ __html: label }} />
      <div className="reg-field" style={{ whiteSpace: "pre-wrap" }}>{value || "\u00A0"}</div>
    </div>
  );
}
