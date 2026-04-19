"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export function ResetPasswordClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [email, setEmail] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setLoadError("Missing reset token."); setLoading(false); return; }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Invalid token");
        setEmail(data.email);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Could not load token"))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Reset failed"); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 2200);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg font-poppins px-4">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="Ekush" className="h-14 w-auto mb-2" />
        </div>
        <div className="bg-white rounded-card shadow-card p-8">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
          ) : loadError ? (
            <div className="flex items-start gap-3 bg-red-50 text-red-700 p-4 rounded-md">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">This link won't work</p>
                <p className="text-[13px] mt-1">{loadError}</p>
                <Link href="/forgot-password" className="text-[13px] text-ekush-orange hover:underline mt-3 inline-block">
                  Request a new link
                </Link>
              </div>
            </div>
          ) : done ? (
            <div className="text-center">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold font-rajdhani text-text-dark">Password updated</h2>
              <p className="text-[13px] text-text-body mt-2">Redirecting you to log in…</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-text-dark font-rajdhani mb-1">Set a new password</h2>
              {email && <p className="text-[13px] text-text-body mb-4">For <strong>{email}</strong></p>}
              {error && (
                <div className="bg-red-50 text-red-600 text-[13px] p-3 rounded-md mb-4 border border-red-200">
                  {error}
                </div>
              )}
              <form onSubmit={submit} className="space-y-4">
                <div className="relative">
                  <Input
                    label="New Password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 10 chars, 1 upper, 1 lower, 1 digit, 1 symbol"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-[38px] text-text-body hover:text-text-dark"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <Input
                  label="Confirm Password"
                  type={showPwd ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                <Button type="submit" disabled={submitting} className="w-full h-[48px]">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Update password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
