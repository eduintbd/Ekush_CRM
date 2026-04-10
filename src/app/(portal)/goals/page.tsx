"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Trash2, TrendingUp, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  lumpsumAmount: number;
  monthlySip: number;
  expectedReturn: number;
  timePeriodYears: number;
  deadline: string;
  status: string;
  createdAt: string;
}

interface Portfolio {
  totalMarketValue: number;
  totalCostValue: number;
}

// ─── Calculator Logic ────────────────────────────────────────────
function calcMaturityValue(lumpsum: number, monthlySip: number, annualRate: number, years: number) {
  const r = annualRate / 100 / 12; // monthly rate
  const n = years * 12; // total months
  const lumpsumFV = lumpsum * Math.pow(1 + r, n);
  const sipFV = monthlySip > 0 ? monthlySip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : 0;
  return lumpsumFV + sipFV;
}

function calcRequiredSip(target: number, lumpsum: number, annualRate: number, years: number) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const lumpsumFV = lumpsum * Math.pow(1 + r, n);
  const remaining = target - lumpsumFV;
  if (remaining <= 0) return 0;
  const sipMultiplier = ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  return remaining / sipMultiplier;
}

const formatBDT = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio>({ totalMarketValue: 0, totalCostValue: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Calculator state
  const [mode, setMode] = useState<"goal" | "invest">("goal");
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [lumpsumAmount, setLumpsumAmount] = useState("");
  const [monthlySipInput, setMonthlySipInput] = useState("");
  const [expectedReturn, setExpectedReturn] = useState(10);
  const [timePeriod, setTimePeriod] = useState(5);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      const data = await res.json();
      setGoals(data.goals || []);
      setPortfolio(data.portfolio || { totalMarketValue: 0, totalCostValue: 0 });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  // Derived calculations
  const lumpsum = parseFloat(lumpsumAmount) || 0;
  const target = parseFloat(targetAmount) || 0;
  const sipInput = parseFloat(monthlySipInput) || 0;

  const requiredSip = mode === "goal" && target > 0
    ? calcRequiredSip(target, lumpsum, expectedReturn, timePeriod)
    : 0;

  const maturityValue = mode === "invest"
    ? calcMaturityValue(lumpsum, sipInput, expectedReturn, timePeriod)
    : calcMaturityValue(lumpsum, requiredSip, expectedReturn, timePeriod);

  const totalInvested = mode === "invest"
    ? lumpsum + sipInput * timePeriod * 12
    : lumpsum + requiredSip * timePeriod * 12;

  const estimatedReturns = maturityValue - totalInvested;

  const handleSaveGoal = async () => {
    if (!goalName.trim()) { setError("Please enter a goal name"); return; }

    const finalTarget = mode === "goal" ? target : maturityValue;
    const finalSip = mode === "goal" ? requiredSip : sipInput;

    if (finalTarget <= 0) { setError("Target amount must be greater than 0"); return; }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: goalName,
          targetAmount: finalTarget,
          lumpsumAmount: lumpsum,
          monthlySip: finalSip,
          expectedReturn,
          timePeriodYears: timePeriod,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save goal");
      } else {
        setSuccess("Goal saved successfully!");
        setGoalName("");
        setTargetAmount("");
        setLumpsumAmount("");
        setMonthlySipInput("");
        setExpectedReturn(10);
        setTimePeriod(5);
        fetchGoals();
      }
    } catch {
      setError("Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
      fetchGoals();
    } catch {
      // silent
    }
  };

  const inputClass = "w-full h-[46px] rounded-[5px] border border-input-border bg-input-bg px-4 text-[14px] text-text-dark focus:outline-none focus:border-ekush-orange";
  const labelClass = "text-[13px] font-medium text-text-label block mb-1.5";

  return (
    <div className="space-y-8">
      <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Set My Goals</h1>

      {/* ─── Investment Calculator ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px] flex items-center gap-2">
            <Target className="w-4 h-4 text-ekush-orange" /> Investment Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mode Toggle */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setMode("goal")}
              className={`px-5 py-2 rounded-[5px] text-[13px] font-medium transition-colors ${
                mode === "goal"
                  ? "bg-ekush-orange text-white"
                  : "bg-page-bg text-text-body hover:bg-gray-200"
              }`}
            >
              I Know My Goal
            </button>
            <button
              onClick={() => setMode("invest")}
              className={`px-5 py-2 rounded-[5px] text-[13px] font-medium transition-colors ${
                mode === "invest"
                  ? "bg-ekush-orange text-white"
                  : "bg-page-bg text-text-body hover:bg-gray-200"
              }`}
            >
              I Want to Invest
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Inputs */}
            <div className="space-y-4">
              {mode === "goal" && (
                <div>
                  <label className={labelClass}>Goal Name</label>
                  <input
                    type="text"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    placeholder="e.g., Retirement, Education, Hajj"
                    className={inputClass}
                  />
                </div>
              )}

              {mode === "goal" ? (
                <div>
                  <label className={labelClass}>Desired Investment Goal (BDT)</label>
                  <input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="e.g., 10,00,000"
                    min="0"
                    className={inputClass}
                  />
                </div>
              ) : (
                <div>
                  <label className={labelClass}>Monthly Investment Amount - SIP (BDT)</label>
                  <input
                    type="number"
                    value={monthlySipInput}
                    onChange={(e) => setMonthlySipInput(e.target.value)}
                    placeholder="e.g., 5,000"
                    min="0"
                    max="500000"
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>Lumpsum Investment (BDT)</label>
                <input
                  type="number"
                  value={lumpsumAmount}
                  onChange={(e) => setLumpsumAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="50000000"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Expected Return Rate (% p.a.)</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExpectedReturn(Math.max(6, expectedReturn - 1))}
                    className="w-10 h-10 rounded-[5px] bg-page-bg border border-input-border text-text-dark font-bold hover:bg-gray-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={expectedReturn}
                    onChange={(e) => setExpectedReturn(Math.min(20, Math.max(6, Number(e.target.value))))}
                    min="6"
                    max="20"
                    className={`${inputClass} text-center flex-1`}
                  />
                  <button
                    onClick={() => setExpectedReturn(Math.min(20, expectedReturn + 1))}
                    className="w-10 h-10 rounded-[5px] bg-page-bg border border-input-border text-text-dark font-bold hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Time Period (Years)</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTimePeriod(Math.max(1, timePeriod - 1))}
                    className="w-10 h-10 rounded-[5px] bg-page-bg border border-input-border text-text-dark font-bold hover:bg-gray-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(Math.min(20, Math.max(1, Number(e.target.value))))}
                    min="1"
                    max="20"
                    className={`${inputClass} text-center flex-1`}
                  />
                  <button
                    onClick={() => setTimePeriod(Math.min(20, timePeriod + 1))}
                    className="w-10 h-10 rounded-[5px] bg-page-bg border border-input-border text-text-dark font-bold hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-page-bg rounded-[10px] p-6 flex flex-col justify-between">
              <div className="space-y-4">
                {mode === "goal" && requiredSip > 0 && (
                  <div className="bg-white rounded-[10px] p-4">
                    <p className="text-[12px] text-text-body mb-1">Required Monthly SIP</p>
                    <p className="text-[24px] font-bold text-ekush-orange">
                      BDT {formatBDT(Math.ceil(requiredSip))}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-[10px] p-4">
                    <p className="text-[12px] text-text-body mb-1">Total Investment</p>
                    <p className="text-[18px] font-bold text-text-dark">
                      BDT {formatBDT(Math.round(totalInvested))}
                    </p>
                  </div>
                  <div className="bg-white rounded-[10px] p-4">
                    <p className="text-[12px] text-text-body mb-1">Estimated Returns</p>
                    <p className="text-[18px] font-bold text-green-600">
                      BDT {formatBDT(Math.round(estimatedReturns))}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-[10px] p-4">
                  <p className="text-[12px] text-text-body mb-1">Maturity Value</p>
                  <p className="text-[28px] font-bold text-navy">
                    BDT {formatBDT(Math.round(maturityValue))}
                  </p>
                  {/* Simple bar chart */}
                  <div className="mt-3 h-4 rounded-full bg-gray-100 overflow-hidden flex">
                    <div
                      className="h-full bg-ekush-orange rounded-l-full"
                      style={{ width: `${maturityValue > 0 ? (totalInvested / maturityValue) * 100 : 0}%` }}
                    />
                    <div
                      className="h-full bg-green-500 rounded-r-full"
                      style={{ width: `${maturityValue > 0 ? (estimatedReturns / maturityValue) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-2 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-ekush-orange" /> Invested
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" /> Returns
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-[13px] mt-3">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 text-green-600 text-[13px] mt-3">
                  <CheckCircle className="w-4 h-4" /> {success}
                </div>
              )}

              <Button
                onClick={handleSaveGoal}
                disabled={saving}
                className="w-full mt-4"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Goal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Saved Goals + Progress ─── */}
      {loading ? (
        <div className="text-center py-10 text-text-body text-sm">Loading goals...</div>
      ) : goals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[16px] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" /> My Goals — Progress Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Portfolio summary */}
            <div className="bg-page-bg rounded-[10px] p-4 mb-6">
              <p className="text-[13px] text-text-body">
                Your current portfolio value:{" "}
                <span className="font-bold text-text-dark">BDT {formatBDT(Math.round(portfolio.totalMarketValue))}</span>
                <span className="text-text-muted ml-2">(Cost: BDT {formatBDT(Math.round(portfolio.totalCostValue))})</span>
              </p>
            </div>

            <div className="space-y-4">
              {goals.map((goal) => {
                const progress = goal.targetAmount > 0
                  ? Math.min(100, (portfolio.totalMarketValue / goal.targetAmount) * 100)
                  : 0;
                const remaining = Math.max(0, goal.targetAmount - portfolio.totalMarketValue);
                const deadlineDate = new Date(goal.deadline);
                const now = new Date();
                const monthsLeft = Math.max(0, (deadlineDate.getFullYear() - now.getFullYear()) * 12 + (deadlineDate.getMonth() - now.getMonth()));
                const onTrack = remaining <= 0 || (goal.monthlySip * monthsLeft >= remaining * 0.5);

                return (
                  <div key={goal.id} className="bg-page-bg rounded-[10px] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-[15px] font-semibold text-text-dark">{goal.name}</h3>
                        <p className="text-[12px] text-text-body mt-0.5">
                          Target: BDT {formatBDT(Math.round(goal.targetAmount))} | SIP: BDT {formatBDT(Math.round(goal.monthlySip))}/mo |{" "}
                          {goal.timePeriodYears}yr @ {goal.expectedReturn}% | Deadline: {deadlineDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          remaining <= 0
                            ? "bg-green-100 text-green-700"
                            : onTrack
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {remaining <= 0 ? "Achieved" : onTrack ? "On Track" : "Needs Attention"}
                        </span>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-1 text-text-body hover:text-red-500 transition-colors"
                          title="Delete goal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          remaining <= 0 ? "bg-green-500" : onTrack ? "bg-ekush-orange" : "bg-amber-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[12px] text-text-body">
                      <span>
                        Current: BDT {formatBDT(Math.round(portfolio.totalMarketValue))} ({progress.toFixed(1)}%)
                      </span>
                      <span>
                        {remaining > 0
                          ? `Remaining: BDT ${formatBDT(Math.round(remaining))} | ${monthsLeft} months left`
                          : "Goal achieved!"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
