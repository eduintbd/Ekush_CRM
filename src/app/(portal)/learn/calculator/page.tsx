"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calculator, TrendingUp } from "lucide-react";

export default function CalculatorPage() {
  const [sipAmount, setSipAmount] = useState("5000");
  const [sipYears, setSipYears] = useState("10");
  const [sipReturn, setSipReturn] = useState("12");

  const [lumpAmount, setLumpAmount] = useState("100000");
  const [lumpYears, setLumpYears] = useState("10");
  const [lumpReturn, setLumpReturn] = useState("12");

  // SIP calculation
  const sipMonthly = parseFloat(sipAmount) || 0;
  const sipMonths = (parseFloat(sipYears) || 0) * 12;
  const sipRate = (parseFloat(sipReturn) || 0) / 100 / 12;
  const sipFuture = sipRate > 0
    ? sipMonthly * ((Math.pow(1 + sipRate, sipMonths) - 1) / sipRate) * (1 + sipRate)
    : sipMonthly * sipMonths;
  const sipInvested = sipMonthly * sipMonths;
  const sipGain = sipFuture - sipInvested;

  // Lump sum calculation
  const lumpPrincipal = parseFloat(lumpAmount) || 0;
  const lumpY = parseFloat(lumpYears) || 0;
  const lumpR = (parseFloat(lumpReturn) || 0) / 100;
  const lumpFuture = lumpPrincipal * Math.pow(1 + lumpR, lumpY);
  const lumpGain = lumpFuture - lumpPrincipal;

  const fmt = (n: number) => `${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Investment Calculators</h1>
        <p className="text-sm text-gray-500">Estimate your returns with SIP and lump sum investments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SIP Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-5 h-5" /> SIP Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Monthly SIP Amount (BDT)" type="number" value={sipAmount} onChange={(e) => setSipAmount(e.target.value)} min="100" />
            <Input label="Investment Period (Years)" type="number" value={sipYears} onChange={(e) => setSipYears(e.target.value)} min="1" max="50" />
            <Input label="Expected Annual Return (%)" type="number" value={sipReturn} onChange={(e) => setSipReturn(e.target.value)} min="1" max="50" />

            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Invested</span>
                <span className="font-semibold">{fmt(sipInvested)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estimated Returns</span>
                <span className="font-semibold text-green-600">{fmt(sipGain)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
                <span className="text-gray-800 font-medium">Total Value</span>
                <span className="font-bold text-lg text-blue-800">{fmt(sipFuture)}</span>
              </div>
            </div>

            {/* Visual bar */}
            <div className="h-6 rounded-full overflow-hidden bg-gray-200 flex">
              <div className="bg-blue-500 h-full" style={{ width: `${sipFuture > 0 ? (sipInvested / sipFuture) * 100 : 50}%` }} />
              <div className="bg-green-500 h-full flex-1" />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Invested: {((sipInvested / (sipFuture || 1)) * 100).toFixed(0)}%</span>
              <span>Returns: {((sipGain / (sipFuture || 1)) * 100).toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Lump Sum Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Lump Sum Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Investment Amount (BDT)" type="number" value={lumpAmount} onChange={(e) => setLumpAmount(e.target.value)} min="1000" />
            <Input label="Investment Period (Years)" type="number" value={lumpYears} onChange={(e) => setLumpYears(e.target.value)} min="1" max="50" />
            <Input label="Expected Annual Return (%)" type="number" value={lumpReturn} onChange={(e) => setLumpReturn(e.target.value)} min="1" max="50" />

            <div className="bg-violet-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Principal</span>
                <span className="font-semibold">{fmt(lumpPrincipal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estimated Returns</span>
                <span className="font-semibold text-green-600">{fmt(lumpGain)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-violet-200">
                <span className="text-gray-800 font-medium">Total Value</span>
                <span className="font-bold text-lg text-violet-800">{fmt(lumpFuture)}</span>
              </div>
            </div>

            <div className="h-6 rounded-full overflow-hidden bg-gray-200 flex">
              <div className="bg-violet-500 h-full" style={{ width: `${lumpFuture > 0 ? (lumpPrincipal / lumpFuture) * 100 : 50}%` }} />
              <div className="bg-green-500 h-full flex-1" />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Principal: {((lumpPrincipal / (lumpFuture || 1)) * 100).toFixed(0)}%</span>
              <span>Returns: {((lumpGain / (lumpFuture || 1)) * 100).toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 text-center">
        These calculators provide estimates only. Actual returns may vary based on market conditions. Past performance does not guarantee future results.
      </p>
    </div>
  );
}
