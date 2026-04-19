"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { STAFF_ROLES } from "@/lib/roles";

const SIGNUP_CHECKLIST = [
  "Applicant's and Nominee's National ID Card",
  "Colour Photos and Signatures of the Applicant(s) and Nominee(s)",
  "Blank Cheque / Bank Statement of the Applicant",
  "Applicant's E-TIN Certificate (if any)",
  "Soft copy of the BO Acknowledgement / BO ID number",
];

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupGateOpen, setSignupGateOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
      } else {
                const dest = STAFF_ROLES.includes(data.role) ? "/admin/dashboard" : "/dashboard";
        router.push(dest);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg font-poppins">
      <div className="w-full max-w-[420px] px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Ekush Wealth Management Limited"
            className="h-16 w-auto mb-3"
          />
          <p className="text-xs text-text-body tracking-wider uppercase">Investor Portal</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-card shadow-card p-8">
          <h2 className="text-xl font-bold text-text-dark font-rajdhani mb-6">Log in</h2>

          {error && (
            <div className="bg-red-50 text-red-600 text-[13px] p-3.5 rounded-[5px] mb-5 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Investor Code"
              placeholder="e.g., A00002"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1 h-[50px] text-[15px]"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Log In"}
              </Button>
              <Button
                type="button"
                onClick={() => setSignupGateOpen(true)}
                className="flex-1 h-[50px] text-[15px] bg-white border-2 border-ekush-orange text-ekush-orange hover:bg-ekush-orange hover:text-white"
              >
                Sign Up
              </Button>
            </div>
          </form>

          <div className="mt-5 text-center">
            <a href="#" className="text-[13px] text-ekush-orange hover:underline font-medium">
              Forgot Password?
            </a>
          </div>
        </div>

        <p className="text-center text-[11px] text-text-body mt-6 leading-relaxed">
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
                  <li key={item} className="flex items-start gap-2.5 py-2.5 text-[13px] text-text-dark">
                    <Check className="w-4 h-4 text-ekush-orange mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-[11.5px] text-text-body mt-3 italic">
                Note: Mutual fund units will not be credited to your BO account unless BO Account Number is provided.
                For any query, please contact +8801713086101 and +88001906440541.
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
