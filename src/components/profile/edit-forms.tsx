"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Save, Upload, Image, FileText } from "lucide-react";

export function EditContactForm({ email, phone }: { email?: string; phone?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ email: email || "", phone: phone || "" });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_contact", ...form }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
      <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+880-XXX-XXXXXXX" />
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={loading} size="sm" className="bg-[#1e3a5f] hover:bg-[#2d5a8f] text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          Save Contact
        </Button>
        {saved && <span className="text-xs text-green-600">Saved!</span>}
      </div>
    </div>
  );
}

export function EditPersonalForm({ address, nidNumber, tinNumber }: { address?: string; nidNumber?: string; tinNumber?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ address: address || "", nidNumber: nidNumber || "", tinNumber: tinNumber || "" });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_personal", ...form }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Your address" />
      <Input label="NID Number" value={form.nidNumber} onChange={(e) => setForm({ ...form, nidNumber: e.target.value })} placeholder="National ID number" />
      <Input label="TIN Number" value={form.tinNumber} onChange={(e) => setForm({ ...form, tinNumber: e.target.value })} placeholder="Tax Identification Number" />
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={loading} size="sm" className="bg-[#1e3a5f] hover:bg-[#2d5a8f] text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          Save Changes
        </Button>
        {saved && <span className="text-xs text-green-600">Saved!</span>}
      </div>
    </div>
  );
}

export function AddBankForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"cheque" | "manual">("cheque");
  const [form, setForm] = useState({ bankName: "", branchName: "", accountNumber: "", routingNumber: "" });
  const [chequeFile, setChequeFile] = useState<File | null>(null);
  const [chequePreview, setChequePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setChequeFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setChequePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setChequePreview(null);
    }
  };

  const handleAdd = async () => {
    if (mode === "manual" && (!form.bankName || !form.accountNumber)) return;
    if (mode === "cheque" && !chequeFile) return;
    setLoading(true);
    try {
      if (mode === "cheque") {
        const formData = new FormData();
        formData.append("action", "add_bank_cheque");
        formData.append("chequeLeaf", chequeFile!);
        const res = await fetch("/api/profile/bank-upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          setChequeFile(null);
          setChequePreview(null);
          if (fileRef.current) fileRef.current.value = "";
          setOpen(false);
          router.refresh();
        }
      } else {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add_bank", ...form }),
        });
        if (res.ok) {
          setForm({ bankName: "", branchName: "", accountNumber: "", routingNumber: "" });
          setOpen(false);
          router.refresh();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setMode("cheque");
    setForm({ bankName: "", branchName: "", accountNumber: "", routingNumber: "" });
    setChequeFile(null);
    setChequePreview(null);
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline" size="sm">
        <Plus className="w-4 h-4 mr-1" /> Add Bank Account
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
      {/* Mode toggle */}
      <div className="flex rounded-lg border overflow-hidden">
        <button
          type="button"
          onClick={() => setMode("cheque")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium transition-colors ${
            mode === "cheque"
              ? "bg-[#1e3a5f] text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Upload className="w-4 h-4" /> Upload Cheque Leaf
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium transition-colors ${
            mode === "manual"
              ? "bg-[#1e3a5f] text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <FileText className="w-4 h-4" /> Enter Manually
        </button>
      </div>

      {mode === "cheque" ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Upload a photo of your cheque leaf. Your bank details will be extracted from it.</p>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#1e3a5f] hover:bg-blue-50/30 transition-colors"
          >
            {chequePreview ? (
              <div className="space-y-2">
                <img src={chequePreview} alt="Cheque leaf preview" className="max-h-40 mx-auto rounded shadow-sm" />
                <p className="text-xs text-gray-500">{chequeFile?.name} ({((chequeFile?.size || 0) / 1024).toFixed(1)} KB)</p>
                <p className="text-xs text-blue-600">Click to change</p>
              </div>
            ) : (
              <div>
                <Image className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">Click to upload cheque leaf</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF (max 5MB)</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <Input label="Bank Name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g., Dutch Bangla Bank" required />
          <Input label="Branch" value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} placeholder="Branch name" />
          <Input label="Account Number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="Account number" required />
          <Input label="Routing Number" value={form.routingNumber} onChange={(e) => setForm({ ...form, routingNumber: e.target.value })} placeholder="Routing number" />
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleAdd}
          disabled={loading || (mode === "cheque" ? !chequeFile : !form.bankName || !form.accountNumber)}
          size="sm"
          className="bg-[#1e3a5f] hover:bg-[#2d5a8f] text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {mode === "cheque" ? "Upload & Add" : "Add"}
        </Button>
        <Button onClick={resetAndClose} variant="outline" size="sm">Cancel</Button>
      </div>
    </div>
  );
}

export function AddNomineeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", relationship: "", nidNumber: "", share: "100" });
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!form.name) return;
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_nominee", ...form, share: parseFloat(form.share) || 100 }),
      });
      if (res.ok) {
        setForm({ name: "", relationship: "", nidNumber: "", share: "100" });
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline" size="sm">
        <Plus className="w-4 h-4 mr-1" /> Add Nominee
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
      <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nominee name" required />
      <Input label="Relationship" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="e.g., Spouse, Child" />
      <Input label="NID Number" value={form.nidNumber} onChange={(e) => setForm({ ...form, nidNumber: e.target.value })} placeholder="NID" />
      <Input label="Share (%)" type="number" value={form.share} onChange={(e) => setForm({ ...form, share: e.target.value })} placeholder="100" />
      <div className="flex gap-2">
        <Button onClick={handleAdd} disabled={loading} size="sm" className="bg-[#1e3a5f] hover:bg-[#2d5a8f] text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          Add
        </Button>
        <Button onClick={() => setOpen(false)} variant="outline" size="sm">Cancel</Button>
      </div>
    </div>
  );
}

export function DeleteButton({ id, action }: { id: string; action: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this?")) return;
    setLoading(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleDelete} disabled={loading} className="text-red-500 hover:text-red-700 p-1">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}
