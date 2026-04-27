"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

// Two-step signup:
//  1) "form"  — collect details, server creates Prospect (unverified) + sends OTP
//  2) "otp"   — collect 6-digit code, server marks verified + signs in + redirects
//
// We deliberately do NOT pass the password into step 2 via state alone —
// it's kept in a ref so it survives re-renders without leaking through
// React DevTools as a serialized prop. (It still lives in memory, of
// course; this just narrows the visibility surface.)

const INTEREST_OPTIONS = [
  { value: "mutual_funds", label: "Mutual Funds" },
  { value: "sip", label: "SIP (Systematic Investment Plan)" },
  { value: "cip", label: "CIP (Cumulative Investment Plan)" },
  { value: "fund_return", label: "Fund Return" },
  { value: "exploring", label: "Just Exploring" },
  { value: "other", label: "Other" },
];

type Step = "form" | "otp";

export function WhatsAppSignupClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [interest, setInterest] = useState("mutual_funds");
  const [marketingConsent, setMarketingConsent] = useState(false);

  // OTP state
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  // Stash credentials we need on the verify step but don't want re-keyed
  // from form inputs (they're cleared visually after step 1).
  const phoneRef = useRef<string>("");
  const passwordRef = useRef<string>("");

  // Resend cooldown ticker.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!marketingConsent) {
      setError("You must agree to receive fund updates to continue.");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/prospects/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email: email.trim() || undefined,
          password,
          interest,
          marketingConsent: true,
          source: "homepage_cta",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create your account. Try again.");
        return;
      }
      phoneRef.current = data.phone ?? phone;
      passwordRef.current = password;
      setInfo(`We sent a 6-digit code to your WhatsApp number ending in ${maskPhone(phoneRef.current)}.`);
      setResendCooldown(60);
      setStep("otp");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[0-9]{6}$/.test(code)) {
      setError("Code must be 6 digits.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/prospects/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneRef.current,
          code,
          password: passwordRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not verify code.");
        return;
      }
      router.push(data.redirect ?? "/prospect/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/prospects/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneRef.current }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not resend code.");
        if (typeof data.retryAfterSeconds === "number") {
          setResendCooldown(data.retryAfterSeconds);
        }
        return;
      }
      setInfo("Code resent. Check your messages.");
      setResendCooldown(60);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg font-poppins py-12">
      <div className="w-full max-w-[480px] px-6">
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-color.png"
            alt="Ekush Wealth Management Limited"
            className="h-16 w-auto mb-3"
          />
          <p className="text-xs text-text-body tracking-wider uppercase">
            Get Fund Updates on WhatsApp
          </p>
        </div>

        <div className="bg-white rounded-card shadow-card p-8">
          {step === "form" ? (
            <FormStep />
          ) : (
            <OtpStep />
          )}
        </div>

        <p className="text-center text-[12px] text-text-body mt-6">
          Already a prospect?{" "}
          <Link href="/login" className="text-ekush-orange hover:underline font-semibold">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );

  // Inlined as closures so they share state without prop-drilling. No
  // measurable perf cost at this size.
  function FormStep() {
    return (
      <>
        <h2 className="text-xl font-bold text-text-dark font-rajdhani mb-1">
          Tell us about yourself
        </h2>
        <p className="text-[13px] text-text-body mb-6">
          We&rsquo;ll send you a verification code on WhatsApp.
        </p>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        <form onSubmit={handleSubmitForm} className="space-y-4" noValidate>
          <Input
            label="Full Name"
            placeholder="Your name as on your NID"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />

          <div>
            <label className="block text-[13px] text-text-label mb-1.5">
              WhatsApp Number
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
                autoComplete="off"
                spellCheck={false}
                required
                className="flex-1 h-[44px] rounded-[10px] border border-input-border bg-input-bg px-3 text-[14px] text-text-dark focus:outline-none focus:border-ekush-orange transition-colors"
              />
            </div>
          </div>

          <Input
            label="Email (optional)"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <div className="relative">
            <Input
              label="Password (min 10 chars)"
              type={showPassword ? "text" : "password"}
              placeholder="Create password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[38px] text-text-body hover:text-text-dark transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div>
            <label className="block text-[13px] text-text-label mb-1.5">
              Area of Interest
            </label>
            <select
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              className="w-full h-[44px] rounded-[10px] border border-input-border bg-input-bg px-3 text-[14px] text-text-dark focus:outline-none focus:border-ekush-orange transition-colors"
            >
              {INTEREST_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-2 text-[12px] text-text-body cursor-pointer">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5 accent-ekush-orange"
              required
            />
            <span>
              I agree to receive fund updates from Ekush WML on WhatsApp/SMS.
              Opt out anytime.
            </span>
          </label>

          <Button
            type="submit"
            className="w-full h-[50px] text-[15px]"
            disabled={loading}
          >
            {loading ? "Sending code..." : "Send Verification Code"}
          </Button>
        </form>
      </>
    );
  }

  function OtpStep() {
    return (
      <>
        <h2 className="text-xl font-bold text-text-dark font-rajdhani mb-1">
          Enter verification code
        </h2>
        {info ? <p className="text-[13px] text-text-body mb-6">{info}</p> : null}

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        <form onSubmit={handleVerify} className="space-y-5" noValidate>
          <div>
            <label className="block text-[13px] text-text-label mb-1.5">
              6-digit code
            </label>
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
              className="w-full h-[50px] rounded-[10px] border border-input-border bg-input-bg px-3 text-center text-[20px] tracking-[0.4em] font-semibold text-text-dark focus:outline-none focus:border-ekush-orange transition-colors"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-[50px] text-[15px]"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </Button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || loading}
            className="text-[13px] text-ekush-orange hover:underline disabled:text-text-body disabled:no-underline disabled:cursor-not-allowed"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setCode("");
            setError("");
            setInfo("");
            setStep("form");
          }}
          className="block mx-auto mt-4 text-[12px] text-text-body hover:text-text-dark"
        >
          ← Edit details
        </button>
      </>
    );
  }
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-50 text-red-600 text-[13px] p-3.5 rounded-[5px] mb-5 border border-red-200">
      {children}
    </div>
  );
}

function maskPhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  return digits.length >= 4 ? `••• ${digits.slice(-4)}` : digits;
}
