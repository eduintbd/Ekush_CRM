"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepIndicator } from "@/components/ui/step-indicator";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  Check,
  Upload,
  FileDown,
  Info,
  CreditCard,
  Receipt,
  Trophy,
} from "lucide-react";
import {
  PaymentMethodDialog,
  type PaymentMethod,
} from "@/components/buy-fund/PaymentMethodDialog";
import { DdiSetupStep } from "@/components/buy-fund/DdiSetupStep";
import { DdiPreviewStep } from "@/components/buy-fund/DdiPreviewStep";

interface Fund {
  code: string;
  name: string;
  currentNav: number;
}

const MANUAL_STEPS = ["Information", "Payment", "Confirm", "Success"];
const DDI_STEPS = ["Information", "DDI Setup", "DDI Review", "Confirm", "Success"];

const MANUAL_ICONS = [Info, CreditCard, CheckCircle, Trophy];
const DDI_ICONS = [Info, CreditCard, Receipt, CheckCircle, Trophy];

export default function BuyPage() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showMethodDialog, setShowMethodDialog] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedFund, setSelectedFund] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const copyToClipboard = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  type BankDetail = {
    accountName: string;
    accountNo: string;
    bankName: string;
    branchName: string;
    routingNo: string;
  };

  const FUND_BANK_ACCOUNTS: Record<string, BankDetail[]> = {
    EFUF: [
      {
        accountName: "Ekush First Unit Fund",
        accountNo: "1513205101231001",
        bankName: "BRAC Bank Limited",
        branchName: "R K Mission Road",
        routingNo: "060272531",
      },
      {
        accountName: "Ekush First Unit Fund",
        accountNo: "0001-1090000732",
        bankName: "Midland Bank Limited",
        branchName: "Dilkusha",
        routingNo: "285271933",
      },
    ],
    EGF: [
      {
        accountName: "Ekush Growth Fund",
        accountNo: "1513205101212001",
        bankName: "BRAC Bank Limited",
        branchName: "R K Mission Road",
        routingNo: "060272531",
      },
      {
        accountName: "Ekush Growth Fund",
        accountNo: "0001-1060000119",
        bankName: "Midland Bank Limited",
        branchName: "Dilkusha",
        routingNo: "285271933",
      },
    ],
    ESRF: [
      {
        accountName: "Ekush Stable Return Fund",
        accountNo: "2055604070001",
        bankName: "BRAC Bank Limited",
        branchName: "R K Mission Road",
        routingNo: "060272531",
      },
      {
        accountName: "Ekush Stable Return Fund",
        accountNo: "0001-1090001017",
        bankName: "Midland Bank Limited",
        branchName: "Dilkusha",
        routingNo: "285271933",
      },
    ],
  };

  const bankAccounts = FUND_BANK_ACCOUNTS[selectedFund] || FUND_BANK_ACCOUNTS.ESRF;
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/funds").then((r) => r.json()).then(setFunds).catch(() => {});
  }, []);

  const fund = funds.find((f) => f.code === selectedFund);
  const nav = fund?.currentNav || 0;
  const amountNum = parseFloat(amount) || 0;
  const estimatedUnits = nav > 0 ? Math.floor((amountNum / nav) * 10000) / 10000 : 0;
  const actualAmount = estimatedUnits * nav;

  const formatBD = (n: number, decimals = 2) =>
    n.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const isDdi = paymentMethod === "DDI";
  const steps = isDdi ? DDI_STEPS : MANUAL_STEPS;
  const icons = isDdi ? DDI_ICONS : MANUAL_ICONS;

  // Index of the Confirm step (penultimate) and Success step (last) for each path.
  const confirmIndex = steps.length - 2;
  const successIndex = steps.length - 1;

  const handleSubmitManual = async () => {
    if (!selectedFund || amountNum <= 0) return;
    setLoading(true);
    setError("");

    try {
      const form = new FormData();
      form.set("fundCode", selectedFund);
      form.set("amount", String(actualAmount));
      form.set("channel", "LS");
      if (paymentSlip) form.set("paymentSlip", paymentSlip);

      const res = await fetch("/api/transactions/buy", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Order failed");
        setStep(0);
      } else {
        setResult(data);
        setStep(successIndex);
      }
    } catch {
      setError("Network error. Please try again.");
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleNextFromInformation = () => {
    if (!selectedFund || amountNum <= 0) return;
    setShowMethodDialog(true);
  };

  const handleMethodChosen = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setShowMethodDialog(false);
    setStep(1);
  };

  const resetFlow = () => {
    setResult(null);
    setPaymentMethod(null);
    setStep(0);
    setAmount("");
    setPaymentSlip(null);
    setError("");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-[22px] font-semibold text-text-dark font-rajdhani text-center">
        Buy Fund
      </h1>

      <StepIndicator currentStep={step} steps={steps} icons={icons} />

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-[10px] text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Step 0: Information (shared) */}
      {step === 0 && (
        <Card>
          <CardContent className="p-8">
            <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-6">
              Investment&apos;s Information
            </h2>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[14px] font-medium text-text-label">Fund</label>
                <select
                  value={selectedFund}
                  onChange={(e) => setSelectedFund(e.target.value)}
                  className="w-full h-[50px] rounded-[5px] border border-input-border bg-input-bg px-5 text-[14px] text-text-dark focus:outline-none focus:border-ekush-orange"
                  required
                >
                  <option value="">Please select a fund</option>
                  {funds.map((f) => (
                    <option key={f.code} value={f.code}>
                      {f.code} - {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[14px] font-medium text-ekush-orange">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter investment amount"
                  min="1"
                  className="w-full h-[50px] rounded-[5px] border border-input-border bg-input-bg px-5 text-[14px] text-text-dark focus:outline-none focus:border-ekush-orange"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[14px] font-medium text-text-label">Unit price *</label>
                <input
                  type="text"
                  value={nav > 0 ? formatBD(nav, 4) : ""}
                  readOnly
                  className="w-full h-[50px] rounded-[5px] border border-input-border bg-gray-50 px-5 text-[14px] text-text-body"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[14px] font-medium text-text-label">No of units *</label>
                <input
                  type="text"
                  value={
                    estimatedUnits > 0
                      ? Math.round(estimatedUnits).toLocaleString("en-IN")
                      : ""
                  }
                  readOnly
                  className="w-full h-[50px] rounded-[5px] border border-input-border bg-gray-50 px-5 text-[14px] text-text-body"
                />
              </div>
            </div>

            <div className="mt-8 text-center">
              <Button
                onClick={handleNextFromInformation}
                disabled={!selectedFund || amountNum <= 0}
                className="px-10"
              >
                Next Step
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1 (MANUAL): Payment slip upload */}
      {step === 1 && !isDdi && (
        <Card>
          <CardContent className="p-8">
            <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-2">
              Payment
            </h2>
            <p className="text-[14px] text-text-body mb-6">
              Deposit your investment amount to the following bank account of{" "}
              {fund?.name || "the fund"}.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {bankAccounts.map((bank, idx) => (
                <div
                  key={idx}
                  className="border border-input-border rounded-[10px] p-5 space-y-3"
                >
                  <p className="text-[12px] font-semibold text-ekush-orange uppercase tracking-wide mb-1">
                    {bank.bankName}
                  </p>
                  {[
                    { label: "Account Name", value: bank.accountName, key: `name-${idx}` },
                    { label: "Account No", value: bank.accountNo, key: `acc-${idx}` },
                    { label: "Bank Name", value: bank.bankName, key: `bank-${idx}` },
                    { label: "Branch", value: bank.branchName, key: `branch-${idx}` },
                    { label: "Routing No", value: bank.routingNo, key: `routing-${idx}` },
                  ].map((row) => (
                    <div key={row.key} className="flex items-center gap-2 text-[13px]">
                      <span className="text-text-body whitespace-nowrap">
                        {row.label}:
                      </span>
                      <span className="text-text-dark font-semibold">{row.value}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(row.value, row.key)}
                        className="ml-1 p-1 rounded hover:bg-page-bg transition-colors shrink-0"
                        aria-label={`Copy ${row.label}`}
                      >
                        {copiedField === row.key ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-text-body" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-medium text-text-label block">
                Please upload your payment confirmation/ acknowledgement receipt / cheque
                deposit slip to activate your investment
              </label>
              <label className="flex items-center gap-3 h-[50px] rounded-[5px] border border-input-border bg-input-bg px-5 cursor-pointer hover:border-ekush-orange transition-colors">
                <Upload className="w-4 h-4 text-ekush-orange" />
                <span className="text-[14px] text-text-body">
                  {paymentSlip ? paymentSlip.name : "Choose file..."}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setPaymentSlip(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="mt-8 flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setPaymentMethod(null);
                  setStep(0);
                }}
              >
                Back
              </Button>
              <Button onClick={() => setStep(2)} disabled={!paymentSlip}>
                Next Step
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1 (DDI): Setup */}
      {step === 1 && isDdi && fund && (
        <DdiSetupStep
          fundCode={fund.code}
          fundName={fund.name}
          amount={actualAmount}
          onBack={() => {
            setPaymentMethod(null);
            setStep(0);
          }}
          onContinue={() => setStep(2)}
        />
      )}

      {/* Step 2 (DDI): Preview + confirm */}
      {step === 2 && isDdi && fund && (
        <DdiPreviewStep
          fundCode={fund.code}
          fundName={fund.name}
          amount={actualAmount}
          onBack={() => setStep(1)}
          onConfirmed={() => {
            setResult({
              fund: fund.code,
              amount: actualAmount,
              estimatedUnits,
              message: "DDI authorization submitted. Pending admin review.",
            });
            setStep(successIndex);
          }}
          onError={(m) => {
            setError(m);
            setStep(0);
          }}
        />
      )}

      {/* Confirm step (shared: Manual index 2, DDI index 3) */}
      {step === confirmIndex && step !== successIndex && (
        <Card>
          <CardContent className="p-8">
            <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-2">
              Confirmation
            </h2>
            <p className="text-[14px] text-text-body mb-4">
              Please confirm to complete the transaction
            </p>

            {!isDdi && (
              <div className="mb-6 text-center">
                <a
                  href={`/forms/purchase?fundName=${encodeURIComponent(fund?.name || "")}&amount=${actualAmount}&units=${Math.round(estimatedUnits)}&nav=${nav.toFixed(4)}&payment=Bank+Transfer`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-[#2DAAB8] text-[#2DAAB8] rounded-[5px] text-[14px] font-medium hover:bg-[#2DAAB8] hover:text-white transition-colors"
                >
                  Purchase Form Preview <FileDown className="w-4 h-4" />
                </a>
              </div>
            )}

            <div className="bg-page-bg rounded-[10px] p-6 space-y-3">
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">Fund</span>
                <span className="text-text-dark font-medium">
                  {fund?.name} ({fund?.code})
                </span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">Amount</span>
                <span className="text-text-dark font-medium">{formatBD(actualAmount)}</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">NAV</span>
                <span className="text-text-dark font-medium">{formatBD(nav, 4)}</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">Estimated Units</span>
                <span className="text-text-dark font-medium">
                  {Math.round(estimatedUnits).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">Payment</span>
                <span className="text-text-dark font-medium">
                  {isDdi ? "Direct Debit Instruction" : "Bank Transfer"}
                </span>
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
              {/* For DDI, submission already happened in the preview step —
                  the Confirm step only shows for Manual. Keep consistent for future
                  extension if we add a DDI-specific confirm. */}
              {!isDdi && (
                <Button onClick={handleSubmitManual} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Confirm Order
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success step (shared) */}
      {step === successIndex && result && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-[20px] font-semibold text-text-dark font-rajdhani mb-2">
              {isDdi ? "DDI Submitted!" : "Order Submitted!"}
            </h2>
            <p className="text-[14px] text-text-body mb-4">{result.message}</p>
            <div className="inline-block bg-page-bg rounded-[10px] p-6 space-y-2 text-left mb-6">
              <p className="text-[14px] text-text-body">
                Fund: <strong className="text-text-dark">{result.fund}</strong>
              </p>
              <p className="text-[14px] text-text-body">
                Amount:{" "}
                <strong className="text-text-dark">
                  {formatBD(Number(result.amount) || 0)}
                </strong>
              </p>
              <p className="text-[14px] text-text-body">
                Est. Units:{" "}
                <strong className="text-text-dark">
                  {Math.round(Number(result.estimatedUnits) || 0).toLocaleString("en-IN")}
                </strong>
              </p>
              <Badge variant="pending" className="mt-2">
                {isDdi ? "Pending Review" : "Pending Approval"}
              </Badge>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={resetFlow}>
                Place Another Order
              </Button>
              {!isDdi && (
                <a
                  href={`/forms/money-receipt?fund=${encodeURIComponent(fund?.name || result.fund)}&amount=${Number(result.amount) || 0}&units=${Math.round(Number(result.estimatedUnits) || 0)}&nav=${nav.toFixed(4)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button>
                    <FileDown className="w-4 h-4 mr-2" />
                    Download Receipt
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment method selection dialog */}
      <PaymentMethodDialog
        open={showMethodDialog}
        amount={actualAmount || amountNum}
        onCancel={() => setShowMethodDialog(false)}
        onContinue={handleMethodChosen}
      />
    </div>
  );
}
