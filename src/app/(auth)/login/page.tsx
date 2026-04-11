"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        const adminRoles = ["ADMIN", "MANAGER", "COMPLIANCE", "SUPPORT", "SUPER_ADMIN"];
        const dest = adminRoles.includes(data.role) ? "/admin/dashboard" : "/dashboard";
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
          <div className="w-14 h-14 bg-ekush-orange rounded-[10px] flex items-center justify-center font-bold text-white text-2xl shadow-card mb-3">
            E
          </div>
          <h1 className="text-lg font-bold text-text-dark font-rajdhani">Ekush WML</h1>
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
              label="Email / Investor Code"
              placeholder="e.g., A00002 or your email"
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

            <Button
              type="submit"
              className="w-full h-[50px] text-[15px]"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <div className="mt-5 text-center space-y-3">
            <p className="text-[13px] text-text-body">
              Do you want to register?{" "}
              <a href="/onboarding" className="text-ekush-orange hover:underline font-semibold">
                Lets sign-up
              </a>
            </p>
            <a href="#" className="text-[13px] text-ekush-orange hover:underline font-medium block">
              Forgot Password?
            </a>
          </div>
        </div>

        <p className="text-center text-[11px] text-text-body mt-6">
          Licensed by BSEC | &copy; 2021-{new Date().getFullYear()} Ekush Wealth Management Ltd
        </p>
      </div>
    </div>
  );
}
