"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, ChevronRight, ChevronLeft, Upload, Loader2, User, FileText, CreditCard, Eye } from "lucide-react";
import Link from "next/link";
import { RegistrationFormPreview } from "@/components/auth/registration-form-preview";

const DRAFT_KEY = "ekush.register.draft.v2";

type DraftFile = { name: string; type: string; dataUrl: string };

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function fileToDraft(f: File | null, cache: Map<File, string>): Promise<DraftFile | null> {
  if (!f) return null;
  let dataUrl = cache.get(f);
  if (!dataUrl) {
    dataUrl = await readAsDataUrl(f);
    cache.set(f, dataUrl);
  }
  return { name: f.name, type: f.type, dataUrl };
}

async function draftToFile(d: DraftFile | null): Promise<File | null> {
  if (!d) return null;
  const res = await fetch(d.dataUrl);
  const blob = await res.blob();
  return new File([blob], d.name, { type: d.type });
}

const STEPS = [
  { id: "profile", title: "Profile", icon: User },
  { id: "documents", title: "Upload Documents", icon: FileText },
  { id: "financial", title: "Financial Information", icon: CreditCard },
  { id: "submit", title: "Submit", icon: CheckCircle },
];

const NOMINEE_RELATIONSHIPS = ["Father/Mother", "Son/Daughter", "Spouse", "Other"];

interface PersonInfo {
  nidNumber: string;
  fatherName: string;
  motherName: string;
  presentAddress: string;
  permanentAddress: string;
}

