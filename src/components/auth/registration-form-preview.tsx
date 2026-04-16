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

              </div>

              <div className="flex gap-3">
                <div className="reg-box text-center" style={{ width: "32mm", height: "38mm", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2px" }}>
                  {urls.photo ? (
                    <img src={urls.photo} alt="Photo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "cover" }} />
                  ) : (
                    <p className="text-[8pt]" style={{ color: "#777" }}>Passport Size<br/>Photograph</p>
                  )}
                </div>
                <div className="reg-box text-center" style={{ width: "32mm", height: "38mm", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2px" }}>
                  {urls.signature ? (
                    <img src={urls.signature} alt="Signature" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  ) : (
                    <p className="text-[8pt]" style={{ color: "#777" }}>Signature</p>
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
              <div className="reg-box text-center" style={{ width: "32mm", height: "38mm", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2px" }}>
                {urls.nomineeSignature ? (
                  <img src={urls.nomineeSignature} alt="Nominee signature" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <p className="text-[8pt]" style={{ color: "#777" }}>Signature</p>
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

        {/* Page 3 — Terms & Conditions + Signatory block */}
        <div className="reg-page bg-white mx-auto my-4 shadow-lg" style={{ width: "210mm", minHeight: "297mm", padding: "15mm" }}>
          <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "9.5pt", color: "#000", lineHeight: 1.4 }}>
            <div className="text-center mb-3">
              <p style={{ fontSize: "13pt", fontWeight: 700 }}>INVESTOR&rsquo;S REGISTRATION FORM</p>
              <p style={{ fontSize: "10pt", fontWeight: 600 }}>Asset Manager: Ekush Wealth Management Limited</p>
              <p style={{ fontSize: "9pt", fontStyle: "italic" }}>(Please Fill up the form using only BLOCK LETTERS)</p>
            </div>

            <div className="reg-section-title text-center">TERMS AND CONDITIONS (T&amp;C)</div>

            <ol style={{ paddingLeft: "18px", marginTop: "8px" }}>
              <li style={{ marginBottom: "4px" }}>
                The Units of Ekush Wealth Management Limited (EWML) managed funds may be bought through EWML and
                authorized selling agents appointed by EWML from time to time. Surrender of Units is allowed only through EWML.
              </li>
              <li style={{ marginBottom: "4px" }}>
                Application may be made by an individual (both residence and non-resident), a corporation or company
                (both local and foreign), a trust or a society (registered in or outside of Bangladesh) and not by a
                minor or unsound mind.
              </li>
              <li style={{ marginBottom: "4px" }}>
                Joint application is acceptable by two persons. Registration and Unit allocation will be in favor of
                Principal Applicant while dividend and other benefits, if any, will be addressed to the bank account of
                Principal Applicant or Joint Applicant mentioned in the application form. In case of the death of any
                of the joint holders, only the survivor shall be recognized as having any title of the Units. On death
                of both the joint holders, the Units will bestow upon the nominee.
              </li>
              <li style={{ marginBottom: "4px" }}>
                The Units may be transferred by way of inheritance/gift and/or by specific operation of the law. In case
                of transfer the fund will charge a nominal fee as decided by the asset manager from time to time except
                in the case of transfer by way of inheritance.
              </li>
              <li style={{ marginBottom: "4px" }}>
                Dividend may be delivered in cash or by way of Units under Cumulative Investment Plan (CIP) as the
                application mentioned in the application form.
              </li>
              <li style={{ marginBottom: "4px" }}>
                All payments in connection with or arising out of transactions in the Units hereby applied for shall be in BDT.
              </li>
            </ol>

            <p className="reg-sub-title" style={{ marginTop: "6px" }}>SIP Specific T&amp;C</p>
            <ol start={7} style={{ paddingLeft: "18px", marginTop: "6px" }}>
              <li style={{ marginBottom: "4px" }}>
                Minimum instalment amount of the individual investor is BDT 1,000.00. For institutional investor,
                minimum instalment amount is BDT 10,000.00.
              </li>
              <li style={{ marginBottom: "4px" }}>
                Instalment amount will be debited on the 5th, 15th and 25th day of each month. Investor will choose a
                date as per their convenience. If the day is a weekend/ holiday, instalment amount will be debited on
                the next working day.
              </li>
              <li style={{ marginBottom: "4px" }}>
                After the maturity, the investor may- a) continue the instalment amount for another tenure b) keep the
                matured amount as non-SIP investment c) transfer the matured amount to the designated bank account of
                the investor.
              </li>
              <li style={{ marginBottom: "4px" }}>
                For auto renewal option, the investor must submit another &ldquo;Auto debit Instruction Form&rdquo; having
                validity for another specific period.
              </li>
              <li style={{ marginBottom: "4px" }}>
                There will no minimum lot size of units under SIP. Any remaining fraction amount will be converted when
                it sums up to one unit.
              </li>
              <li style={{ marginBottom: "4px" }}>
                In case of return of a DDI (Direct Debit Instruction) by the investor&rsquo;s bank, the investor must
                either a) submit a cheque of the same amount within 5 (five) working days after getting notification
                from EWML or EWML may send the DDI again with the consent of the investor.
              </li>
              <li style={{ marginBottom: "4px" }}>
                After clearance/encashment of DDI (Direct Debit Instruction), the units will be allocated in favor of
                the principal applicant with a denomination of the number of units proportionate to the prevailing
                purchase price of the week. The units will be delivered to the unit holder&rsquo;s BO A/C in demat form
                after each five instalments.
              </li>
              <li style={{ marginBottom: "4px" }}>
                Surrender/partial surrender IS NOT ALLOWED until the instalment tenor ends.
              </li>
            </ol>

            <p className="reg-sub-title" style={{ marginTop: "6px" }}>Non-SIP Specific T&amp;C</p>
            <ol start={15} style={{ paddingLeft: "18px", marginTop: "6px" }}>
              <li style={{ marginBottom: "4px" }}>
                Minimum purchase amount is BDT. 5,000.00 for individual investors and BDT. 50,000.00 for institutional
                Investors.
              </li>
              <li style={{ marginBottom: "4px" }}>
                Application for purchase of units should be accompanied by an A/C Payee Cheque/Pay Order/Bank Draft in
                favor of the relevant fund&rsquo;s name.
              </li>
              <li style={{ marginBottom: "4px" }}>
                After clearance/encashment of cheque/draft/pay order, the applicant will be allocated units of the
                relevant fund against every purchase with a denomination of number of units s/he applies for. The units
                will also be delivered to the unit holder&rsquo;s BO A/C in demat form.
              </li>
              <li style={{ marginBottom: "4px" }}>
                Surrender/partial surrender is allowed. However, in order to surrender/partially surrender, the investor
                will have to surrender the relevant fund&rsquo;s unit from her/his BO A/C to the relevant fund&rsquo;s
                repurchase account before asking for the surrender value.
              </li>
            </ol>

            {/* Signatory block — agreed with T&C */}
            <div
              className="reg-box"
              style={{
                marginTop: "14px",
                padding: "12px 14px",
                width: "95mm",
              }}
            >
              <p style={{ fontWeight: 700, textDecoration: "underline", marginBottom: "8px" }}>
                Principal Applicant&rsquo;s / Signatory I
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <span className="reg-label" style={{ minWidth: "22mm" }}>Signature</span>
                <div
                  className="reg-box"
                  style={{
                    flex: 1,
                    height: "18mm",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2px",
                  }}
                >
                  {urls.signature ? (
                    <img
                      src={urls.signature}
                      alt="Principal signature"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  ) : null}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="reg-label" style={{ minWidth: "22mm" }}>Date:</span>
                <span style={{ fontWeight: 600 }}>{dateStr}</span>
              </div>
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
