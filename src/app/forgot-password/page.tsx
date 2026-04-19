"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDone(true);
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
          {done ? (
            <div className="text-center">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold font-rajdhani text-text-dark">Check your inbox</h2>
              <p className="text-[13px] text-text-body mt-2 leading-relaxed">
                If an account exists for <strong>{email}</strong>, you'll receive a reset link within a few minutes.
                The link expires in 24 hours.
              </p>
              <Link href="/login" className="text-[13px] text-ekush-orange hover:underline font-medium mt-4 inline-block">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-text-dark font-rajdhani mb-1">Forgot your password?</h2>
              <p className="text-[13px] text-text-body mb-5">
                Enter the email tied to your account and we'll email you a reset link.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@ekushwml.com"
                  required
                />
                <Button type="submit" disabled={submitting || !email} className="w-full h-[48px]">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Send reset link
                </Button>
              </form>
              <p className="text-center mt-4">
                <Link href="/login" className="text-[13px] text-ekush-orange hover:underline font-medium">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
