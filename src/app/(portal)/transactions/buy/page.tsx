"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepIndicator } from "@/components/ui/step-indicator";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface Fund { code: string; name: string; currentNav: number; }

const STEPS = ["Information", "Payment", "Confirm", "Success"];

export default function BuyPage() {
  const router = useRouter();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [step, setStep] = useState(0);
  const [selectedFund, setSelectedFund] = useState("");
  const [amount, setAmount] = useState("");
  const [dividendOption, setDividendOption] = useState("CIP");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/funds").then(r => r.json()).then(setFunds).catch(() => {});
  }, []);

  const fund = funds.find(f => f.code === selectedFund);
  const nav = fund?.currentNav || 0;
  const amountNum = parseFloat(amount) || 0;
  // Round units to 4 decimals (matches what will be persisted) so unit price * units == amount
  const estimatedUnits = nav > 0 ? Math.floor((amountNum / nav) * 10000) / 10000 : 0;
  const actualAmount = estimatedUnits * nav;

  const formatBD = (n: number, decimals = 2) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const handleSubmit = async () => {
    if (!selectedFund || amountNum <= 0) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/transactions/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fundCode: selectedFund, amount: actualAmount, channel: "LS" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Order failed");
        setStep(0);
      } else {
        setResult(data);
        setStep(3);
      }
    } catch {
      setError("Network error. Please try again.");
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-[22px] font-semibold text-text-dark font-rajdhani text-center">Buy Fund</h1>

      <StepIndicator currentStep={step} steps={STEPS} />

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-[10px] text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Step 0: Information */}
      {step === 0 && (
        <Card>
          <CardContent className="p-8">
            <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-6">Investment&apos;s Information</h2>

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
                  {funds.map(f => (
                    <option key={f.code} value={f.code}>{f.code} - {f.name}</option>
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
                  value={estimatedUnits > 0 ? formatBD(estimatedUnits, 4) : ""}
                  readOnly
                  className="w-full h-[50px] rounded-[5px] border border-input-border bg-gray-50 px-5 text-[14px] text-text-body"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[14px] font-medium text-text-label">Dividend</label>
                <select
                  value={dividendOption}
                  onChange={(e) => setDividendOption(e.target.value)}
                  className="w-full h-[50px] rounded-[5px] border border-input-border bg-input-bg px-5 text-[14px] text-text-dark focus:outline-none focus:border-ekush-orange"
                >
                  <option value="CIP">CIP</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Button
                onClick={() => setStep(1)}
                disabled={!selectedFund || amountNum <= 0}
                className="px-10"
              >
                Next Step
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Payment */}
      {step === 1 && (
        <Card>
          <CardContent className="p-8">
            <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-6">Payment Method</h2>
            <div className="space-y-4">
              <div className="p-4 border border-ekush-orange bg-ekush-orange/5 rounded-[10px] flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-ekush-orange flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-ekush-orange" />
                </div>
                <span className="text-[14px] text-text-dark font-medium">Bank Transfer</span>
              </div>
              <div className="p-4 border border-input-border rounded-[10px] flex items-center gap-3 opacity-50">
                <div className="w-4 h-4 rounded-full border-2 border-input-border" />
                <span className="text-[14px] text-text-body">Cheque</span>
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)}>Next Step</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <Card>
          <CardContent className="p-8">
            <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-6">Confirm Your Order</h2>
            <div className="bg-page-bg rounded-[10px] p-6 space-y-3">
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">Fund</span>
                <span className="text-text-dark font-medium">{fund?.name} ({fund?.code})</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">Amount</span>
                <span className="text-text-dark font-medium">৳{formatBD(actualAmount)}</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">NAV</span>
                <span className="text-text-dark font-medium">{formatBD(nav, 4)}</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">Estimated Units</span>
                <span className="text-text-dark font-medium">{formatBD(estimatedUnits, 4)}</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">Dividend Option</span>
                <span className="text-text-dark font-medium">{dividendOption}</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">Payment</span>
                <span className="text-text-dark font-medium">Bank Transfer</span>
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirm Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Success */}
      {step === 3 && result && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-[20px] font-semibold text-text-dark font-rajdhani mb-2">Order Submitted!</h2>
            <p className="text-[14px] text-text-body mb-4">{result.message}</p>
            <div className="inline-block bg-page-bg rounded-[10px] p-6 space-y-2 text-left mb-6">
              <p className="text-[14px] text-text-body">Fund: <strong className="text-text-dark">{result.fund}</strong></p>
              <p className="text-[14px] text-text-body">Amount: <strong className="text-text-dark">৳{formatBD(Number(result.amount) || 0)}</strong></p>
              <p className="text-[14px] text-text-body">Est. Units: <strong className="text-text-dark">{formatBD(Number(result.estimatedUnits) || 0, 4)}</strong></p>
              <Badge variant="pending" className="mt-2">Pending Approval</Badge>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setResult(null); setStep(0); setAmount(""); }}>
                Place Another Order
              </Button>
              <Button onClick={() => router.push("/transactions")}>
                View Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
