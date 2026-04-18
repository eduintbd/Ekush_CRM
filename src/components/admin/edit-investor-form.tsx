"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Trash2, CheckCircle } from "lucide-react";
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
    investorCode: string;
    welcomeEmailSentAt: string | null;
  };
}

const STATUS_OPTIONS = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED"];
const INVESTOR_CODE_PATTERN = /^[A-Z]\d{5,6}$/;

export function AdminEditInvestorForm({ investorId, userId, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const startedPending = initial.status === "PENDING";
  const [investorCode, setInvestorCode] = useState(
    startedPending ? "" : initial.investorCode,
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [welcomeEmailSentAt, setWelcomeEmailSentAt] = useState<string | null>(
    initial.welcomeEmailSentAt,
  );
  const [resendingWelcome, setResendingWelcome] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isApproving = startedPending && form.status === "ACTIVE";
  const needsCode = form.status === "ACTIVE" && (!investorCode || !INVESTOR_CODE_PATTERN.test(investorCode));

  const handleSave = async () => {
    setMessage(null);
    if (needsCode) {
      setMessage({
        type: "error",
        text: "Please enter a valid investor code (e.g. A00730) before activating the account.",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/investors/${investorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          userId,
          investorCode: investorCode || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const welcome = data?.welcomeEmail as
          | { status: "SENT" | "FAILED"; error?: string }
          | undefined;
        let text: string;
        if (isApproving && welcome?.status === "SENT") {
          text = `Investor approved and welcome email sent to ${form.email}.`;
          setWelcomeEmailSentAt(new Date().toISOString());
        } else if (isApproving && welcome?.status === "FAILED") {
          text = `Investor approved, but welcome email failed: ${welcome.error || "unknown error"}. Use "Send Now" below to retry.`;
        } else if (isApproving) {
          text = `Investor approved and assigned code ${investorCode}.`;
        } else {
          text = "Changes saved.";
        }
        setMessage({
          type: welcome?.status === "FAILED" ? "error" : "success",
          text,
        });
        router.refresh();
        setTimeout(() => setMessage(null), 6000);
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
        <div>
          <label className="text-[12px] font-medium text-gray-600 mb-1 block">
            Investor Code {form.status === "ACTIVE" && <span className="text-red-500">*</span>}
          </label>
          <input
            value={investorCode}
            onChange={(e) => setInvestorCode(e.target.value.toUpperCase())}
            placeholder="e.g. A00730"
            className="w-full h-[50px] rounded-[5px] border border-input-border px-3 text-sm focus:border-ekush-orange focus:outline-none bg-white font-mono"
          />
          <p className="text-[11px] text-text-body mt-1">
            Required when activating. Format: one letter followed by 5–6 digits (e.g. A00730, A123456).
          </p>
        </div>
      </div>
      <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

      {isApproving && !needsCode && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 text-[12px] text-green-800 flex items-start gap-2">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            About to approve this investor. On Save, the account will become <strong>ACTIVE</strong> with code <strong>{investorCode}</strong>, and a welcome email will be sent to <strong>{form.email || "(no email on file)"}</strong> with their investor code as the login credential.
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={loading || deleting} size="sm" className="bg-ekush-orange hover:bg-ekush-orange-dark text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          {isApproving ? "Approve & Save" : "Save Changes"}
        </Button>
        <Button
          onClick={async () => {
            if (!window.confirm(`Are you sure you want to permanently delete investor "${form.name}"? This will remove the user account and all related data (holdings, transactions, documents, nominees, etc.). This action cannot be undone.`)) return;
            setDeleting(true);
            setMessage(null);
            try {
              const res = await fetch(`/api/admin/investors/${investorId}`, { method: "DELETE" });
              if (res.ok) {
                router.push("/admin/investors");
                router.refresh();
              } else {
                const data = await res.json().catch(() => ({}));
                setMessage({ type: "error", text: data.error || "Delete failed." });
              }
            } catch {
              setMessage({ type: "error", text: "Network error." });
            } finally {
              setDeleting(false);
            }
          }}
          disabled={loading || deleting}
          size="sm"
          variant="outline"
          className="border-red-400 text-red-600 hover:bg-red-50"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
          Delete Investor
        </Button>
        {message && (
          <span className={`text-[12px] ${message.type === "success" ? "text-green-600" : "text-red-500"}`}>
            {message.text}
          </span>
        )}
      </div>

      {/* Welcome email status (only meaningful once the account is active) */}
      {form.status === "ACTIVE" && (
        <div className="pt-2 border-t border-gray-100 flex items-center gap-3 flex-wrap text-[12px]">
          {welcomeEmailSentAt ? (
            <span className="text-green-700 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Welcome email sent on{" "}
              {new Date(welcomeEmailSentAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          ) : (
            <>
              <span className="text-amber-600">⚠ Welcome email not yet sent.</span>
              <Button
                size="sm"
                variant="outline"
                disabled={resendingWelcome || !form.email}
                onClick={async () => {
                  setResendingWelcome(true);
                  setMessage(null);
                  try {
                    const res = await fetch(
                      `/api/admin/investors/${investorId}/welcome-email`,
                      { method: "POST" },
                    );
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                      setWelcomeEmailSentAt(new Date().toISOString());
                      setMessage({
                        type: "success",
                        text: `Welcome email sent to ${form.email}.`,
                      });
                      setTimeout(() => setMessage(null), 4000);
                    } else {
                      setMessage({
                        type: "error",
                        text: data.error || "Failed to send welcome email.",
                      });
                    }
                  } catch {
                    setMessage({ type: "error", text: "Network error." });
                  } finally {
                    setResendingWelcome(false);
                  }
                }}
              >
                {resendingWelcome && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                Send Now
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
