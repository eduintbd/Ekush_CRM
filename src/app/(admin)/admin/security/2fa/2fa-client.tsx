"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

// Three states:
//   1. Already enrolled — show tombstone, no controls
//   2. Mid-enrollment   — show "your previous QR is still active, but
//                          starting fresh issues a new one" + Start
//   3. Not enrolled     — show big Start button
// On Start, we POST to /enroll/start, render the QR + secret, then
// accept the 6-digit code and POST to /enroll/confirm to finalise.

type Bundle = { secret: string; otpauthUri: string; qrDataUrl: string };

export function TwoFactorEnrollmentClient({
  alreadyEnrolled,
  mid,
  account,
}: {
  alreadyEnrolled: boolean;
  mid: boolean;
  account: string;
}) {
  const router = useRouter();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function start() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/2fa/enroll/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start enrollment.");
        return;
      }
      setBundle({
        secret: data.secret,
        otpauthUri: data.otpauthUri,
        qrDataUrl: data.qrDataUrl,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/2fa/enroll/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not verify code.");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (alreadyEnrolled || done) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">
          Two-Factor Authentication
        </h1>
        <div className="bg-white rounded-card shadow-card p-8 mt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani">
                2FA enrolled
              </h2>
              <p className="text-[13px] text-text-body">
                Your account requires a 6-digit code from your authenticator
                app on every login.
              </p>
            </div>
          </div>
          <p className="text-[12px] text-text-body mt-4">
            Lost access? Ask a Super Admin to reset 2FA for your account &mdash;
            recovery codes are not enabled in this version.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">
        Set up Two-Factor Authentication
      </h1>
      <p className="text-[13px] text-text-body mt-1">
        Logged in as <span className="font-mono">{account}</span>
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 text-[13px] p-3.5 rounded-[5px] mt-4 border border-red-200">
          {error}
        </div>
      )}

      {!bundle ? (
        <div className="bg-white rounded-card shadow-card p-8 mt-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-ekush-orange/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-ekush-orange" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-text-dark font-rajdhani">
                What you&rsquo;ll need
              </h2>
              <p className="text-[13px] text-text-body mt-1">
                An authenticator app on your phone &mdash; Google
                Authenticator, Authy, 1Password, Aegis, or any app that
                supports TOTP. We&rsquo;ll show a QR code; you scan it
                and the app starts producing 6-digit codes.
              </p>
            </div>
          </div>

          {mid && (
            <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-[5px] p-2.5">
              You started enrollment earlier but didn&rsquo;t confirm. Starting
              again will issue a new QR &mdash; the previous code stops working.
            </p>
          )}

          <Button onClick={start} disabled={busy} className="w-full sm:w-auto">
            {busy ? "Loading..." : mid ? "Start over" : "Start enrollment"}
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-card p-8 mt-4 space-y-5">
          <ol className="space-y-4 text-[13px] text-text-dark list-decimal list-inside">
            <li>
              Open your authenticator app and add a new account by scanning
              this QR code:
              <div className="mt-3 inline-block p-3 bg-white border border-input-border rounded-[8px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bundle.qrDataUrl}
                  alt="2FA QR code"
                  className="w-[240px] h-[240px]"
                />
              </div>
            </li>
            <li>
              Or paste this secret manually into the app:
              <pre className="mt-2 p-2.5 bg-page-bg rounded-[5px] text-[12px] font-mono break-all border border-input-border">
                {bundle.secret}
              </pre>
            </li>
            <li>
              Enter the 6-digit code your app shows now to confirm:
              <form onSubmit={confirm} className="mt-3 flex flex-col sm:flex-row sm:items-end gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="^[0-9]{6}$"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  autoComplete="one-time-code"
                  spellCheck={false}
                  required
                  className="w-full sm:w-[180px] h-[44px] rounded-[10px] border border-input-border bg-input-bg px-3 text-center text-[18px] tracking-[0.4em] font-semibold text-text-dark focus:outline-none focus:border-ekush-orange transition-colors"
                />
                <Button type="submit" disabled={busy || code.length !== 6}>
                  {busy ? "Verifying..." : "Confirm"}
                </Button>
              </form>
            </li>
          </ol>
          <p className="text-[12px] text-text-body">
            <CheckCircle2 className="w-3 h-3 inline text-green-600 mr-1" />
            Once confirmed, every future admin login will ask for the latest
            6-digit code from your app.
          </p>
        </div>
      )}
    </div>
  );
}
