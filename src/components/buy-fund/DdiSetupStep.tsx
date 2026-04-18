"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { SignatureUpload } from "./SignatureUpload";

// Fund collection bank map — duplicated from buy/page.tsx deliberately to
// keep this component self-contained. See /api/forms/buy-ddi for the canonical
// list used by the PDF generator.
const FUND_COLLECTION_BANK: Record<
  string,
  { accountName: string; accountNo: string; bankName: string; branchName: string; routingNo: string }
> = {
  EFUF: {
    accountName: "Ekush First Unit Fund",
    accountNo: "1513205101231001",
    bankName: "BRAC Bank Limited",
    branchName: "R K Mission Road",
    routingNo: "060272531",
  },
  EGF: {
    accountName: "Ekush Growth Fund",
    accountNo: "1513205101212001",
    bankName: "BRAC Bank Limited",
    branchName: "R K Mission Road",
    routingNo: "060272531",
  },
  ESRF: {
    accountName: "Ekush Stable Return Fund",
    accountNo: "2055604070001",
    bankName: "BRAC Bank Limited",
    branchName: "R K Mission Road",
    routingNo: "060272531",
  },
};

interface InvestorBank {
  accountNumber: string | null;
  bankName: string | null;
  branchName: string | null;
  routingNumber: string | null;
}

interface DdiSetupStepProps {
  fundCode: string;
  fundName: string;
  amount: number;
  onBack: () => void;
  onContinue: () => void;
}

export function DdiSetupStep({
  fundCode,
  fundName,
  amount,
  onBack,
  onContinue,
}: DdiSetupStepProps) {
  const [investorBank, setInvestorBank] = useState<InvestorBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile/banks")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((accounts: any[]) => {
        const primary = accounts.find((a) => a.isPrimary) ?? accounts[0] ?? null;
        if (primary) {
          setInvestorBank({
            accountNumber: primary.accountNumber,
            bankName: primary.bankName,
            branchName: primary.branchName,
            routingNumber: primary.routingNumber,
          });
        }
      })
      .catch(() => setError("Could not load your bank details."))
      .finally(() => setLoading(false));
  }, []);

  const fundBank = FUND_COLLECTION_BANK[fundCode];
  const formatAmount = new Intl.NumberFormat("en-IN").format(amount);

  return (
    <Card>
      <CardContent className="p-8 space-y-6">
        <div>
          <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani">
            Direct Debit Instruction — Setup
          </h2>
          <p className="text-[13px] text-text-body mt-1">
            Confirm the details below. Ekush will debit{" "}
            <strong className="text-text-dark">BDT {formatAmount}</strong> once from
            your registered account for this one-time purchase of {fundName}.
          </p>
        </div>

        {/* Investor bank details (read-only, from registration) */}
        <section>
          <h3 className="text-[13px] font-semibold text-text-dark mb-2">
            Your Bank Account (on file)
          </h3>
          {loading ? (
            <div className="h-[80px] flex items-center justify-center text-text-muted text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading your bank details…
            </div>
          ) : !investorBank ? (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 p-3 rounded-[8px] text-[13px]">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                We couldn&apos;t find a bank account on your profile. Please add one
                via Profile Management before continuing with DDI.
              </span>
            </div>
          ) : (
            <ReadOnlyBankCard
              rows={[
                ["Bank Name", investorBank.bankName ?? "—"],
                ["Branch", investorBank.branchName ?? "—"],
                ["Account Number", investorBank.accountNumber ?? "—"],
                ["Routing Number", investorBank.routingNumber ?? "—"],
              ]}
              note="These details were provided during registration. To update, visit Profile Management."
            />
          )}
        </section>

        {/* Fund collection bank (read-only) */}
        {fundBank && (
          <section>
            <h3 className="text-[13px] font-semibold text-text-dark mb-2">
              Fund&apos;s Collection Account
            </h3>
            <ReadOnlyBankCard
              rows={[
                ["Account Name", fundBank.accountName],
                ["Bank", fundBank.bankName],
                ["Branch", fundBank.branchName],
                ["Account Number", fundBank.accountNo],
                ["Routing Number", fundBank.routingNo],
              ]}
            />
          </section>
        )}

        {/* Signature upload (optional) */}
        <section>
          <SignatureUpload />
        </section>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-[8px] text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onContinue} disabled={!investorBank || loading}>
            Preview DDI Form
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReadOnlyBankCard({
  rows,
  note,
}: {
  rows: [string, string][];
  note?: string;
}) {
  return (
    <div className="border border-input-border rounded-[10px] p-4 bg-page-bg/50">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-[11px] text-text-muted uppercase tracking-wider">
              {label}
            </dt>
            <dd className="text-[13px] text-text-dark font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {note && <p className="text-[11px] text-text-muted mt-3 italic">{note}</p>}
    </div>
  );
}
