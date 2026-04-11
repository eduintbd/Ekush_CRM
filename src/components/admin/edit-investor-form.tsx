"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import { INVESTOR_TYPES, INVESTOR_TYPE_LABELS } from "@/lib/constants";

interface Props {
  investorId: string;
  userId: string;
  initial: {
    name: string;
    email: string;
    phone: string;
    address: string;
    nidNumber: string;
    tinNumber: string;
    investorType: string;
    status: string;
  };
}

const STATUS_OPTIONS = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED"];

export function AdminEditInvestorForm({ investorId, userId, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/investors/${investorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userId }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Changes saved." });
        router.refresh();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data.error || "Failed to save." });
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
        <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="NID Number" value={form.nidNumber} onChange={(e) => setForm({ ...form, nidNumber: e.target.value })} />
        <Input label="TIN Number" value={form.tinNumber} onChange={(e) => setForm({ ...form, tinNumber: e.target.value })} />
        <div>
          <label className="text-[12px] font-medium text-gray-600 mb-1 block">Investor Type</label>
          <select
            value={form.investorType}
            onChange={(e) => setForm({ ...form, investorType: e.target.value })}
            className="w-full h-[50px] rounded-[5px] border border-input-border px-3 text-sm focus:border-ekush-orange focus:outline-none bg-white"
          >
            {INVESTOR_TYPES.map((t) => (
              <option key={t} value={t}>{INVESTOR_TYPE_LABELS[t] || t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[12px] font-medium text-gray-600 mb-1 block">Account Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full h-[50px] rounded-[5px] border border-input-border px-3 text-sm focus:border-ekush-orange focus:outline-none bg-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={loading} size="sm" className="bg-ekush-orange hover:bg-ekush-orange-dark text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          Save Changes
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
