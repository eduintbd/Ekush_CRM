"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown } from "lucide-react";

interface DdiPreviewStepProps {
  fundCode: string;
  fundName: string;
  amount: number;
  onBack: () => void;
  onConfirmed: () => void;
  onError: (message: string) => void;
}

export function DdiPreviewStep({
  fundCode,
  fundName,
  amount,
  onBack,
  onConfirmed,
  onError,
}: DdiPreviewStepProps) {
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pdfUrl = `/api/forms/buy-ddi?fundCode=${encodeURIComponent(fundCode)}&amount=${amount}`;
  const formatAmount = new Intl.NumberFormat("en-IN").format(amount);

  const handleSubmit = async () => {
    if (!accepted) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions/buy-ddi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fundCode, amount, termsAccepted: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || "DDI submission failed");
        return;
      }
      onConfirmed();
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-8 space-y-5">
        <div>
          <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani">
            Review your Direct Debit Instruction
          </h2>
          <p className="text-[13px] text-text-body mt-1">
            Your DDI form for {fundName} is generated below. Please review, accept the
            terms, and submit to authorize the one-time debit of{" "}
            <strong className="text-text-dark">BDT {formatAmount}</strong>.
          </p>
        </div>

        {/* Embedded PDF preview */}
        <div className="border border-input-border rounded-[10px] overflow-hidden bg-page-bg">
          <object
            data={pdfUrl}
            type="application/pdf"
            className="w-full h-[520px]"
            aria-label="DDI form preview"
          >
            <div className="p-6 text-center">
              <p className="text-[13px] text-text-body mb-3">
                Your browser can&apos;t display the embedded preview.
              </p>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium border-2 border-[#2DAAB8] text-[#2DAAB8] rounded-[5px] hover:bg-[#2DAAB8] hover:text-white transition-colors"
              >
                Open DDI Form <FileDown className="w-4 h-4" />
              </a>
            </div>
          </object>
        </div>

        {/* Download link */}
        <div className="flex justify-end">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-[#2DAAB8] hover:underline"
          >
            <FileDown className="w-3.5 h-3.5" /> Download a copy before submitting
          </a>
        </div>

        {/* Terms & Conditions */}
        <details open className="border border-input-border rounded-[10px] p-4 bg-page-bg/40">
          <summary className="text-[13px] font-semibold text-text-dark cursor-pointer">
            Terms & Conditions
          </summary>
          <div className="mt-3 space-y-2 text-[12px] text-text-body leading-relaxed">
            <p>
              I authorize Ekush Wealth Management Limited to debit my registered
              bank account through online fund transfer processes by the amount
              stated above for this one-time purchase of {fundName}.
            </p>
            <p>
              The auto-debit instruction will be initiated by the designated bank
              at the instruction of {fundName} managed by Ekush Wealth Management
              Limited.
            </p>
            <p>
              I have read and understood the terms and conditions of payment
              through the auto-debit payment process, which may be altered,
              modified, and replaced from time to time by Ekush Wealth Management
              Limited as per regulatory requirements.
            </p>
          </div>
        </details>

        {/* Agree checkbox */}
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-ekush-orange"
          />
          <span className="text-[13px] text-text-dark">
            I have read and agree to the terms and conditions of the Direct Debit
            Instruction, and authorize Ekush to debit my account for this
            purchase.
          </span>
        </label>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack} disabled={submitting}>
            Back
          </Button>
          <Button onClick={handleSubmit} disabled={!accepted || submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirm & Submit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
