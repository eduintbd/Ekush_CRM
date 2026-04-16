"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, ChevronRight, ChevronLeft, Upload, Loader2, User, FileText, CreditCard, Eye } from "lucide-react";
import Link from "next/link";
import { RegistrationFormPreview } from "@/components/auth/registration-form-preview";

const STEPS = [
  { id: "profile", title: "Profile", icon: User },
  { id: "documents", title: "Upload Documents", icon: FileText },
  { id: "financial", title: "Financial Information", icon: CreditCard },
  { id: "submit", title: "Submit", icon: CheckCircle },
];

const NOMINEE_RELATIONSHIPS = ["Father/Mother", "Son/Daughter", "Spouse", "Other"];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Profile fields
  const [profile, setProfile] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
  });

  // Documents — principal applicant
  const [nidFront, setNidFront] = useState<File | null>(null);
  const [nidBack, setNidBack] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);

  // Documents — nominee
  const [nomineeNidFront, setNomineeNidFront] = useState<File | null>(null);
  const [nomineeNidBack, setNomineeNidBack] = useState<File | null>(null);
  const [nomineePhoto, setNomineePhoto] = useState<File | null>(null);
  const [nomineeSignature, setNomineeSignature] = useState<File | null>(null);
  const [nomineeRelationship, setNomineeRelationship] = useState("");

  // Documents — other
  const [tinCert, setTinCert] = useState<File | null>(null);

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);

  // Financial information
  const [chequeLeafPhoto, setChequeLeafPhoto] = useState<File | null>(null);
  const [boAcknowledgement, setBoAcknowledgement] = useState<File | null>(null);
  const [bank, setBank] = useState({
    bankName: "", branchName: "", accountNumber: "", routingNumber: "", boAccountNo: "",
  });
  const [dividendOption, setDividendOption] = useState("CASH");

  const canProceed = () => {
    switch (step) {
      case 0:
        return (
          profile.name &&
          profile.email &&
          profile.phone &&
          profile.password &&
          profile.password === profile.confirmPassword &&
          profile.password.length >= 6
        );
      case 1:
        return nidFront !== null;
      case 2:
        return bank.bankName && bank.accountNumber;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", profile.name);
      formData.append("email", profile.email);
      formData.append("phone", profile.phone);
      formData.append("password", profile.password);

      formData.append("bankName", bank.bankName);
      formData.append("branchName", bank.branchName);
      formData.append("accountNumber", bank.accountNumber);
      formData.append("routingNumber", bank.routingNumber);
      formData.append("boAccountNo", bank.boAccountNo);
      formData.append("dividendOption", dividendOption);

      formData.append("nomineeRelationship", nomineeRelationship);

      if (nidFront) formData.append("nidFront", nidFront);
      if (nidBack) formData.append("nidBack", nidBack);
      if (photo) formData.append("photo", photo);
      if (signature) formData.append("signature", signature);
      if (nomineeNidFront) formData.append("nomineeNidFront", nomineeNidFront);
      if (nomineeNidBack) formData.append("nomineeNidBack", nomineeNidBack);
      if (nomineePhoto) formData.append("nomineePhoto", nomineePhoto);
      if (nomineeSignature) formData.append("nomineeSignature", nomineeSignature);
      if (tinCert) formData.append("tinCert", tinCert);
      if (chequeLeafPhoto) formData.append("chequeLeafPhoto", chequeLeafPhoto);
      if (boAcknowledgement) formData.append("boAcknowledgement", boAcknowledgement);

      const regRes = await fetch("/api/auth/register", { method: "POST", body: formData });
      const regData = await regRes.json();
      if (!regRes.ok) {
        setError(regData.error || "Registration failed");
        return;
      }

      // Auto-login using the just-created credentials, then land on the dashboard
      // where a "pending verification" banner is shown until admin approval.
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: profile.email, password: profile.password }),
      });
      if (!loginRes.ok) {
        const loginData = await loginRes.json().catch(() => ({}));
        setError(loginData.error || "Registered, but auto sign-in failed. Please log in manually.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page-bg font-poppins">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Ekush" className="h-14 mx-auto mb-3" />
          <h1 className="text-[22px] font-semibold text-text-dark font-rajdhani">Online Registration</h1>
          <p className="text-[13px] text-text-body">Ekush Wealth Management Limited</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold ${
                i < step ? "bg-green-500 text-white" : i === step ? "bg-ekush-orange text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[12px] hidden sm:inline ${i === step ? "text-ekush-orange font-medium" : "text-text-body"}`}>{s.title}</span>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-green-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[10px] shadow-card p-8">

          {/* Step 0: Profile */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-4">Applicant&apos;s Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Applicant's Name (as per Bank)*" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Full name" required />
                <Input label="Email*" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Email address" required />
                <Input label="Phone Number*" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="01XXXXXXXXX" required />
                <div className="hidden md:block" />
                <Input label="Password* (min 6 chars)" type="password" value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} placeholder="Create password" required />
                <Input label="Confirm Password*" type="password" value={profile.confirmPassword} onChange={(e) => setProfile({ ...profile, confirmPassword: e.target.value })} placeholder="Confirm password" required />
              </div>
              {profile.password && profile.confirmPassword && profile.password !== profile.confirmPassword && (
                <p className="text-red-500 text-[12px]">Passwords do not match</p>
              )}
            </div>
          )}

          {/* Step 1: Upload Documents */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani">Upload Documents</h2>

              {/* Principal Applicant */}
              <div>
                <h3 className="text-[14px] font-semibold text-text-dark mb-3">Principal Applicant&apos;s Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FileUpload label="NID Front*" file={nidFront} onFile={setNidFront} accept="image/*,.pdf" />
                  <FileUpload label="NID Back Page" file={nidBack} onFile={setNidBack} accept="image/*,.pdf" />
                  <FileUpload label="Passport Size Photo" file={photo} onFile={setPhoto} accept="image/*" />
                  <FileUpload label="Digital Signature" file={signature} onFile={setSignature} accept="image/*" />
                </div>
              </div>

              {/* Nominee */}
              <div>
                <h3 className="text-[14px] font-semibold text-text-dark mb-3">Nominee Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FileUpload label="NID Front Page" file={nomineeNidFront} onFile={setNomineeNidFront} accept="image/*,.pdf" />
                  <FileUpload label="NID Back Page" file={nomineeNidBack} onFile={setNomineeNidBack} accept="image/*,.pdf" />
                  <FileUpload label="Passport Size Photo" file={nomineePhoto} onFile={setNomineePhoto} accept="image/*" />
                  <FileUpload label="Digital Signature" file={nomineeSignature} onFile={setNomineeSignature} accept="image/*" />
                </div>
                <div className="mt-4 max-w-sm">
                  <label className="text-[14px] font-medium text-text-label">Nominee Relationship</label>
                  <select
                    value={nomineeRelationship}
                    onChange={(e) => setNomineeRelationship(e.target.value)}
                    className="mt-2 flex h-[50px] w-full rounded-[5px] border border-input-border bg-input-bg px-4 text-[14px] text-text-dark focus:border-ekush-orange focus:outline-none"
                  >
                    <option value="">Select relationship</option>
                    {NOMINEE_RELATIONSHIPS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TIN */}
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FileUpload label="E-TIN Certificate of Principal Applicant" file={tinCert} onFile={setTinCert} accept="image/*,.pdf" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Financial Information */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-2">Financial Information</h2>

              <div className="max-w-md">
                <FileUpload
                  label="You can upload photo of cheque leaf"
                  file={chequeLeafPhoto}
                  onFile={setChequeLeafPhoto}
                  accept="image/*,.pdf"
                />
              </div>

              <p className="text-[13px] text-text-body">
                Or you can give following information about your bank details:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Bank Name*" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} placeholder="Bank name" required />
                <Input label="Branch Name" value={bank.branchName} onChange={(e) => setBank({ ...bank, branchName: e.target.value })} placeholder="Branch" />
                <Input label="Bank Account No*" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} placeholder="Account number" required />
                <Input label="Routing Number" value={bank.routingNumber} onChange={(e) => setBank({ ...bank, routingNumber: e.target.value })} placeholder="Routing number" />
              </div>

              {/* BO Account: number OR acknowledgement upload */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-end gap-4">
                <Input
                  label="BO Account No (16 digits)"
                  value={bank.boAccountNo}
                  onChange={(e) => setBank({ ...bank, boAccountNo: e.target.value })}
                  placeholder="16 digit BO Account No"
                />
                <div className="text-[13px] text-text-body pb-4 text-center">or</div>
                <FileUpload
                  label="BO Acknowledgement Receipt"
                  file={boAcknowledgement}
                  onFile={setBoAcknowledgement}
                  accept="image/*,.pdf"
                />
              </div>

              {/* Dividend option */}
              <div className="max-w-sm">
                <label className="text-[14px] font-medium text-text-label">Dividend Option</label>
                <select
                  value={dividendOption}
                  onChange={(e) => setDividendOption(e.target.value)}
                  className="mt-2 flex h-[50px] w-full rounded-[5px] border border-input-border bg-input-bg px-4 text-[14px] text-text-dark focus:border-ekush-orange focus:outline-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="CIP">CIP</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-4">Review &amp; Submit</h2>
              <div className="bg-page-bg rounded-[10px] p-4 space-y-2 text-[13px]">
                <p><strong>Name:</strong> {profile.name}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Phone:</strong> {profile.phone}</p>
                <p><strong>Bank:</strong> {bank.bankName} — A/C: {bank.accountNumber}</p>
                {nomineeRelationship && <p><strong>Nominee Relationship:</strong> {nomineeRelationship}</p>}
                <p><strong>Dividend Option:</strong> {dividendOption === "CIP" ? "CIP" : "Cash"}</p>
                <p><strong>Documents:</strong> {[
                  nidFront && "Applicant NID Front",
                  nidBack && "Applicant NID Back",
                  photo && "Applicant Photo",
                  nomineeNidFront && "Nominee NID Front",
                  nomineeNidBack && "Nominee NID Back",
                  nomineePhoto && "Nominee Photo",
                  tinCert && "E-TIN",
                  chequeLeafPhoto && "Cheque Leaf",
                  boAcknowledgement && "BO Acknowledgement",
                ].filter(Boolean).join(", ") || "None"}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-4">
                <p className="text-[13px] text-amber-800">
                  By submitting, you confirm that all information provided is accurate. You will be signed in immediately with
                  a pending-verification status; our team will review your documents and approve your account shortly.
                </p>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-[13px] mt-2">{error}</p>}

          <div className="flex justify-between mt-8">
            <div>
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="bg-ekush-orange hover:bg-ekush-orange-dark text-white">
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setPreviewOpen(true)}
                    className="border-ekush-orange text-ekush-orange hover:bg-orange-50"
                  >
                    <Eye className="w-4 h-4 mr-1" /> Preview Registration Form
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading} className="bg-ekush-orange hover:bg-ekush-orange-dark text-white">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                    Submit Registration
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="text-center mt-6">
            <p className="text-[13px] text-text-body">
              Already have an account? <Link href="/login" className="text-ekush-orange hover:underline font-medium">Log in</Link>
            </p>
          </div>
        </div>
      </div>

      <RegistrationFormPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={{
          profile: { name: profile.name, email: profile.email, phone: profile.phone },
          bank: {
            bankName: bank.bankName,
            branchName: bank.branchName,
            accountNumber: bank.accountNumber,
            routingNumber: bank.routingNumber,
            boAccountNo: bank.boAccountNo,
          },
          dividendOption,
          nomineeRelationship,
          files: {
            nidFront,
            nidBack,
            photo,
            signature,
            nomineeNidFront,
            nomineeNidBack,
            nomineePhoto,
            nomineeSignature,
            tinCert,
            chequeLeafPhoto,
            boAcknowledgement,
          },
        }}
      />
    </div>
  );
}

function FileUpload({ label, file, onFile, accept }: { label: string; file: File | null; onFile: (f: File | null) => void; accept: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="text-[12px] font-medium text-gray-600 block mb-1">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
          file ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-ekush-orange"
        }`}
      >
        {file ? (
          <p className="text-[12px] text-green-700 font-medium truncate">{file.name}</p>
        ) : (
          <div>
            <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
            <p className="text-[11px] text-gray-500">Click to upload</p>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
    </div>
  );
}
