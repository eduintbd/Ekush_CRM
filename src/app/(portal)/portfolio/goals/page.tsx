"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, TrendingUp, Calendar, PiggyBank } from "lucide-react";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  monthlySipNeeded: number;
}

const PRESET_GOALS = [
  { name: "Retirement", icon: "🏖️" },
  { name: "Children's Education", icon: "🎓" },
  { name: "Hajj", icon: "🕋" },
  { name: "Home Purchase", icon: "🏠" },
  { name: "Emergency Fund", icon: "🛡️" },
  { name: "Custom Goal", icon: "🎯" },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([
    { id: "1", name: "Retirement", targetAmount: 10000000, currentAmount: 2500000, deadline: "2045-12-31", monthlySipNeeded: 15000 },
    { id: "2", name: "Children's Education", targetAmount: 3000000, currentAmount: 800000, deadline: "2035-06-30", monthlySipNeeded: 12000 },
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", targetAmount: "", deadline: "", assumedReturn: "12" });

  const handleCreate = () => {
    const target = parseFloat(form.targetAmount) || 0;
    const years = Math.max(1, (new Date(form.deadline).getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000));
    const monthlyRate = (parseFloat(form.assumedReturn) || 12) / 100 / 12;
    const months = years * 12;
    const monthlySip = monthlyRate > 0
      ? target / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate))
      : target / months;

    setGoals([...goals, {
      id: Date.now().toString(),
      name: form.name || "My Goal",
      targetAmount: target,
      currentAmount: 0,
      deadline: form.deadline,
      monthlySipNeeded: Math.round(monthlySip),
    }]);
    setShowCreate(false);
    setForm({ name: "", targetAmount: "", deadline: "", assumedReturn: "12" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Goal-Based Investing</h1>
          <p className="text-sm text-text-body">Map your investments to life goals and track progress</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="bg-ekush-orange hover:bg-ekush-orange/90 text-white rounded-[5px] text-[13px]">
          <Plus className="w-4 h-4 mr-1" /> New Goal
        </Button>
      </div>

      {showCreate && (
        <Card className="border-ekush-orange/30 rounded-[10px] shadow-card">
          <CardHeader><CardTitle className="text-[16px] font-semibold text-text-dark">Create Goal</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {PRESET_GOALS.map(g => (
                <button key={g.name} type="button" onClick={() => setForm({ ...form, name: g.name })}
                  className={`p-3 rounded-[10px] border text-left text-sm transition-colors ${form.name === g.name ? "border-ekush-orange bg-ekush-orange/10" : "border-input-border hover:bg-page-bg"}`}>
                  <span className="text-lg mr-2">{g.icon}</span>{g.name}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {form.name === "Custom Goal" && (
                <Input label="Goal Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              )}
              <Input label="Target Amount (BDT)" type="number" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} placeholder="10,000,000" />
              <Input label="Target Date" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              <Input label="Expected Annual Return (%)" type="number" value={form.assumedReturn} onChange={(e) => setForm({ ...form, assumedReturn: e.target.value })} />
              <div className="flex gap-2">
                <Button onClick={handleCreate} className="bg-ekush-orange hover:bg-ekush-orange/90 text-white rounded-[5px] text-[13px]">Create Goal</Button>
                <Button onClick={() => setShowCreate(false)} variant="outline" className="rounded-[5px] text-[13px]">Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
          const remaining = goal.targetAmount - goal.currentAmount;
          const yearsLeft = Math.max(0, (new Date(goal.deadline).getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000));

          return (
            <Card key={goal.id} className="rounded-[10px] shadow-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-[16px] font-semibold text-text-dark flex items-center gap-2">
                      <Target className="w-5 h-5 text-ekush-orange" /> {goal.name}
                    </h3>
                    <p className="text-xs text-text-body mt-0.5 flex items-center gap-3">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(goal.deadline).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>
                      <span>{yearsLeft.toFixed(1)} years left</span>
                    </p>
                  </div>
                  <Badge variant={progress >= 100 ? "success" : progress >= 50 ? "default" : "warning"}>
                    {progress.toFixed(0)}%
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="h-3 rounded-full bg-page-bg overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-ekush-orange to-green-500 transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-text-body mt-1">
                    <span>{goal.currentAmount.toLocaleString("en-IN")}</span>
                    <span>{goal.targetAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-page-bg rounded-[10px] p-3">
                    <p className="text-xs text-text-body">Remaining</p>
                    <p className="font-semibold text-text-dark font-rajdhani">{remaining.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-ekush-orange/10 rounded-[10px] p-3">
                    <p className="text-xs text-text-body flex items-center gap-1"><PiggyBank className="w-3 h-3" /> Monthly SIP Needed</p>
                    <p className="font-semibold text-ekush-orange font-rajdhani">{goal.monthlySipNeeded.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-green-50 rounded-[10px] p-3">
                    <p className="text-xs text-text-body flex items-center gap-1"><TrendingUp className="w-3 h-3" /> On Track?</p>
                    <p className="font-semibold text-green-700">{progress >= (100 - yearsLeft / (yearsLeft + 5) * 100) ? "Yes" : "Needs Attention"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
