"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";

interface SipPlan {
  id: string;
  amount: number;
  frequency: string;
  debitDay: number;
  startDate: string;
  endDate: string | null;
  status: string;
  fund: { code: string; name: string; currentNav: number };
}

interface Fund { code: string; name: string; currentNav: number; }

export default function SipPage() {
  const [plans, setPlans] = useState<SipPlan[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fundCode: "", amount: "", frequency: "MONTHLY", debitDay: "5" });
  const [loading, setLoading] = useState(false);

  const fetchPlans = () => fetch("/api/sip").then(r => r.json()).then(setPlans).catch(() => {});
  const fetchFunds = () => fetch("/api/funds").then(r => r.json()).then(setFunds).catch(() => {});

  useEffect(() => { fetchPlans(); fetchFunds(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/sip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), debitDay: parseInt(form.debitDay) }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ fundCode: "", amount: "", frequency: "MONTHLY", debitDay: "5" });
        fetchPlans();
      }
    } finally {
      setLoading(false);
    }
  };

  const activePlans = plans.filter(p => p.status === "ACTIVE");
  const totalMonthly = activePlans.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">SIP Management</h1>
          <p className="text-sm text-text-body">Manage your Systematic Investment Plans</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="bg-ekush-orange hover:bg-ekush-orange/90 text-white rounded-[5px] text-[13px]">
          <Plus className="w-4 h-4 mr-1" /> New SIP
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-[10px] shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-text-body">Active Plans</p>
            <p className="text-2xl font-bold text-green-600 font-rajdhani">{activePlans.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[10px] shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-text-body">Monthly Investment</p>
            <p className="text-2xl font-bold text-text-dark font-rajdhani">৳{totalMonthly.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[10px] shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-text-body">Total Plans</p>
            <p className="text-2xl font-bold text-text-dark font-rajdhani">{plans.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="border-ekush-orange/30 rounded-[10px] shadow-card">
          <CardHeader>
            <CardTitle className="text-[16px] font-semibold text-text-dark">Create New SIP</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-label block mb-1">Fund</label>
                <select value={form.fundCode} onChange={(e) => setForm({ ...form, fundCode: e.target.value })} className="w-full h-[50px] rounded-[5px] border border-input-border bg-input-bg px-3 text-sm" required>
                  <option value="">Select fund...</option>
                  {funds.map(f => <option key={f.code} value={f.code}>{f.code} - {f.name}</option>)}
                </select>
              </div>
              <Input label="Amount (BDT)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="5000" min="500" required />
              <div>
                <label className="text-sm font-medium text-text-label block mb-1">Frequency</label>
                <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="w-full h-[50px] rounded-[5px] border border-input-border bg-input-bg px-3 text-sm">
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-text-label block mb-1">Debit Day</label>
                <select
                  value={form.debitDay}
                  onChange={(e) => setForm({ ...form, debitDay: e.target.value })}
                  className="w-full h-[50px] rounded-[5px] border border-input-border bg-input-bg px-3 text-sm"
                >
                  <option value="5">5th day of the month</option>
                  <option value="15">15th day of the month</option>
                  <option value="26">26th day of the month</option>
                </select>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={loading} className="bg-ekush-orange hover:bg-ekush-orange/90 text-white rounded-[5px] text-[13px]">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                  Create SIP
                </Button>
                <Button type="button" onClick={() => setShowCreate(false)} variant="outline" className="rounded-[5px] text-[13px]">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