const EMPTY_PERSON: PersonInfo = {
  nidNumber: "",
  fatherName: "",
  motherName: "",
  presentAddress: "",
  permanentAddress: "",
};

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
  const [nomineeName, setNomineeName] = useState("");

  // Documents — other
  const [tinCert, setTinCert] = useState<File | null>(null);
  const [tinNumber, setTinNumber] = useState("");

  // OCR state
  const [ocrBusy, setOcrBusy] = useState<string | null>(null);

  // Auto-filled / editable info
  const [applicantInfo, setApplicantInfo] = useState<PersonInfo>(EMPTY_PERSON);
  const [nomineeInfo, setNomineeInfo] = useState<PersonInfo>(EMPTY_PERSON);

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);

  // Financial information
  const [chequeLeafPhoto, setChequeLeafPhoto] = useState<File | null>(null);
  const [boAcknowledgement, setBoAcknowledgement] = useState<File | null>(null);
  const [bank, setBank] = useState({
    bankName: "", branchName: "", accountNumber: "", routingNumber: "", boAccountNo: "",
  });
  const [dividendOption, setDividendOption] = useState("CASH");

  // ---- Draft persistence (text + base64 files) ----
  const fileEncodeCache = useRef<Map<File, string>>(new Map());
  const draftLoadedRef = useRef(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Restore draft on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(DRAFT_KEY);
    draftLoadedRef.current = true;
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      // Password is never restored for security — so force the user back to
      // step 0 to re-enter it. They can click Next through the remaining steps
      // because the text fields and files below are all repopulated.
      setStep(0);
      setDraftRestored(true);
      if (d.profile) {
        setProfile({
          name: d.profile.name || "",
          email: d.profile.email || "",
          phone: d.profile.phone || "",
          password: "",
          confirmPassword: "",
        });
      }
      if (d.bank) setBank(d.bank);
      if (typeof d.dividendOption === "string") setDividendOption(d.dividendOption);
      if (typeof d.nomineeRelationship === "string") setNomineeRelationship(d.nomineeRelationship);
      if (typeof d.nomineeName === "string") setNomineeName(d.nomineeName);
      if (typeof d.tinNumber === "string") setTinNumber(d.tinNumber);
      if (d.applicantInfo) setApplicantInfo({ ...EMPTY_PERSON, ...d.applicantInfo });
      if (d.nomineeInfo) setNomineeInfo({ ...EMPTY_PERSON, ...d.nomineeInfo });

      const fileSetters: Record<string, (f: File | null) => void> = {
        nidFront: setNidFront,
        nidBack: setNidBack,
        photo: setPhoto,
        signature: setSignature,
        nomineeNidFront: setNomineeNidFront,
        nomineeNidBack: setNomineeNidBack,
        nomineePhoto: setNomineePhoto,
        nomineeSignature: setNomineeSignature,
        tinCert: setTinCert,
        chequeLeafPhoto: setChequeLeafPhoto,
        boAcknowledgement: setBoAcknowledgement,
      };
      const files = (d.files || {}) as Record<string, DraftFile | null>;
      Object.entries(files).forEach(async ([k, df]) => {
        const setter = fileSetters[k];
        if (!setter) return;
        const f = await draftToFile(df);
        if (f) {
          fileEncodeCache.current.set(f, df!.dataUrl);
          setter(f);
        }
      });
    } catch (e) {
      console.warn("Failed to restore draft", e);
    }
  }, []);

  // Save draft on any change (skip until restore has run)
  useEffect(() => {
    if (typeof window === "undefined" || !draftLoadedRef.current) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const cache = fileEncodeCache.current;
        const filesObj: Record<string, DraftFile | null> = {
          nidFront: await fileToDraft(nidFront, cache),
          nidBack: await fileToDraft(nidBack, cache),
          photo: await fileToDraft(photo, cache),
          signature: await fileToDraft(signature, cache),
          nomineeNidFront: await fileToDraft(nomineeNidFront, cache),
          nomineeNidBack: await fileToDraft(nomineeNidBack, cache),
          nomineePhoto: await fileToDraft(nomineePhoto, cache),
          nomineeSignature: await fileToDraft(nomineeSignature, cache),
          tinCert: await fileToDraft(tinCert, cache),
          chequeLeafPhoto: await fileToDraft(chequeLeafPhoto, cache),
          boAcknowledgement: await fileToDraft(boAcknowledgement, cache),
        };
        if (cancelled) return;
        const draft = {
          step,
          profile: { ...profile, password: "", confirmPassword: "" },
          bank,
          dividendOption,
          nomineeRelationship,
          nomineeName,
          tinNumber,
          applicantInfo,
          nomineeInfo,
          files: filesObj,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        console.warn("Draft autosave failed (likely quota)", e);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    step, profile, bank, dividendOption, nomineeRelationship, nomineeName, tinNumber,
    applicantInfo, nomineeInfo,
    nidFront, nidBack, photo, signature,
    nomineeNidFront, nomineeNidBack, nomineePhoto, nomineeSignature,
    tinCert, chequeLeafPhoto, boAcknowledgement,
  ]);

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

  // ---------- OCR helpers ----------
  const [ocrStatus, setOcrStatus] = useState("");

  // Scale up small images for better OCR (no destructive thresholding —
  // B&W conversion was stripping Bangla glyphs)
  async function preprocessImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Scale so the longest edge is ~2400px (Tesseract likes high-res)
        const scale = Math.max(1, 2400 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Convert to grayscale only (no thresholding) so Bangla glyphs survive
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
          d[i] = d[i + 1] = d[i + 2] = gray;
        }
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
          "image/png",
        );
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = URL.createObjectURL(file);
    });
  }

  async function runOCR(file: File): Promise<string> {
    // @ts-ignore — types provided by the package once installed
    const mod: any = await import("tesseract.js");
    const Tesseract: any = mod.default ?? mod;

    let blob: Blob;
    try {
      blob = await preprocessImage(file);
    } catch {
      blob = file;
    }

    // Run ben+eng together in a single pass (avoids the memory issues
    // of two parallel Tesseract WASM instances in the same tab)
    let text = "";
    try {
      const result = await Tesseract.recognize(blob, "ben+eng");
      text = (result.data?.text as string) || "";
    } catch (e1) {
      // Fallback: try eng only (ben lang data may fail to download)
      try {
        const result = await Tesseract.recognize(blob, "eng");
        text = (result.data?.text as string) || "";
      } catch {
        text = "";
      }
    }
    return text;
  }

  // Primary extraction path: Claude Vision via /api/ocr/extract.
  // Returns structured fields or null if the endpoint is unavailable / fails.
  async function extractViaAI(
    file: File,
    type: "nid" | "bo" | "tin",
  ): Promise<Record<string, string | null> | null> {
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("type", type);
      const res = await fetch("/api/ocr/extract", { method: "POST", body: fd });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json?.success || !json.data) return null;
      return json.data as Record<string, string | null>;
    } catch {
      return null;
    }
  }

  function toAsciiDigits(s: string): string {
    return s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  }

  function extractDigits(text: string, minLen: number, maxLen: number): string {
    const ascii = toAsciiDigits(text);
    const clean = ascii.replace(/[\s\-_.]/g, "");
    // prefer exact-length runs first
    for (let len = maxLen; len >= minLen; len--) {
      const re = new RegExp(`(?<!\\d)\\d{${len}}(?!\\d)`);
      const m = clean.match(re);
      if (m) return m[0];
    }
    const matches = ascii.match(/\d{4,}/g) || [];
    const all = matches.sort((a, b) => b.length - a.length);
    return all[0] || "";
  }

  function extractAfterLabel(text: string, labels: string[]): string {
    const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    for (const label of labels) {
      const l = label.toLowerCase();
      for (let i = 0; i < lines.length; i++) {
        const lineLower = lines[i].toLowerCase();
        const idx = lineLower.indexOf(l);
        if (idx < 0) continue;

        // Try same-line text after the label
        let sameLine = lines[i].slice(idx + label.length).replace(/^[:\-\s,]+/, "").trim();
        // Strip trailing "নাম" (meaning "name") that BD NIDs append
        sameLine = sameLine.replace(/\s*নাম\s*$/, "").trim();
        if (sameLine.length > 2 && !/^[\d\s]+$/.test(sameLine)) return sameLine;

        // Value is on the NEXT line (BD NID format: label on one line, value below)
        if (i + 1 < lines.length) {
          let nextLine = lines[i + 1].replace(/\s*নাম\s*$/, "").trim();
          if (nextLine.length > 2 && !/^[\d\s]+$/.test(nextLine)) return nextLine;
        }
      }
    }
    return "";
  }

  // For address: grab everything after the label until the next section
  function extractAddress(text: string, labels: string[]): string {
    const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    for (const label of labels) {
      const l = label.toLowerCase();
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].toLowerCase().includes(l)) continue;
        // Same-line remainder
        let rest = lines[i].slice(lines[i].toLowerCase().indexOf(l) + label.length).replace(/^[:\-\s,]+/, "").trim();
        // Grab subsequent lines until we hit another known section or run out
        const addrLines: string[] = rest.length > 2 ? [rest] : [];
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const jl = lines[j].toLowerCase();
          // Stop at next section label
          if (["পিতা", "মাতা", "নাম", "date", "birth", "জন্ম", "blood", "রক্ত"].some((s) => jl.includes(s))) break;
          if (lines[j].length > 2) addrLines.push(lines[j]);
        }
        const addr = addrLines.join(", ").trim();
        if (addr.length > 3) return addr;
      }
    }
    return "";
  }

  function extractName(text: string): string {
    const m = text.match(/Name[:\s]+([A-Z][A-Z .]{3,})/);
    if (m) return m[1].trim();
    return extractAfterLabel(text, ["নাম"]);
  }

  function extractBoId(text: string): string {
    // Same-line: "BO ID: 1234567890123456"
    const labeled = text.match(/(?:BO\s*(?:ID|A\/?C|Account)[^\d]{0,20})(\d[\d\s\-]{12,})/i);
    if (labeled) {
      const digits = labeled[1].replace(/\D/g, "");
      if (digits.length >= 12) return digits.slice(0, 16);
    }
    // Next-line: "BO ID\n1234567890123456"
    const lines = text.split(/[\r\n]+/);
    for (let i = 0; i < lines.length; i++) {
      if (/BO\s*(ID|A\/?C|Account)/i.test(lines[i]) && i + 1 < lines.length) {
        const digits = toAsciiDigits(lines[i + 1]).replace(/\D/g, "");
        if (digits.length >= 12) return digits.slice(0, 16);
      }
    }
    const clean = toAsciiDigits(text).replace(/[\s\-_.]/g, "");
    const m16 = clean.match(/(?<!\d)\d{16}(?!\d)/);
    if (m16) return m16[0];
    return extractDigits(text, 12, 17);
  }

  function extractTin(text: string): string {
    // Same-line: "TIN 556416175550"
    const labeled = text.match(/(?:e[-\s]?TIN|TIN|Tax\s*Identification\s*Number)[^\d]{0,20}(\d[\d\s\-]{8,})/i);
    if (labeled) {
      const digits = labeled[1].replace(/\D/g, "");
      if (digits.length >= 9) return digits.slice(0, 12);
    }
    // Next-line: "TIN\n556416175550"
    const lines = text.split(/[\r\n]+/);
    for (let i = 0; i < lines.length; i++) {
      if (/e[-\s]?TIN|TIN/i.test(lines[i]) && i + 1 < lines.length) {
        const digits = toAsciiDigits(lines[i + 1]).replace(/\D/g, "");
        if (digits.length >= 9) return digits.slice(0, 12);
      }
    }
    const clean = toAsciiDigits(text).replace(/[\s\-_.]/g, "");
    const m12 = clean.match(/(?<!\d)\d{12}(?!\d)/);
    if (m12) return m12[0];
    return extractDigits(text, 9, 14);
  }

  const FATHER_LABELS = [
    "Father's Name", "Fathers Name", "Father Name", "Father/Husband", "Father",
    "পিতার নাম", "পিতা", "স্বামী",
  ];
  const MOTHER_LABELS = [
    "Mother's Name", "Mothers Name", "Mother Name", "Mother",
    "মাতার নাম", "মাতা",
  ];
  const PRESENT_ADDR_LABELS = [
    "Present Address", "Address", "বর্তমান ঠিকানা", "ঠিকানা",
  ];
  const PERM_ADDR_LABELS = [
    "Permanent Address", "স্থায়ী ঠিকানা",
  ];

  async function runNidOcrInto(file: File, target: "applicant" | "nominee") {
    const label = target === "applicant" ? "Applicant" : "Nominee";
    setOcrStatus(`Reading ${label} NID — this may take a moment...`);

    // Try Claude Vision first; fall back to Tesseract if unavailable
    let nid = "";
    let father = "";
    let mother = "";
    let present = "";
    let permanent = "";
    let text = "";

    const ai = await extractViaAI(file, "nid");
    if (ai) {
      nid = (ai.nidNumber || "").toString().replace(/\D/g, "");
      father = (ai.fatherName || "").toString().trim();
      mother = (ai.motherName || "").toString().trim();
      present = (ai.presentAddress || "").toString().trim();
      permanent = (ai.permanentAddress || "").toString().trim();
    } else {
      text = await runOCR(file);
      nid = extractDigits(text, 10, 17);
      father = extractAfterLabel(text, FATHER_LABELS);
      mother = extractAfterLabel(text, MOTHER_LABELS);
      present = extractAddress(text, PRESENT_ADDR_LABELS);
      permanent = extractAddress(text, PERM_ADDR_LABELS);
    }

    // Build a summary of what was found
    const found: string[] = [];
    if (nid) found.push(`NID: ${nid}`);
    if (father) found.push(`Father: ${father}`);
    if (mother) found.push(`Mother: ${mother}`);
    if (present) found.push("Address: found");

    if (found.length > 0) {
      setOcrStatus(`${label} — ${found.join(" | ")}`);
    } else {
      // Show a snippet of the raw OCR text so the user knows it tried
      const snippet = text.replace(/\s+/g, " ").trim().slice(0, 120);
      setOcrStatus(
        snippet
          ? `${label} NID: could not match fields. Raw text: "${snippet}…" — use Edit in the preview.`
          : `${label} NID: OCR returned empty — the image may be too small or blurry. Use Edit in the preview.`,
      );
    }
    setTimeout(() => setOcrStatus(""), 12000);

    // Keep existing non-empty values when new OCR pass doesn't find them
    const merge = (prev: PersonInfo): PersonInfo => ({
      ...prev,
      nidNumber: prev.nidNumber || nid,
      fatherName: prev.fatherName || father,
      motherName: prev.motherName || mother,
      presentAddress: prev.presentAddress || present,
      permanentAddress: prev.permanentAddress || permanent,
    });
    if (target === "applicant") {
      setApplicantInfo(merge);
    } else {
      setNomineeInfo(merge);
      // Prefer AI-extracted English name, then Bengali, then heuristic from raw text
      const nm = (ai?.nameEnglish || ai?.nameBengali || extractName(text) || "").toString().trim();
      if (nm) setNomineeName((prev) => prev || nm);
    }
  }

  async function handleNidUpload(
    file: File | null,
    target: "applicant" | "nominee",
    side: "front" | "back",
  ) {
    const setters = {
      applicant: { front: setNidFront, back: setNidBack },
      nominee: { front: setNomineeNidFront, back: setNomineeNidBack },
    };
    setters[target][side](file);
    if (!file) return;
    const busyKey = `${target}-nid-${side}`;
    setOcrBusy(busyKey);
    try {
      await runNidOcrInto(file, target);
    } catch (e) {
      console.error("OCR failed", e);
      setOcrStatus(`${target === "applicant" ? "Applicant" : "Nominee"} NID reading failed — use Edit in preview.`);
      setTimeout(() => setOcrStatus(""), 5000);
    } finally {
      setOcrBusy(null);
    }
  }

  async function handleBoUpload(file: File | null) {
    setBoAcknowledgement(file);
    if (!file) return;
    setOcrBusy("bo");
    setOcrStatus("Reading BO acknowledgement...");
    try {
      let boId = "";
      const ai = await extractViaAI(file, "bo");
      if (ai?.boAccountNumber) {
        boId = ai.boAccountNumber.toString().replace(/\D/g, "").slice(0, 16);
      } else {
        const text = await runOCR(file);
        boId = extractBoId(text);
      }
      if (boId) {
        setBank((b) => ({ ...b, boAccountNo: b.boAccountNo || boId }));
        setOcrStatus(`Extracted BO: ${boId}`);
      } else {
        setOcrStatus("Could not extract BO number — enter it manually.");
      }
      setTimeout(() => setOcrStatus(""), 6000);
    } catch (e) {
      console.error("BO OCR failed", e);
      setOcrStatus("BO reading failed.");
      setTimeout(() => setOcrStatus(""), 4000);
    } finally {
      setOcrBusy(null);
    }
  }

  async function handleTinUpload(file: File | null) {
    setTinCert(file);
    if (!file) return;
    setOcrBusy("tin");
    setOcrStatus("Reading E-TIN certificate...");
    try {
      let tin = "";
      const ai = await extractViaAI(file, "tin");
      if (ai?.tinNumber) {
        tin = ai.tinNumber.toString().replace(/\D/g, "").slice(0, 12);
      } else {
        const text = await runOCR(file);
        tin = extractTin(text);
      }
      if (tin) {
        setTinNumber((prev) => prev || tin);
        setOcrStatus(`Extracted TIN: ${tin}`);
      } else {
        setOcrStatus("Could not extract TIN — enter it manually.");
      }
      setTimeout(() => setOcrStatus(""), 6000);
    } catch (e) {
      console.error("TIN OCR failed", e);
      setOcrStatus("TIN reading failed.");
      setTimeout(() => setOcrStatus(""), 4000);
    } finally {
      setOcrBusy(null);
    }
  }

  const handleSubmit = async () => {
    setError("");
    if (!profile.password || profile.password.length < 6) {
      setError("Please enter your password (min 6 characters) on the Profile step to continue.");
      setStep(0);
      return;
    }
    setLoading(true);
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
      formData.append("nomineeName", nomineeName);

      // Applicant additional info
      formData.append("nidNumber", applicantInfo.nidNumber);
      formData.append("fatherName", applicantInfo.fatherName);
      formData.append("motherName", applicantInfo.motherName);
      formData.append("presentAddress", applicantInfo.presentAddress);
      formData.append("permanentAddress", applicantInfo.permanentAddress);
      formData.append("tinNumber", tinNumber);

      // Nominee additional info
      formData.append("nomineeNidNumber", nomineeInfo.nidNumber);
      formData.append("nomineeFatherName", nomineeInfo.fatherName);
      formData.append("nomineeMotherName", nomineeInfo.motherName);
      formData.append("nomineePresentAddress", nomineeInfo.presentAddress);
      formData.append("nomineePermanentAddress", nomineeInfo.permanentAddress);

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

      // Submission succeeded — clear the autosaved draft
      try { localStorage.removeItem(DRAFT_KEY); } catch {}

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
          <img src="/logo-color.png" alt="Ekush" className="h-14 mx-auto mb-3" />
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
              {draftRestored && !profile.password && (
                <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-3 text-[13px] text-amber-800">
                  We restored your saved progress. For your security, please re-enter your password to continue.
                </div>
              )}
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

              {ocrStatus && (
                <div className="px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-[12px] text-blue-800 animate-pulse">
                  {ocrStatus}
                </div>
              )}
              <p className="text-[11px] text-text-body -mt-3">
                Data from NID, BO, and E-TIN uploads is auto-extracted and printed onto the registration form. Use the <strong>Edit</strong> button in the preview to correct or fill any field manually.
              </p>

              {/* Principal Applicant */}
              <div>
                <h3 className="text-[14px] font-semibold text-text-dark mb-3">Principal Applicant&apos;s Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FileUpload
                    label="NID Front*"
                    file={nidFront}
                    onFile={(f) => handleNidUpload(f, "applicant", "front")}
                    accept="image/*,.pdf"
                    busy={ocrBusy === "applicant-nid-front"}
                  />
                  <FileUpload
                    label="NID Back Page"
                    file={nidBack}
                    onFile={(f) => handleNidUpload(f, "applicant", "back")}
                    accept="image/*,.pdf"
                    busy={ocrBusy === "applicant-nid-back"}
                  />
                  <FileUpload label="Passport Size Photo" file={photo} onFile={setPhoto} accept="image/*" />
                  <FileUpload label="Digital Signature" file={signature} onFile={setSignature} accept="image/*" />
                </div>

              </div>

              {/* Nominee */}
              <div>
                <h3 className="text-[14px] font-semibold text-text-dark mb-3">Nominee Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FileUpload
                    label="NID Front Page"
                    file={nomineeNidFront}
                    onFile={(f) => handleNidUpload(f, "nominee", "front")}
                    accept="image/*,.pdf"
                    busy={ocrBusy === "nominee-nid-front"}
                  />
                  <FileUpload
                    label="NID Back Page"
                    file={nomineeNidBack}
                    onFile={(f) => handleNidUpload(f, "nominee", "back")}
                    accept="image/*,.pdf"
                    busy={ocrBusy === "nominee-nid-back"}
                  />
                  <FileUpload label="Passport Size Photo" file={nomineePhoto} onFile={setNomineePhoto} accept="image/*" />
                  <FileUpload label="Digital Signature" file={nomineeSignature} onFile={setNomineeSignature} accept="image/*" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <Input
                    label="Nominee Name"
                    value={nomineeName}
                    onChange={(e) => setNomineeName(e.target.value)}
                    placeholder="Nominee full name"
                  />
                  <div>
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
              </div>

              {/* TIN */}
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <FileUpload
                    label="E-TIN Certificate of Principal Applicant"
                    file={tinCert}
                    onFile={handleTinUpload}
                    accept="image/*,.pdf"
                    busy={ocrBusy === "tin"}
                  />
                  <Input
                    label="E-TIN Number"
                    value={tinNumber}
                    onChange={(e) => setTinNumber(e.target.value)}
                    placeholder="Auto-filled from E-TIN certificate"
                  />
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
                  onFile={handleBoUpload}
                  accept="image/*,.pdf"
                  busy={ocrBusy === "bo"}
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
                {nomineeName && <p><strong>Nominee:</strong> {nomineeName} ({nomineeRelationship || "—"})</p>}
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
          applicant: applicantInfo,
          nominee: { ...nomineeInfo, name: nomineeName },
          bank: {
            bankName: bank.bankName,
            branchName: bank.branchName,
            accountNumber: bank.accountNumber,
            routingNumber: bank.routingNumber,
            boAccountNo: bank.boAccountNo,
          },
          tinNumber,
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

function FileUpload({
  label,
  file,
  onFile,
  accept,
  busy,
}: {
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
  accept: string;
  busy?: boolean;
}) {
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
        {busy ? (
          <div className="flex items-center justify-center gap-2 text-[11px] text-ekush-orange">
            <Loader2 className="w-4 h-4 animate-spin" /> Reading…
          </div>
        ) : file ? (
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
