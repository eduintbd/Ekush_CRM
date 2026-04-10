"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepIndicator } from "@/components/ui/step-indicator";
import { Loader2, AlertCircle, CheckCircle, Info, Trophy } from "lucide-react";

interface Holding {
  fund: { code: string; name: string; currentNav: number };
  totalSellableUnits: number;
  totalCurrentUnits: number;
  avgCost: number;
  totalMarketValue: number;
}

const STEPS = ["Information", "Confirm", "Success"];
const STEP_ICONS = [Info, CheckCircle, Trophy];

export default function SellPage() {
  const router = useRouter();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [step, setStep] = useState(0);
  const [selectedFund, setSelectedFund] = useState("");
  const [units, setUnits] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/portfolio").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setHoldings(data);
    }).catch(() => {});
  }, []);

  const holding = holdings.find(h => h.fund.code === selectedFund);
  const sellable = Number(holding?.totalSellableUnits || 0);
  const nav = Number(holding?.fund.currentNav || 0);
  const avgCost = Number(holding?.avgCost || 0);
  const unitsNum = parseFloat(units) || 0;
  const estimatedAmount = unitsNum * nav;
  const estimatedGain = unitsNum * (nav - avgCost);

  const handleSubmit = async () => {
    if (!selectedFund || unitsNum <= 0) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/transactions/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fundCode: selectedFund, units: unitsNum }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Order failed");
        setStep(0);
      } else {
        setResult(data);
        setStep(2);
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
      <h1 className="text-[22px] font-semibold text-text-dark font-rajdhani text-center">Sell Units</h1>

      <StepIndicator currentStep={step} steps={STEPS} icons={STEP_ICONS} />

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-[10px] text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Step 0: Information */}
      {step === 0 && (
        <Card>
          <CardContent className="p-8">
            <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-6">Redemption Information</h2>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[14px] font-medium text-text-label">Fund</label>
                <select
                  value={selectedFund}
                  onChange={(e) => { setSelectedFund(e.target.value); setUnits(""); }}
                  className="w-full h-[50px] rounded-[5px] border border-input-border bg-input-bg px-5 text-[14px] text-text-dark focus:outline-none focus:border-ekush-orange"
                  required
                >
                  <option value="">Please select a fund</option>
                  {holdings.map(h => (
                    <option key={h.fund.code} value={h.fund.code}>
                      {h.fund.code} - {h.fund.name}
                    </option>
                  ))}
                </select>
              </div>

              {holding && (
                <div className="bg-page-bg rounded-[10px] p-5 grid grid-cols-2 gap-3 text-[14px]">
                  <span className="text-text-body">Sellable Units</span>
                  <span className="text-right font-medium text-green-600">{sellable.toFixed(4)}</span>
                  <span className="text-text-body">Current NAV</span>
                  <span className="text-right font-medium text-text-dark">{nav.toFixed(4)}</span>
                  <span className="text-text-body">Avg Cost</span>
                  <span className="text-right font-medium text-text-dark">{avgCost.toFixed(4)}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[14px] font-medium text-text-label">Units to Redeem</label>
                <input
                  type="number"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  placeholder="Enter number of units"
                  min="0.0001"
                  step="0.0001"
                  max={sellable}
                  className="w-full h-[50px] rounded-[5px] border border-input-border bg-input-bg px-5 text-[14px] text-text-dark focus:outline-none focus:border-ekush-orange"
                  required
                />
                {sellable > 0 && (
                  <button type="button" onClick={() => setUnits(sellable.toFixed(4))} className="text-xs text-ekush-orange hover:underline mt-1">
                    Redeem all ({sellable.toFixed(4)} units)
                  </button>
                )}
              </div>

              {unitsNum > 0 && nav > 0 && (
                <div className="bg-page-bg rounded-[10px] p-5 space-y-2">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-text-body">Estimated Amount</span>
                    <span className="text-text-dark font-medium">৳{estimatedAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-text-body">Estimated Gain/Loss</span>
                    <span className={`font-medium ${estimatedGain >= 0 ? "text-green-500" : "text-red-500"}`}>
                      ৳{estimatedGain.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 text-center">
              <Button
                onClick={() => setStep(1)}
                disabled={!selectedFund || unitsNum <= 0 || unitsNum > sellable}
                className="px-10"
              >
                Next Step
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Confirm */}
      {step === 1 && (
        <Card>
          <CardContent className="p-8">
            <h2 className="text-[16px] font-semibold text-text-dark font-rajdhani mb-6">Confirm Redemption</h2>
            <div className="bg-page-bg rounded-[10px] p-6 space-y-3">
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">Fund</span>
                <span className="text-text-dark font-medium">{holding?.fund.name} ({holding?.fund.code})</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">Units</span>
                <span className="text-text-dark font-medium">{Math.round(unitsNum).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">NAV</span>
                <span className="text-text-dark font-medium">{nav.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">Estimated Amount</span>
                <span className="text-text-dark font-medium">৳{estimatedAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-body">Estimated Gain/Loss</span>
                <span className={`font-medium ${estimatedGain >= 0 ? "text-green-500" : "text-red-500"}`}>
                  ৳{estimatedGain.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={handleSubmit} disabled={loading} className="bg-red-500 border-red-500 hover:bg-white hover:text-red-500">
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirm Sell Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Success */}
      {step === 2 && result && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-[20px] font-semibold text-text-dark font-rajdhani mb-2">Redemption Submitted!</h2>
            <p className="text-[14px] text-text-body mb-4">{result.message}</p>
            <div className="inline-block bg-page-bg rounded-[10px] p-6 space-y-2 text-left mb-6">
              <p className="text-[14px] text-text-body">Fund: <strong className="text-text-dark">{result.fund}</strong></p>
              <p className="text-[14px] text-text-body">Units: <strong className="text-text-dark">{Math.round(Number(result.units) || 0).toLocaleString("en-IN")}</strong></p>
              <p className="text-[14px] text-text-body">Est. Amount: <strong className="text-text-dark">৳{result.estimatedAmount?.toFixed(2)}</strong></p>
              <Badge variant="pending" className="mt-2">Pending Approval</Badge>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setResult(null); setStep(0); setUnits(""); }}>
                Place Another
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
