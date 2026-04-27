"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Eye, EyeOff, Check, MessageCircle, X } from "lucide-react";
import { STAFF_ROLES } from "@/lib/roles";

// Two-tab login. Investor (default) keeps the existing investor-code
// flow exactly as it was. Prospect adds phone-number sign-in for the
// Tier-1 audience. Both tabs share the password field so a returning
// user with one credential type only fills it in once.
//
// Hardening (per Phase-2 + brief):
//   - autoComplete="off"  on the identifier inputs (passwords keep
//     their browser autofill — that's the right UX trade-off)
//   - spellCheck={false}  so iOS doesn't autocorrect "A00002" → "Always"
//   - onDrop preventDefault to refuse file drops
//   - text-transform: uppercase on Investor input mirrors the
//     server's normalize step
// Server-side normalization + regex is the actual gate; these are
// belt-and-braces.

const SIGNUP_CHECKLIST = [
  "Applicant's and Nominee's National ID Card",
  "Colour Photos and Signatures of the Applicant(s) and Nominee(s)",
  "Blank Cheque / Bank Statement of the Applicant",
  "Applicant's E-TIN Certificate (if any)",
  "Soft copy of the BO Acknowledgement / BO ID number",
];

type Tab = "investor" | "prospect";

export function LoginClient({ prospectsEnabled }: { prospectsEnabled: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("investor");
  const [investorCode, setInvestorCode] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupGateOpen, setSignupGateOpen] = useState(false);
  // Phase 9 — when /api/auth/login returns { requires2fa: true } we
  // reveal a 6-digit input and resubmit the same payload with the
  // totpCode field added. We keep the password in state so the
  // re-submit doesn't require the user to retype it.
  const [requires2fa, setRequires2fa] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const refuseFileDrop = (e: React.DragEvent) => e.preventDefault();

  async function handleInvestorSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: investorCode,
          password,
          totpCode: requires2fa ? totpCode : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requires2fa) {
          setRequires2fa(true);
          setError(data.error ?? "Enter the 6-digit code from your authenticator app.");
          return;
        }
        setError(data.error ?? "Login failed");
        return;
      }
      const dest = STAFF_ROLES.includes(data.role) ? "/admin/dashboard" : "/dashboard";
      router.push(dest);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleProspectSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/prospects/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.push(data.redirect ?? "/prospect/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleSignUpClick() {
    if (tab === "prospect") {
      router.push("/whatsapp-signup");
      return;
    }
    setSignupGateOpen(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg font-poppins py-10">
      <div className="w-full max-w-[560px] px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-color.png"
            alt="Ekush Wealth Management Limited"
            className="h-16 w-auto mb-3"
          />
          <p className="text-xs text-text-body tracking-wider uppercase">Investor Portal</p>
        </div>

        {/* Two-tier signup CTAs (above the login form). The WhatsApp
            CTA is gated by PROSPECTS_ENABLED — when off, only the
            Open Investment Account CTA shows, centered. */}
        <div
          className={`grid gap-3 mb-6 ${
            prospectsEnabled ? "sm:grid-cols-2" : "grid-cols-1 max-w-[360px] mx-auto"
          }`}
        >
          {prospectsEnabled && (
            <Link
              href="/whatsapp-signup"
              className="group bg-white rounded-card shadow-card p-4 hover:-translate-y-0.5 transition-all duration-300 border-2 border-transparent hover:border-ekush-orange/40"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="w-9 h-9 rounded-[8px] bg-ekush-orange/10 text-ekush-orange flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <ArrowRight className="w-4 h-4 text-text-body group-hover:text-ekush-orange transition-colors" />
              </div>
              <h3 className="text-[14px] font-bold text-text-dark font-rajdhani leading-snug">
                Get fund updates on WhatsApp
              </h3>
              <p className="text-[12px] text-text-body leading-snug mt-1">
                Lightweight signup &mdash; no KYC.
              </p>
            </Link>
          )}

          <Link
            href="/register"
            className="group bg-ekush-orange text-white rounded-card shadow-card p-4 hover:-translate-y-0.5 transition-all duration-300 hover:bg-ekush-orange-dark"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="w-9 h-9 rounded-[8px] bg-white/15 flex items-center justify-center">
                <ArrowRight className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-white/80 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-[14px] font-bold font-rajdhani leading-snug">
              Open investment account
            </h3>
            <p className="text-[12px] text-white/85 leading-snug mt-1">
              Complete the 4-step KYC.
            </p>
          </Link>
        </div>

        {/* Form Card */}
        <div className="max-w-[420px] mx-auto bg-white rounded-card shadow-card p-8">
          {prospectsEnabled ? (
            <div
              role="tablist"
              aria-label="Login mode"
              className="flex border-b border-input-border mb-5 -mx-2"
            >
              <TabButton
                active={tab === "investor"}
                onClick={() => {
                  setTab("investor");
                  setError("");
                }}
              >
                Investor
              </TabButton>
              <TabButton
                active={tab === "prospect"}
                onClick={() => {
                  setTab("prospect");
                  setError("");
                }}
              >
                Prospect
              </TabButton>
            </div>
          ) : (
            <h2 className="text-xl font-bold text-text-dark font-rajdhani mb-6">Log in</h2>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-[13px] p-3.5 rounded-[5px] mb-5 border border-red-200">
              {error}
            </div>
          )}

          {tab === "investor" || !prospectsEnabled ? (
            <form
              onSubmit={handleInvestorSubmit}
              className="space-y-5"
              onDrop={refuseFileDrop}
              noValidate
            >
              <Input
                label="Investor Code"
                placeholder="e.g., A00730"
                value={investorCode}
                onChange={(e) => setInvestorCode(e.target.value.toUpperCase())}
                onDrop={refuseFileDrop}
                autoComplete="off"
                spellCheck={false}
                maxLength={7}
                pattern="^[A-Z][0-9]{1,6}$"
                style={{ textTransform: "uppercase" }}
                required
                disabled={requires2fa}
              />
              <PasswordField
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
                disabled={requires2fa}
              />
              {requires2fa && (
                <div>
                  <label className="block text-[13px] text-text-label mb-1.5">
                    2FA Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="^[0-9]{6}$"
                    maxLength={6}
                    placeholder="123456"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    autoComplete="one-time-code"
                    spellCheck={false}
                    autoFocus
                    required
                    className="w-full h-[50px] rounded-[10px] border border-input-border bg-input-bg px-3 text-center text-[20px] tracking-[0.4em] font-semibold text-text-dark focus:outline-none focus:border-ekush-orange transition-colors"
                  />
                  <p className="text-[11px] text-text-body mt-1">
                    Enter the 6-digit code from your authenticator app.
                  </p>
                </div>
              )}
              <ActionButtons
                onSignUp={handleSignUpClick}
                loading={loading}
                primaryLabel={requires2fa ? "Verify & Log In" : "Log In"}
              />
            </form>
          ) : (
            <form
              onSubmit={handleProspectSubmit}
              className="space-y-5"
              onDrop={refuseFileDrop}
              noValidate
            >
              <div>
                <label className="block text-[13px] text-text-label mb-1.5">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 rounded-[10px] border border-input-border bg-input-bg text-text-dark text-[14px] font-semibold">
                    +880
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="^[0-9]{10,11}$"
                    maxLength={11}
                    placeholder="01712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    onDrop={refuseFileDrop}
                    autoComplete="off"
                    spellCheck={false}
                    required
                    className="flex-1 h-[44px] rounded-[10px] border border-input-border bg-input-bg px-3 text-[14px] text-text-dark focus:outline-none focus:border-ekush-orange transition-colors"
                  />
                </div>
              </div>
              <PasswordField
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
              />
              <ActionButtons
                onSignUp={handleSignUpClick}
                loading={loading}
                primaryLabel="Log In"
              />
            </form>
          )}

          <div className="mt-5 text-center">
            <a
              href="/forgot-password"
              className="text-[13px] text-ekush-orange hover:underline font-medium"
            >
              Forgot Password?
            </a>
          </div>
        </div>

        <p className="max-w-[420px] mx-auto text-center text-[11px] text-text-body mt-6 leading-relaxed">
          Ekush Wealth Management Limited (Ekush) is a registered Asset Management
          Company (license no. BSEC/AMC/2019/44, dated November 20, 2019) under the
          Bangladesh Securities and Exchange Commission (BSEC) of the Government of
          the People&rsquo;s Republic of Bangladesh.
        </p>
      </div>

      {signupGateOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSignupGateOpen(false)}
        >
          <div
            className="bg-white rounded-card shadow-card max-w-[520px] w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSignupGateOpen(false)}
              className="absolute top-3 right-3 text-text-body hover:text-text-dark"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-7">
              <h3 className="text-[17px] font-semibold text-text-dark font-rajdhani mb-4">
                Please keep the soft copy of the following documents ready:
              </h3>

              <ul className="divide-y divide-gray-100">
                {SIGNUP_CHECKLIST.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 py-2.5 text-[13px] text-text-dark"
                  >
                    <Check className="w-4 h-4 text-ekush-orange mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-[11.5px] text-text-body mt-3 italic">
                Note: Mutual fund units will not be credited to your BO account unless BO
                Account Number is provided. For any query, please contact +8801713086101 and
                +88001906440541.
              </p>

              <div className="mt-5 flex justify-center">
                <Button
                  onClick={() => {
                    setSignupGateOpen(false);
                    router.push("/register");
                  }}
                  className="px-8"
                >
                  Accept
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 py-3 text-[14px] font-semibold transition-colors border-b-2 ${
        active
          ? "border-ekush-orange text-ekush-orange"
          : "border-transparent text-text-body hover:text-text-dark"
      }`}
    >
      {children}
    </button>
  );
}

function PasswordField({
  value,
  onChange,
  show,
  onToggleShow,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <Input
        label="Password"
        type={show ? "text" : "password"}
        placeholder="Enter your password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="current-password"
        required
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-4 top-[38px] text-text-body hover:text-text-dark transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );
}

function ActionButtons({
  onSignUp,
  loading,
  primaryLabel,
}: {
  onSignUp: () => void;
  loading: boolean;
  primaryLabel: string;
}) {
  return (
    <div className="flex gap-3">
      <Button type="submit" className="flex-1 h-[50px] text-[15px]" disabled={loading}>
        {loading ? "Logging in..." : primaryLabel}
      </Button>
      <Button
        type="button"
        onClick={onSignUp}
        className="flex-1 h-[50px] text-[15px] bg-white border-2 border-ekush-orange text-ekush-orange hover:bg-ekush-orange hover:text-white"
      >
        Sign Up
      </Button>
    </div>
  );
}
