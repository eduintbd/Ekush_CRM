"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, CheckCircle } from "lucide-react";

interface Fund {
  id: string;
  code: string;
  name: string;
  currentNav: number;
  entryLoad: number;
  exitLoad: number;
}

export function NavInsertForm({ funds }: { funds: Fund[] }) {
  const router = useRouter();
  const [fundId, setFundId] = useState(funds[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [nav, setNav] = useState("");
  const [buyUnit, setBuyUnit] = useState("");
  const [sellUnit, setSellUnit] = useState("");
  const [dsex, setDsex] = useState("");
  const [ds30, setDs30] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedFund = funds.find((f) => f.id === fundId);

  // Auto-fill buy/sell from NAV and loads
  const handleNavChange = (v: string) => {
    setNav(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0 && selectedFund) {
      if (!buyUnit) setBuyUnit((n * (1 + Number(selectedFund.entryLoad))).toFixed(4));
      if (!sellUnit) setSellUnit((n * (1 - Number(selectedFund.exitLoad))).toFixed(4));
    }
  };

  const handleSubmit = async () => {
    if (!fundId || !date || !nav) {
      setMessage({ type: "error", text: "Fund, date, and NAV are required" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/nav/insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fundId, date, nav, buyUnit, sellUnit, dsex, ds30 }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "NAV record saved" });
        setNav("");
        setBuyUnit("");
        setSellUnit("");
        setDsex("");
        setDs30("");
        router.refresh();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data.error || "Save failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-ekush-orange" />
          <h3 className="text-[14px] font-semibold text-text-dark font-rajdhani">
            Insert New NAV Entry
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="text-[11px] text-text-body block mb-1">Fund Name</label>
            <select
              value={fundId}
              onChange={(e) => setFundId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange bg-white"
            >
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-text-body block mb-1">NAV as On</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange"
            />
          </div>
          <div>
            <label className="text-[11px] text-text-body block mb-1">NAV per Unit *</label>
            <input
              type="number"
              step="0.0001"
              value={nav}
              onChange={(e) => handleNavChange(e.target.value)}
              placeholder="e.g., 14.7540"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange font-mono"
            />
          </div>
          <div>
            <label className="text-[11px] text-text-body block mb-1">Buy Unit</label>
            <input
              type="number"
              step="0.0001"
              value={buyUnit}
              onChange={(e) => setBuyUnit(e.target.value)}
              placeholder="auto"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange font-mono"
            />
          </div>
          <div>
            <label className="text-[11px] text-text-body block mb-1">Sell Unit</label>
            <input
              type="number"
              step="0.0001"
              value={sellUnit}
              onChange={(e) => setSellUnit(e.target.value)}
              placeholder="auto"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange font-mono"
            />
          </div>
          <div>
            <label className="text-[11px] text-text-body block mb-1">DSEX</label>
            <input
              type="number"
              step="0.01"
              value={dsex}
              onChange={(e) => setDsex(e.target.value)}
              placeholder="e.g., 4958.99"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange font-mono"
            />
          </div>
          <div>
            <label className="text-[11px] text-text-body block mb-1">DS30</label>
            <input
              type="number"
              step="0.01"
              value={ds30}
              onChange={(e) => setDs30(e.target.value)}
              placeholder="e.g., 1912.72"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-ekush-orange font-mono"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            size="sm"
            className="bg-ekush-orange hover:bg-ekush-orange-dark text-white"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Plus className="w-4 h-4 mr-1" />
            )}
            Insert
          </Button>
          {message && (
            <span
              className={`text-[12px] flex items-center gap-1 ${
                message.type === "success" ? "text-green-600" : "text-red-500"
              }`}
            >
              {message.type === "success" && <CheckCircle className="w-3 h-3" />}
              {message.text}
            </span>
          )}
          <span className="text-[10px] text-text-muted ml-auto">
            Buy/Sell auto-fill from NAV × (1 ± load). Override if needed.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
