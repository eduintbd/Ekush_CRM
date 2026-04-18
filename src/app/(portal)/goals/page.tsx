"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Loader2,
  MoreHorizontal,
  Plus,
  Target,
  X,
} from "lucide-react";

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

// ─── Calculator helpers ───────────────────────────────────────────
function calcMaturityValue(lumpsum: number, monthlySip: number, annualRate: number, years: number) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
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

function formatTimeLeft(months: number): string {
  if (months <= 0) return "due now";
  const years = Math.floor(months / 12);
  const m = months % 12;
  if (years === 0) return `${m} month${m > 1 ? "s" : ""} left`;
  if (m === 0) return `${years} year${years > 1 ? "s" : ""} left`;
  return `${years} yr ${m} mo left`;
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function goalIcon(name: string): string {
  const n = name.toLowerCase();
  if (/retire|pension/.test(n)) return "🏖️";
  if (/educat|school|college|univ|study|tuition/.test(n)) return "🎓";
  if (/hajj|umrah/.test(n)) return "🕋";
  if (/house|home|flat|apartment|property/.test(n)) return "🏠";
  if (/car|vehicle|bike/.test(n)) return "🚗";
  if (/wedding|marriage/.test(n)) return "💍";
  return "🎯";
}

type StatusKey = "achieved" | "on-track" | "behind" | "at-risk";

interface GoalProgress {
  current: number;
  remaining: number;
  pct: number;
  expectedPct: number;
  monthsElapsed: number;
  totalMonths: number;
  monthsLeft: number;
  status: StatusKey;
  // Catch-up suggestion fields (only meaningful when behind / at-risk)
  catchUpSip: number;
  extendByMonths: number;
}

function computeProgress(goal: Goal): GoalProgress {
  const totalMonths = goal.timePeriodYears * 12;
  const created = new Date(goal.createdAt);
  const now = new Date();
  const monthsElapsed = Math.max(0, Math.min(totalMonths, monthsBetween(created, now)));
  const monthsLeft = Math.max(0, totalMonths - monthsElapsed);

  // Per-goal contribution-to-date used as "current" (lumpsum + planned SIP×elapsed).
  // This is independent of the shared portfolio so each goal has its own progress.
  const current = Math.min(
    goal.targetAmount,
    goal.lumpsumAmount + goal.monthlySip * monthsElapsed
  );
  const remaining = Math.max(0, goal.targetAmount - current);
  const pct = goal.targetAmount > 0 ? (current / goal.targetAmount) * 100 : 0;
  const expectedPct = totalMonths > 0 ? (monthsElapsed / totalMonths) * 100 : 0;

  let status: StatusKey;
  if (current >= goal.targetAmount) status = "achieved";
  else {
    const delta = pct - expectedPct;
    if (delta >= -1) status = "on-track";
    else if (delta >= -10) status = "behind";
    else status = "at-risk";
  }

  // Catch-up suggestions (use a simple linear gap; ignore returns to keep it intuitive).
  const gap = Math.max(0, goal.targetAmount - current);
  const catchUpSip = monthsLeft > 0 ? gap / monthsLeft : 0;
  const extendByMonths = goal.monthlySip > 0 ? Math.ceil(gap / goal.monthlySip) - monthsLeft : 0;

  return { current, remaining, pct, expectedPct, monthsElapsed, totalMonths, monthsLeft, status, catchUpSip, extendByMonths };
}

const STATUS_CHIP: Record<StatusKey, { label: string; cls: string }> = {
  "achieved":  { label: "Achieved",    cls: "bg-green-100 text-green-700" },
  "on-track":  { label: "On track",    cls: "bg-green-100 text-green-700" },
  "behind":    { label: "Behind pace", cls: "bg-amber-100 text-amber-700" },
  "at-risk":   { label: "At risk",     cls: "bg-red-100 text-red-700" },
};

const STATUS_BORDER: Record<StatusKey, string> = {
  "achieved": "border-l-green-500",
  "on-track": "border-l-green-500",
  "behind":   "border-l-amber-500",
  "at-risk":  "border-l-red-600",
};

const STATUS_BAR: Record<StatusKey, string> = {
  "achieved": "bg-green-500",
  "on-track": "bg-green-500",
  "behind":   "bg-amber-500",
  "at-risk":  "bg-red-600",
};

function deadlineLabel(deadline: string): string {
  const d = new Date(deadline);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

// ─── Page component ───────────────────────────────────────────────
export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio>({ totalMarketValue: 0, totalCostValue: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // UI state
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [fixItId, setFixItId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Calculator state (form)
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [lumpsumAmount, setLumpsumAmount] = useState("");
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

  // Close ⋯ menu on outside click
  useEffect(() => {
    if (!menuOpenId) return;
    const onClick = () => setMenuOpenId(null);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpenId]);

  // Form derivations
  const lumpsum = parseFloat(lumpsumAmount) || 0;
  const target = parseFloat(targetAmount) || 0;
  const requiredSip = target > 0 ? calcRequiredSip(target, lumpsum, expectedReturn, timePeriod) : 0;
  const maturityValue = calcMaturityValue(lumpsum, requiredSip, expectedReturn, timePeriod);
  const totalInvested = lumpsum + requiredSip * timePeriod * 12;
  const estimatedReturns = maturityValue - totalInvested;

  const resetForm = () => {
    setGoalName("");
    setTargetAmount("");
    setLumpsumAmount("");
    setExpectedReturn(10);
    setTimePeriod(5);
    setError("");
    setSuccess("");
  };

  const openCreate = () => {
    setCreateOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const handleSaveGoal = async () => {
    if (!goalName.trim()) { setError("Please enter a goal name"); return; }
    if (target <= 0) { setError("Target amount must be greater than 0"); return; }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: goalName,
          targetAmount: target,
          lumpsumAmount: lumpsum,
          monthlySip: requiredSip,
          expectedReturn,
          timePeriodYears: timePeriod,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save goal");
      } else {
        setSuccess("Goal saved");
        resetForm();
        setCreateOpen(false);
        fetchGoals();
      }
    } catch {
      setError("Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    setConfirmDeleteId(null);
    setMenuOpenId(null);
    try {
      await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
      fetchGoals();
    } catch {
      // silent
    }
  };

  // ─── Page-header summary ────────────────────────────────────────
  const totalInvestedAcrossGoals = goals.reduce((sum, g) => {
    const p = computeProgress(g);
    return sum + p.current;
  }, 0);

  // ─── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-text-body text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading goals…
      </div>
    );
  }

  const empty = goals.length === 0;

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-text-dark font-rajdhani leading-tight">
            My goals
          </h1>
          <p className="text-[13px] text-text-body mt-1">
            {empty
              ? "No goals yet — set one below to start tracking."
              : `${goals.length} active · ৳ ${formatBDT(Math.round(totalInvestedAcrossGoals))} invested across all goals`}
          </p>
        </div>
        {!empty && !createOpen && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-ekush-orange hover:bg-ekush-orange-dark transition-colors text-white text-[13px] font-semibold px-4 py-2 rounded-lg shadow-[0_2px_6px_rgba(242,112,35,0.25)]"
          >
            <Plus className="w-4 h-4" />
            Add goal
          </button>
        )}
      </div>

      {/* ── Create card / form ────────────────────────────────────── */}
      {(empty || createOpen) ? (
        <div ref={formRef}>
          <CreateForm
            empty={empty}
            goalName={goalName} setGoalName={setGoalName}
            targetAmount={targetAmount} setTargetAmount={setTargetAmount}
            lumpsumAmount={lumpsumAmount} setLumpsumAmount={setLumpsumAmount}
            expectedReturn={expectedReturn} setExpectedReturn={setExpectedReturn}
            timePeriod={timePeriod} setTimePeriod={setTimePeriod}
            requiredSip={requiredSip}
            totalInvested={totalInvested}
            estimatedReturns={estimatedReturns}
            maturityValue={maturityValue}
            error={error}
            success={success}
            saving={saving}
            onCancel={empty ? undefined : () => { setCreateOpen(false); resetForm(); }}
            onSave={handleSaveGoal}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={openCreate}
          className="w-full bg-white rounded-[10px] border-2 border-dashed border-gray-300 hover:border-ekush-orange hover:bg-orange-50/30 transition-colors p-5 flex items-center gap-4 text-left"
        >
          <span className="w-12 h-12 rounded-full bg-orange-50 text-ekush-orange flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-text-dark">Create a new goal</p>
            <p className="text-[12px] text-text-body mt-0.5">Retirement, education, Hajj, house or custom</p>
          </div>
          <ChevronDown className="w-5 h-5 text-text-muted shrink-0" />
        </button>
      )}

      {/* ── Goal cards ─────────────────────────────────────────── */}
      {!empty && (
        <ul className="space-y-3">
          {goals.map((goal) => {
            const p = computeProgress(goal);
            const expanded = expandedId === goal.id;
            const chip = STATUS_CHIP[p.status];
            const border = STATUS_BORDER[p.status];
            const bar = STATUS_BAR[p.status];
            const showAdvice = p.status === "behind" || p.status === "at-risk";
            const fixOpen = fixItId === goal.id;
            const paceLine = p.status === "achieved"
              ? "Goal achieved"
              : p.pct - p.expectedPct >= -1
                ? `On pace (should be ${Math.round(p.expectedPct)}% by now)`
                : `Should be ${Math.round(p.expectedPct)}% by now`;

            return (
              <li
                key={goal.id}
                className={`bg-white rounded-[10px] border border-gray-100 border-l-[3px] ${border} shadow-[0_1px_3px_rgba(15,30,61,0.05)] overflow-hidden`}
              >
                {/* Header row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : goal.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="w-9 h-9 rounded-md bg-gray-50 flex items-center justify-center text-[18px] shrink-0">
                    {goalIcon(goal.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-dark truncate">{goal.name}</p>
                    {expanded ? (
                      <p className="text-[11px] text-text-body mt-0.5">
                        Target ৳ {formatBDT(Math.round(goal.targetAmount))} by {deadlineLabel(goal.deadline)} · {formatTimeLeft(p.monthsLeft)}
                      </p>
                    ) : (
                      <p className="text-[11px] text-text-body mt-0.5">
                        {Math.round(p.pct)}% complete · ৳ {formatBDT(Math.round(p.current))} of ৳ {formatBDT(Math.round(goal.targetAmount))} · {formatTimeLeft(p.monthsLeft)}
                      </p>
                    )}
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${chip.cls}`}>
                    {chip.label}
                  </span>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      aria-label="Goal actions"
                      onClick={() => setMenuOpenId(menuOpenId === goal.id ? null : goal.id)}
                      className="p-1.5 rounded-full text-text-body hover:bg-gray-100 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpenId === goal.id && (
                      <div
                        role="menu"
                        className="absolute right-0 top-9 z-20 w-36 bg-white border border-gray-200 rounded-md shadow-lg py-1"
                      >
                        <button
                          type="button"
                          disabled
                          title="Coming soon"
                          className="w-full text-left px-3 py-1.5 text-[12px] text-text-muted cursor-not-allowed"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled
                          title="Coming soon"
                          className="w-full text-left px-3 py-1.5 text-[12px] text-text-muted cursor-not-allowed"
                        >
                          Pause
                        </button>
                        <div className="my-1 border-t border-gray-100" />
                        <button
                          type="button"
                          onClick={() => { setMenuOpenId(null); setConfirmDeleteId(goal.id); }}
                          className="w-full text-left px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>

                {/* Body — expanded only */}
                {expanded && (
                  <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-100">
                    {/* Hero pct + pace */}
                    <div className="flex items-end justify-between gap-3 pt-3">
                      <div>
                        <p className="text-[22px] font-medium text-text-dark leading-none">
                          {Math.round(p.pct)}<span className="text-[14px] text-text-body ml-1">% complete</span>
                        </p>
                      </div>
                      <p className="text-[11px] text-text-body text-right">
                        {paceLine}
                      </p>
                    </div>

                    {/* Progress bar with expected-marker */}
                    <div className="relative h-1.5 bg-gray-100 rounded-full overflow-visible">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, p.pct)}%` }} />
                      {p.status !== "achieved" && p.status !== "on-track" && (
                        <span
                          aria-hidden
                          title={`Expected: ${Math.round(p.expectedPct)}%`}
                          className="absolute top-[-3px] w-px h-3 bg-text-dark/40"
                          style={{ left: `${Math.min(100, p.expectedPct)}%` }}
                        />
                      )}
                    </div>

                    {/* Three-column metric strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <Metric label="Current" value={`৳ ${formatBDT(Math.round(p.current))}`} />
                      <Metric label="Remaining" value={`৳ ${formatBDT(Math.round(p.remaining))}`} />
                      <Metric label="Monthly SIP" value={`৳ ${formatBDT(Math.round(goal.monthlySip))}`} />
                    </div>

                    {/* Advisory panel for behind / at-risk */}
                    {showAdvice && (
                      <div className="rounded-md bg-amber-50 border border-amber-200 p-3 space-y-2">
                        <p className="text-[12px] text-amber-900">
                          You're <span className="font-semibold">{Math.round(p.expectedPct - p.pct)}%</span> behind the pace needed to hit ৳ {formatBDT(Math.round(goal.targetAmount))} by {deadlineLabel(goal.deadline)}.
                        </p>
                        {!fixOpen ? (
                          <button
                            type="button"
                            onClick={() => setFixItId(goal.id)}
                            className="text-[12px] font-semibold text-ekush-orange hover:underline"
                          >
                            Fix it →
                          </button>
                        ) : (
                          <div className="space-y-2 pt-1 text-[12px] text-amber-900">
                            <p>
                              • Increase monthly SIP to{" "}
                              <span className="font-semibold">৳ {formatBDT(Math.ceil(p.catchUpSip))}</span>{" "}
                              for the remaining {p.monthsLeft} {p.monthsLeft === 1 ? "month" : "months"} to catch up.
                            </p>
                            {p.extendByMonths > 0 && goal.monthlySip > 0 && (
                              <p>
                                • Or keep the current SIP and extend the deadline by{" "}
                                <span className="font-semibold">{formatTimeLeft(p.extendByMonths).replace(" left", "")}</span>.
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setFixItId(null)}
                              className="text-[11px] text-amber-700 hover:underline"
                            >
                              Close
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Delete confirmation ──────────────────────────────────── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-[14px] font-semibold text-text-dark mb-1">Delete this goal?</p>
            <p className="text-[12px] text-text-body mb-4">This can't be undone. Progress data is removed.</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 text-[12px] text-text-dark hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGoal(confirmDeleteId)}
                className="px-3 py-1.5 text-[12px] bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-md px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">{label}</p>
      <p className="text-[12px] font-medium text-text-dark mt-0.5">{value}</p>
    </div>
  );
}

interface CreateFormProps {
  empty: boolean;
  goalName: string; setGoalName: (s: string) => void;
  targetAmount: string; setTargetAmount: (s: string) => void;
  lumpsumAmount: string; setLumpsumAmount: (s: string) => void;
  expectedReturn: number; setExpectedReturn: (n: number) => void;
  timePeriod: number; setTimePeriod: (n: number) => void;
  requiredSip: number;
  totalInvested: number;
  estimatedReturns: number;
  maturityValue: number;
  error: string;
  success: string;
  saving: boolean;
  onCancel?: () => void;
  onSave: () => void;
}

function CreateForm(p: CreateFormProps) {
  const inputClass = "w-full h-[42px] rounded-[6px] border border-input-border bg-input-bg px-3 text-[14px] text-text-dark focus:outline-none focus:border-ekush-orange";
  const labelClass = "text-[12px] font-medium text-text-label block mb-1";

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-ekush-orange" />
            <h2 className="text-[15px] font-semibold text-text-dark">
              {p.empty ? "Set your first goal" : "Create a new goal"}
            </h2>
          </div>
          {p.onCancel && (
            <button
              type="button"
              onClick={p.onCancel}
              aria-label="Close form"
              className="p-1.5 rounded-full text-text-body hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Goal name</label>
              <input
                type="text"
                value={p.goalName}
                onChange={(e) => p.setGoalName(e.target.value)}
                placeholder="e.g., Retirement, Education, Hajj"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Target amount (BDT)</label>
              <input
                type="number"
                value={p.targetAmount}
                onChange={(e) => p.setTargetAmount(e.target.value)}
                placeholder="e.g., 10,00,000"
                min="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Lumpsum investment (BDT)</label>
              <input
                type="number"
                value={p.lumpsumAmount}
                onChange={(e) => p.setLumpsumAmount(e.target.value)}
                placeholder="0"
                min="0"
                max="50000000"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Expected return (% p.a.)</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => p.setExpectedReturn(Math.max(6, p.expectedReturn - 1))} className="w-9 h-9 rounded-md bg-page-bg border border-input-border text-text-dark font-bold hover:bg-gray-200">−</button>
                  <input type="number" value={p.expectedReturn} onChange={(e) => p.setExpectedReturn(Math.min(20, Math.max(6, Number(e.target.value))))} min="6" max="20" className={`${inputClass} text-center flex-1 px-1`} />
                  <button onClick={() => p.setExpectedReturn(Math.min(20, p.expectedReturn + 1))} className="w-9 h-9 rounded-md bg-page-bg border border-input-border text-text-dark font-bold hover:bg-gray-200">+</button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Time period (years)</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => p.setTimePeriod(Math.max(1, p.timePeriod - 1))} className="w-9 h-9 rounded-md bg-page-bg border border-input-border text-text-dark font-bold hover:bg-gray-200">−</button>
                  <input type="number" value={p.timePeriod} onChange={(e) => p.setTimePeriod(Math.min(20, Math.max(1, Number(e.target.value))))} min="1" max="20" className={`${inputClass} text-center flex-1 px-1`} />
                  <button onClick={() => p.setTimePeriod(Math.min(20, p.timePeriod + 1))} className="w-9 h-9 rounded-md bg-page-bg border border-input-border text-text-dark font-bold hover:bg-gray-200">+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-page-bg rounded-[10px] p-5 flex flex-col justify-between">
            <div className="space-y-3">
              {p.requiredSip > 0 && (
                <div className="bg-white rounded-[10px] p-3">
                  <p className="text-[11px] text-text-body mb-1">Required monthly SIP</p>
                  <p className="text-[22px] font-semibold text-ekush-orange leading-none">
                    ৳ {formatBDT(Math.ceil(p.requiredSip))}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-[10px] p-3">
                  <p className="text-[11px] text-text-body mb-1">Total investment</p>
                  <p className="text-[15px] font-semibold text-text-dark">৳ {formatBDT(Math.round(p.totalInvested))}</p>
                </div>
                <div className="bg-white rounded-[10px] p-3">
                  <p className="text-[11px] text-text-body mb-1">Est. returns</p>
                  <p className="text-[15px] font-semibold text-green-600">৳ {formatBDT(Math.round(p.estimatedReturns))}</p>
                </div>
              </div>
              <div className="bg-white rounded-[10px] p-3">
                <p className="text-[11px] text-text-body mb-1">Maturity value</p>
                <p className="text-[20px] font-semibold text-navy">৳ {formatBDT(Math.round(p.maturityValue))}</p>
              </div>
            </div>

            {p.error && (
              <div className="flex items-center gap-2 text-red-600 text-[12px] mt-3">
                <AlertCircle className="w-4 h-4" /> {p.error}
              </div>
            )}
            {p.success && (
              <div className="flex items-center gap-2 text-green-600 text-[12px] mt-3">
                <CheckCircle className="w-4 h-4" /> {p.success}
              </div>
            )}

            <Button onClick={p.onSave} disabled={p.saving} className="w-full mt-3">
              {p.saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save goal
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
