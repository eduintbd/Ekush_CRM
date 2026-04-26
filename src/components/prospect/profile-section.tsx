"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Profile editor for the prospect dashboard. Phone changes are
// intentionally NOT supported here in v1 — they require a fresh
// SMS-OTP flow which lives behind a follow-up endpoint. The field is
// shown read-only with a "contact support" hint.

type Initial = {
  phone: string;
  email: string | null;
  marketingConsent: boolean;
};

export function ProspectProfileSection({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [email, setEmail] = useState(initial.email ?? "");
  const [marketingConsent, setMarketingConsent] = useState(initial.marketingConsent);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/prospects/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || null,
          marketingConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save changes.");
        return;
      }
      setMessage("Profile updated.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/prospects/me", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete account.");
        return;
      }
      // Server already revoked the auth account; bounce to login.
      router.push("/login");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <h2 className="text-[15px] font-bold text-text-dark font-rajdhani mb-4">
        Profile &amp; Preferences
      </h2>

      {error ? (
        <div className="bg-red-50 text-red-600 text-[13px] p-3 rounded-[5px] mb-4 border border-red-200">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="bg-green-50 text-green-700 text-[13px] p-3 rounded-[5px] mb-4 border border-green-200">
          {message}
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] text-text-label mb-1.5">
            WhatsApp Number
          </label>
          <input
            type="text"
            value={`+880 ${initial.phone}`}
            readOnly
            className="w-full h-[44px] rounded-[10px] border border-input-border bg-page-bg px-3 text-[14px] text-text-body cursor-not-allowed"
          />
          <p className="text-[11px] text-text-body mt-1">
            To change your number, contact support — we&rsquo;ll re-verify
            via OTP.
          </p>
        </div>

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <label className="flex items-start gap-2 text-[13px] text-text-body mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          className="mt-0.5 accent-ekush-orange"
        />
        <span>
          Receive fund updates from Ekush WML on WhatsApp/SMS. Untick to
          opt out at any time.
        </span>
      </label>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button
          onClick={saveProfile}
          disabled={saving}
          className="sm:w-auto px-6 h-[42px] text-[14px]"
        >
          {saving ? "Saving..." : "Save changes"}
        </Button>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-[13px] text-red-600 hover:underline self-center"
          >
            Delete my account
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:ml-auto">
            <span className="text-[13px] text-text-body">
              Permanently delete? You&rsquo;ll lose access immediately.
            </span>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting}
              className="text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-[5px] disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-[13px] text-text-body hover:text-text-dark"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
