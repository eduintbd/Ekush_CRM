"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

// Email + password (+ 2FA when enrolled). Mirrors /login's visual
// shell so the brand stays consistent, but with a single form: no
// tab switcher, no signup CTAs, no investor-code field. There's a
// "Use investor login →" link at the bottom for the rare case where
// someone arrived here by mistake.

export function StaffLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [requires2fa, setRequires2fa] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: email,
          password,
          totpCode: requires2fa ? totpCode : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requires2fa) {
          setRequires2fa(true);
          setError(data.error ?? "Enter your authenticator code.");
          return;
        }
        setError(data.error ?? "Login failed.");
        return;
      }
      if (data.twoFactorWarning) {
        setInfo(
          `2FA enrollment is required. ${data.twoFactorWarning.daysRemaining} day(s) left.`,
        );
      }
      router.push(data.redirect ?? "/admin/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg font-poppins py-10">
      <div className="w-full max-w-[440px] px-6">
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-color.png"
            alt="Ekush Wealth Management Limited"
            className="h-16 w-auto mb-3"
          />
          <p className="text-xs text-text-body tracking-wider uppercase">
            Staff Portal
          </p>
        </div>

        <div className="bg-white rounded-card shadow-card p-8">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="w-4 h-4 text-ekush-orange" />
            <h2 className="text-xl font-bold text-text-dark font-rajdhani">
              Sign in
            </h2>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-[13px] p-3.5 rounded-[5px] mb-5 border border-red-200">
              {error}
            </div>
          )}
          {info && !error && (
            <div className="bg-amber-50 text-amber-800 text-[13px] p-3.5 rounded-[5px] mb-5 border border-amber-200">
              {info}
            </div>
          )}

          <form
            onSubmit={onSubmit}
            className="space-y-5"
            onDrop={(e) => e.preventDefault()}
            noValidate
          >
            <Input
              label="Office Email"
              type="email"
              placeholder="you@ekushwml.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              spellCheck={false}
              required
              disabled={requires2fa}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={requires2fa}
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

            <Button
              type="submit"
              className="w-full h-[50px] text-[15px]"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : requires2fa
                  ? "Verify & Sign In"
                  : "Sign In"}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <a
              href="/forgot-password"
              className="text-[13px] text-ekush-orange hover:underline font-medium"
            >
              Forgot Password?
            </a>
          </div>
        </div>

        <div className="mt-6 text-center text-[12px] text-text-body">
          Investor or prospect?{" "}
          <Link
            href="/login"
            className="text-ekush-orange hover:underline font-semibold"
          >
            Use the investor login &rarr;
          </Link>
        </div>

        <p className="max-w-[420px] mx-auto text-center text-[11px] text-text-body mt-6 leading-relaxed">
          Ekush Wealth Management Limited (Ekush) is a registered Asset Management
          Company (license no. BSEC/AMC/2019/44, dated November 20, 2019) under the
          Bangladesh Securities and Exchange Commission (BSEC) of the Government of
          the People&rsquo;s Republic of Bangladesh.
        </p>
      </div>
    </div>
  );
}
