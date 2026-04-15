"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, ChevronRight, ChevronLeft, Upload, Loader2, User, FileText, CreditCard } from "lucide-react";
import Link from "next/link";

const STEPS = [
  { id: "profile", title: "Profile", icon: User },
  { id: "documents", title: "Upload Documents", icon: FileText },
  { id: "bank", title: "Bank & BO", icon: CreditCard },
  { id: "submit", title: "Submit", icon: CheckCircle },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [regType, setRegType] = useState<"individual" | "institution">("individual");

  // Profile fields
  const [profile, setProfile] = useState({
    name: "", email: "", phone: "", nidNumber: "", password: "", confirmPassword: "",
    dateOfBirth: "", address: "", tinNumber: "",
  });

  // Documents
  const [nidFront, setNidFront] = useState<File | null>(null);
  const [nidBack, setNidBack] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [nomineeNid, setNomineeNid] = useState<File | null>(null);
  const [chequeLeaf, setChequeLeaf] = useState<File | null>(null);
  const [tinCert, setTinCert] = useState<File | null>(null);

  // Bank & BO
  const [bank, setBank] = useState({
    bankName: "", branchName: "", accountNumber: "", accountType: "", routingNumber: "", boAccountNo: "",
  });

  // Nominee
  const [nominee, setNominee] = useState({ name: "", nidNumber: "", relationship: "" });

  const canProceed = () => {
    switch (step) {
      case 0: return profile.name && profile.email && profile.phone && profile.nidNumber && profile.password && profile.password === profile.confirmPassword && profile.password.length >= 6;
      case 1: return nidFront !== null;
      case 2: return bank.bankName && bank.accountNumber;
      case 3: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      // Profile
      formData.append("name", profile.name);
      formData.append("email", profile.email);
      formData.append("phone", profile.phone);
      formData.append("nidNumber", profile.nidNumber);
      formData.append("password", profile.password);
      formData.append("dateOfBirth", profile.dateOfBirth);
      formData.append("address", profile.address);
      formData.append("tinNumber", profile.tinNumber);
      formData.append("investorType", regType === "individual" ? "INDIVIDUAL" : "COMPANY_ORGANIZATION");
      // Bank
      formData.append("bankName", bank.bankName);
      formData.append("branchName", bank.branchName);
      formData.append("accountNumber", bank.accountNumber);
      formData.append("routingNumber", bank.routingNumber);
      formData.append("boAccountNo", bank.boAccountNo);
      // Nominee
      formData.append("nomineeName", nominee.name);
      formData.append("nomineeNidNumber", nominee.nidNumber);
      formData.append("nomineeRelationship", nominee.relationship);
      // Documents
      if (nidFront) formData.append("nidFront", nidFront);
      if (nidBack) formData.append("nidBack", nidBack);
      if (photo) formData.append("photo", photo);
      if (nomineeNid) formData.append("nomineeNidDoc", nomineeNid);
      if (chequeLeaf) formData.append("chequeLeaf", chequeLeaf);
      if (tinCert) formData.append("tinCert", tinCert);

      const res = await fetch("/api/auth/register", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page-bg font-poppins">
        <div className="w-full max-w-[500px] px-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-[22px] font-semibold text-text-dark font-rajdhani mb-2">Registration Submitted!</h1>
          <p className="text-[14px] text-text-body mb-6">
            Your application has been submitted successfully. Our team will review and verify your documents.
            You will receive a confirmation email at <strong>{profile.email}</strong> once approved.
          </p>
          <p className="text-[13px] text-text-muted mb-6">
            Until approval, you can log in with your email and password to check your status.
            After approval, you will receive an Investor Code for login.
          </p>
          <Link href="/login">
            <Button className="bg-ekush-orange hover:bg-ekush-orange-dark text-white">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg font-poppins">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Ekush" className="h-14 mx-auto mb-3" />
          <h1 className="text-[22px] font-semibold text-text-dark font-rajdhani">Online Registration</h1>
          <p className="text-[13px] text-text-body">Ekush Wealth Management Limited</p>
        </div>

        {/* Type toggle */}
        <div className="flex justify-center mb-6">
          <div className="flex rounded-full overflow-hidden border border-ekush-orange">
            <button onClick={() => setRegType("individual")} className={`px-6 py-2 text-[13px] font-medium transition-colors ${regType === "individual" ? "bg-ekush-orange text-white" : "bg-white text-ekush-orange"}`}>
              Individual
            </button>
            <button onClick={() => setRegType("institution")} className={`px-6 py-2 text-[13px] font-medium transition-colors ${regType === "institution" ? "bg-ekush-orange text-white" : "bg-white text-ekush-orange"}`}>
              Institution
            </button>
          </div>
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

        {/* Form card */}
        <div className="bg-white rounded-[10px] shadow-card p-8">

          {/* Step 0: Profile */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-4">Applicant&apos;s Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Applicant's Name (as per Bank)*" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Full name" required />
                <Input label="Email*" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Email address" required />
                <Input label="NID/Passport Number*" value={profile.nidNumber} onChange={(e) => setProfile({ ...profile, nidNumber: e.target.value })} placeholder="NID or Passport Number" required />
                <Input label="Phone Number*" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="01XXXXXXXXX" required />
                <Input label="Password* (min 6 chars)" type="password" value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} placeholder="Create password" required />
                <Input label="Confirm Password*" type="password" value={profile.confirmPassword} onChange={(e) => setProfile({ ...profile, confirmPassword: e.target.value })} placeholder="Confirm password" required />
                <Input label="Date of Birth" type="date" value={profile.dateOfBirth} onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })} />
                <Input label="Present Address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="Address" />
                <Input label="Applicant's E-TIN (12 digits)" value={profile.tinNumber} onChange={(e) => setProfile({ ...profile, tinNumber: e.target.value })} placeholder="12 digit E-TIN" />
              </div>
              {profile.password && profile.confirmPassword && profile.password !== profile.confirmPassword && (
                <p className="text-red-500 text-[12px]">Passwords do not match</p>
              )}
            </div>
          )}

          {/* Step 1: Upload Documents */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-4">Upload Documents</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUpload label="NID/Passport Front*" file={nidFront} onFile={setNidFront} accept="image/*,.pdf" />
                <FileUpload label="NID/Passport Back" file={nidBack} onFile={setNidBack} accept="image/*,.pdf" />
                <FileUpload label="Passport Size Photo" file={photo} onFile={setPhoto} accept="image/*" />
                <FileUpload label="Nominee's NID" file={nomineeNid} onFile={setNomineeNid} accept="image/*,.pdf" />
                <FileUpload label="Blank Cheque Leaf / Bank Statement" file={chequeLeaf} onFile={setChequeLeaf} accept="image/*,.pdf" />
                <FileUpload label="E-TIN Certificate" file={tinCert} onFile={setTinCert} accept="image/*,.pdf" />
              </div>
            </div>
          )}

          {/* Step 2: Bank & BO */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-4">Bank &amp; BO Account Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Bank Name*" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} placeholder="Bank name" required />
                <Input label="Branch Name" value={bank.branchName} onChange={(e) => setBank({ ...bank, branchName: e.target.value })} placeholder="Branch" />
                <Input label="Bank Account No*" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} placeholder="Account number" required />
                <Input label="Routing Number" value={bank.routingNumber} onChange={(e) => setBank({ ...bank, routingNumber: e.target.value })} placeholder="Routing number" />
                <Input label="BO Account No (16 digits)" value={bank.boAccountNo} onChange={(e) => setBank({ ...bank, boAccountNo: e.target.value })} placeholder="16 digit BO Account No" />
              </div>
              <h3 className="text-[14px] font-semibold text-text-dark mt-6 mb-2">Nominee Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Nominee's Name" value={nominee.name} onChange={(e) => setNominee({ ...nominee, name: e.target.value })} placeholder="Nominee name" />
                <Input label="Nominee's NID Number" value={nominee.nidNumber} onChange={(e) => setNominee({ ...nominee, nidNumber: e.target.value })} placeholder="NID" />
                <Input label="Relationship" value={nominee.relationship} onChange={(e) => setNominee({ ...nominee, relationship: e.target.value })} placeholder="e.g., Spouse, Child" />
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
                <p><strong>NID:</strong> {profile.nidNumber}</p>
                <p><strong>Bank:</strong> {bank.bankName} — A/C: {bank.accountNumber}</p>
                {nominee.name && <p><strong>Nominee:</strong> {nominee.name} ({nominee.relationship})</p>}
                <p><strong>Documents:</strong> {[nidFront && "NID Front", nidBack && "NID Back", photo && "Photo", chequeLeaf && "Cheque Leaf", tinCert && "E-TIN"].filter(Boolean).join(", ") || "None"}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-4">
                <p className="text-[13px] text-amber-800">
                  By submitting, you confirm that all information provided is accurate. Your application will be reviewed by our team.
                  You will receive a confirmation email once approved.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-red-500 text-[13px] mt-2">{error}</p>}

          {/* Navigation */}
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
                <Button onClick={handleSubmit} disabled={loading} className="bg-ekush-orange hover:bg-ekush-orange-dark text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                  Submit Registration
                </Button>
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
          <p className="text-[12px] text-green-700 font-medium">{file.name}</p>
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
