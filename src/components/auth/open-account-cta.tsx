"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// "Open investment account" CTA card with the KYC document checklist
// modal gate. The card itself is a button; clicking it opens the
// modal showing the documents the user should keep ready. Clicking
// Accept inside the modal pushes to /register (the existing 4-step
// KYC flow). Re-used on both /login and the CRM homepage so the
// gate text + behaviour stay in lockstep.

const SIGNUP_CHECKLIST = [
  "Applicant's and Nominee's National ID Card",
  "Colour Photos and Signatures of the Applicant(s) and Nominee(s)",
  "Blank Cheque / Bank Statement of the Applicant",
  "Applicant's E-TIN Certificate (if any)",
  "Soft copy of the BO Acknowledgement / BO ID number",
];

// "compact" matches the /login form-card scale; "full" matches the
// homepage row above the fund cards. Keeping both call sites on the
// same component prevents the wording from drifting.
type Variant = "compact" | "full";

export function OpenAccountCta({ variant = "compact" }: { variant?: Variant }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const compact = variant === "compact";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "group bg-ekush-orange text-white rounded-card shadow-card p-4 hover:-translate-y-0.5 transition-all duration-300 hover:bg-ekush-orange-dark text-left"
            : "group bg-ekush-orange text-white rounded-card shadow-card p-6 hover:-translate-y-1 transition-all duration-300 hover:bg-ekush-orange-dark text-left"
        }
      >
        <div className={`flex items-start justify-between gap-2 ${compact ? "mb-2" : "mb-3"}`}>
          <div
            className={`${compact ? "w-9 h-9 rounded-[8px]" : "w-11 h-11 rounded-[8px]"} bg-white/15 flex items-center justify-center`}
          >
            <ArrowRight className={compact ? "w-4 h-4" : "w-5 h-5"} />
          </div>
          <ArrowRight
            className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-white/80 group-hover:text-white transition-colors`}
          />
        </div>
        <h3
          className={
            compact
              ? "text-[14px] font-bold font-rajdhani leading-snug"
              : "text-[16px] font-bold font-rajdhani mb-1"
          }
        >
          Open investment account
        </h3>
        <p
          className={
            compact
              ? "text-[12px] text-white/85 leading-snug mt-1"
              : "text-[13px] text-white/85 leading-relaxed"
          }
        >
          {compact
            ? "Complete the 4-step KYC."
            : "Complete the 4-step KYC and start investing once approved by our team."}
        </p>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-card shadow-card max-w-[520px] w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
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
                Note: Mutual fund units will not be credited to your BO account
                unless BO Account Number is provided. For any query, please
                contact +8801713086101 and +88001906440541.
              </p>

              <div className="mt-5 flex justify-center">
                <Button
                  onClick={() => {
                    setOpen(false);
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
    </>
  );
}
