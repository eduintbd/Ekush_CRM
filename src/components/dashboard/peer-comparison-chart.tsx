"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import { Plus, X, Search, ChevronDown } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Fund data from UCB Weekly Mutual Fund Review (April 9, 2026)       */
/* ------------------------------------------------------------------ */

interface FundReturn {
  name: string;
  short: string;
  oneYear: number | null;
  twoYear: number | null;
  isEkush: boolean;
}

// All open-end funds from the PDF
const ALL_FUNDS: FundReturn[] = [
  // Ekush funds
  { name: "Ekush First Unit Fund", short: "Ekush EFUF", oneYear: 20.5, twoYear: 33.8, isEkush: true },
  { name: "Ekush Growth Fund", short: "Ekush EGF", oneYear: 21.8, twoYear: 35.6, isEkush: true },
  { name: "Ekush Stable Return Fund", short: "Ekush ESRF", oneYear: 14.9, twoYear: 30.6, isEkush: true },

  // All peer funds from the PDF
  { name: "3i AMCL 1st Mutual Fund", short: "3i AMCL", oneYear: -3.0, twoYear: null, isEkush: false },
  { name: "Alliance Sandhani Life Unit Fund", short: "Alliance Sandhani", oneYear: 2.3, twoYear: -8.7, isEkush: false },
  { name: "MTB Unit Fund", short: "MTB", oneYear: -0.4, twoYear: -8.3, isEkush: false },
  { name: "AAML Unit Fund", short: "AAML", oneYear: -10.9, twoYear: -32.5, isEkush: false },
  { name: "ATC Shariah Unit Fund", short: "ATC Shariah", oneYear: -10.7, twoYear: -20.9, isEkush: false },
  { name: "Blue-Wealth 1st Balanced Fund", short: "Blue-Wealth", oneYear: 8.6, twoYear: 11.9, isEkush: false },
  { name: "CandleStone Rupali Bank Growth Fund", short: "CandleStone Rupali", oneYear: 7.2, twoYear: -7.0, isEkush: false },
  { name: "CAPITEC Padma P.F. Shariah Unit Fund", short: "CAPITEC Padma", oneYear: 4.8, twoYear: -14.2, isEkush: false },
  { name: "CAPITEC Popular Life Unit Fund", short: "CAPITEC Popular", oneYear: 10.9, twoYear: 7.8, isEkush: false },
  { name: "CAPITEC-IBBL Shariah Unit Fund", short: "CAPITEC-IBBL", oneYear: 9.5, twoYear: -0.9, isEkush: false },
  { name: "CAPM Unit Fund", short: "CAPM", oneYear: 7.4, twoYear: -1.7, isEkush: false },
  { name: "Credence First Growth Fund", short: "Credence Growth", oneYear: 2.5, twoYear: -6.7, isEkush: false },
  { name: "Credence First Shariah Unit Fund", short: "Credence Shariah", oneYear: -0.7, twoYear: -13.5, isEkush: false },
  { name: "CWT Community Bank Shariah Fund", short: "CWT Community", oneYear: -0.3, twoYear: 0.5, isEkush: false },
  { name: "CWT Emerging BD FGF", short: "CWT Emerging", oneYear: 18.8, twoYear: 29.1, isEkush: false },
  { name: "CWT Opportunities Fund", short: "CWT Opportunities", oneYear: 6.7, twoYear: 33.0, isEkush: false },
  { name: "CWT Sadharan Bima Growth Fund", short: "CWT Sadharan", oneYear: 16.8, twoYear: 23.4, isEkush: false },
  { name: "EBL AML 1st Unit Fund", short: "EBL AML", oneYear: 18.4, twoYear: 15.4, isEkush: false },
  { name: "EDGE Al-Amin Shariah Consumer Fund", short: "EDGE Al-Amin", oneYear: 9.0, twoYear: 8.4, isEkush: false },
  { name: "EDGE AMC Growth Fund", short: "EDGE Growth", oneYear: 24.1, twoYear: 35.8, isEkush: false },
  { name: "EDGE Bangladesh Mutual Fund", short: "EDGE BD", oneYear: 24.5, twoYear: 36.0, isEkush: false },
  { name: "EDGE High Quality Income Fund", short: "EDGE HQ Income", oneYear: 16.2, twoYear: 32.0, isEkush: false },
  { name: "Green Delta Dragon Enhanced Blue Chip Growth Fund", short: "Green Delta Dragon", oneYear: 12.9, twoYear: 18.2, isEkush: false },
  { name: "HFAML Shariah Unit Fund", short: "HFAML Shariah", oneYear: 1.1, twoYear: -5.4, isEkush: false },
  { name: "HFAML Unit Fund", short: "HFAML", oneYear: 2.1, twoYear: -7.7, isEkush: false },
  { name: "HFAML-ACME Employees' Unit Fund", short: "HFAML-ACME", oneYear: 2.5, twoYear: -6.1, isEkush: false },
  { name: "Bangladesh Fund", short: "Bangladesh Fund", oneYear: 1.4, twoYear: -5.2, isEkush: false },
  { name: "Eighth ICB Unit Fund", short: "8th ICB", oneYear: 5.2, twoYear: 2.9, isEkush: false },
  { name: "Fifth ICB Unit Fund", short: "5th ICB", oneYear: 4.8, twoYear: -3.0, isEkush: false },
  { name: "First ICB Unit Fund", short: "1st ICB", oneYear: 2.9, twoYear: -9.7, isEkush: false },
  { name: "Fourth ICB Unit Fund", short: "4th ICB", oneYear: 3.0, twoYear: -10.0, isEkush: false },
  { name: "ICB AMCL Converted First Unit Fund", short: "ICB Converted 1st", oneYear: 2.1, twoYear: -4.9, isEkush: false },
  { name: "ICB AMCL Islamic Unit Fund", short: "ICB Islamic", oneYear: -0.9, twoYear: -8.8, isEkush: false },
  { name: "ICB AMCL Pension Holders' Unit Fund", short: "ICB Pension", oneYear: 4.8, twoYear: -7.3, isEkush: false },
  { name: "ICB AMCL Second NRB Unit Fund", short: "ICB 2nd NRB", oneYear: 2.9, twoYear: -2.9, isEkush: false },
  { name: "ICB AMCL Shotoborsho Unit Fund", short: "ICB Shotoborsho", oneYear: 0.1, twoYear: -1.8, isEkush: false },
  { name: "ICB AMCL Unit Fund", short: "ICB AMCL Unit", oneYear: 5.1, twoYear: 1.3, isEkush: false },
  { name: "Second ICB Unit Fund", short: "2nd ICB", oneYear: 7.8, twoYear: 1.2, isEkush: false },
  { name: "Seventh ICB Unit Fund", short: "7th ICB", oneYear: 1.4, twoYear: -7.5, isEkush: false },
  { name: "Sixth ICB Unit Fund", short: "6th ICB", oneYear: -2.0, twoYear: -11.3, isEkush: false },
  { name: "Third ICB Unit Fund", short: "3rd ICB", oneYear: 4.8, twoYear: 1.2, isEkush: false },
  { name: "IDLC AML Shariah Fund", short: "IDLC Shariah", oneYear: 2.7, twoYear: 7.6, isEkush: false },
  { name: "IDLC Balanced Fund", short: "IDLC Balanced", oneYear: 16.9, twoYear: 28.2, isEkush: false },
  { name: "IDLC Growth Fund", short: "IDLC Growth", oneYear: 16.4, twoYear: 27.0, isEkush: false },
  { name: "IDLC Income Fund", short: "IDLC Income", oneYear: 9.6, twoYear: 19.8, isEkush: false },
  { name: "BCB ICL Growth Fund", short: "BCB ICL Growth", oneYear: 17.2, twoYear: 30.6, isEkush: false },
  { name: "Esquire ICL Apparel", short: "Esquire ICL", oneYear: 14.0, twoYear: 28.2, isEkush: false },
  { name: "Grameen Bank - AIMS First Unit Fund", short: "Grameen-AIMS", oneYear: -0.1, twoYear: 18.1, isEkush: false },
  { name: "ICL Balanced Fund", short: "ICL Balanced", oneYear: 16.1, twoYear: 26.8, isEkush: false },
  { name: "ICL INCTL Shariah Fund", short: "ICL INCTL", oneYear: 3.1, twoYear: 5.4, isEkush: false },
  { name: "Investasia Balanced Unit Fund", short: "Investasia Bal", oneYear: 2.2, twoYear: 8.6, isEkush: false },
  { name: "Investasia Growth Fund", short: "Investasia Growth", oneYear: -8.6, twoYear: -10.4, isEkush: false },
  { name: "Investit Growth Fund", short: "Investit Growth", oneYear: 11.8, twoYear: null, isEkush: false },
  { name: "LankaBangla 1st Balanced Unit Fund", short: "LankaBangla Bal", oneYear: 9.3, twoYear: 12.8, isEkush: false },
  { name: "LankaBangla Al-Arafah Shariah Unit Fund", short: "LankaBangla Shariah", oneYear: 6.9, twoYear: 11.2, isEkush: false },
  { name: "LB Gratuity Opportunities Fund", short: "LB Gratuity Opp", oneYear: 15.0, twoYear: 18.8, isEkush: false },
  { name: "LB Gratuity Wealth Builder Fund", short: "LB Gratuity WB", oneYear: 6.2, twoYear: 2.2, isEkush: false },
  { name: "Mercantile Bank Unit Fund", short: "Mercantile Bank", oneYear: 10.7, twoYear: 15.0, isEkush: false },
  { name: "NAM IBBL Islamic Unit Fund", short: "NAM IBBL", oneYear: -5.9, twoYear: -31.0, isEkush: false },
  { name: "Peninsula AMCL BDBL Unit Fund One", short: "Peninsula BDBL", oneYear: 9.7, twoYear: 16.1, isEkush: false },
  { name: "Peninsula Balanced Fund", short: "Peninsula Bal", oneYear: 8.9, twoYear: 13.3, isEkush: false },
  { name: "Peninsula Sadharan Bima Corporation Unit Fund One", short: "Peninsula Sadharan", oneYear: 14.5, twoYear: 22.0, isEkush: false },
  { name: "Prime Finance Second Mutual Fund", short: "Prime Finance 2", oneYear: -7.0, twoYear: -16.8, isEkush: false },
  { name: "Prime Financial First Unit Fund", short: "Prime Financial 1", oneYear: -2.2, twoYear: -11.7, isEkush: false },
  { name: "Rupali Life Insurance First Mutual Fund", short: "Rupali Life", oneYear: -3.3, twoYear: -20.9, isEkush: false },
  { name: "RACE Financial Inclusion Unit Fund", short: "RACE Financial", oneYear: 7.8, twoYear: 6.0, isEkush: false },
  { name: "RACE Special Opportunities Unit Fund", short: "RACE Special Opp", oneYear: -10.8, twoYear: -19.5, isEkush: false },
  { name: "Sandhani AML SLIC Fixed Income Fund", short: "Sandhani SLIC", oneYear: 15.3, twoYear: 23.8, isEkush: false },
  { name: "SAML Income Unit Fund", short: "SAML Income", oneYear: 10.6, twoYear: 2.3, isEkush: false },
  { name: "Shanta Amanah Shariah Fund", short: "Shanta Amanah", oneYear: 3.9, twoYear: 0.2, isEkush: false },
  { name: "Shanta First Income Unit Fund", short: "Shanta 1st Income", oneYear: 5.8, twoYear: 0.3, isEkush: false },
  { name: "Shanta Fixed Income Fund", short: "Shanta FI", oneYear: 16.5, twoYear: 27.7, isEkush: false },
  { name: "UCB AML First Mutual Fund", short: "UCB AML 1st", oneYear: 9.3, twoYear: 20.2, isEkush: false },
  { name: "UCB Income Plus Fund", short: "UCB Income+", oneYear: 19.2, twoYear: 32.7, isEkush: false },
  { name: "UCB Taqwa Growth Fund", short: "UCB Taqwa", oneYear: 1.3, twoYear: 7.1, isEkush: false },
  { name: "Vanguard AML Growth Fund", short: "Vanguard Growth", oneYear: -4.4, twoYear: -14.0, isEkush: false },
  { name: "VIPB Accelerated Income Unit Fund", short: "VIPB Accelerated", oneYear: 17.6, twoYear: 28.8, isEkush: false },
  { name: "VIPB Balanced Fund", short: "VIPB Balanced", oneYear: 18.1, twoYear: 31.8, isEkush: false },
  { name: "VIPB Growth Fund", short: "VIPB Growth", oneYear: 17.0, twoYear: 28.0, isEkush: false },
  { name: "VIPB NLI 1st Unit Fund", short: "VIPB NLI", oneYear: 17.2, twoYear: 29.5, isEkush: false },
  { name: "VIPB SEBL 1st Unit Fund", short: "VIPB SEBL", oneYear: 11.6, twoYear: 24.7, isEkush: false },
  { name: "VIPB Fixed Income Fund", short: "VIPB FI", oneYear: null, twoYear: 22.9, isEkush: false },
  { name: "Zenith Annual Income Fund", short: "Zenith Income", oneYear: 6.7, twoYear: -3.9, isEkush: false },
];

// Default peers shown on first load
const DEFAULT_PEER_NAMES = [
  "EDGE Bangladesh Mutual Fund",
  "EDGE AMC Growth Fund",
  "CWT Emerging BD FGF",
  "UCB Income Plus Fund",
  "VIPB Balanced Fund",
  "IDLC Growth Fund",
];

const EKUSH_COLOR = "#2ecc71"; // emerald green
const PEER_COLOR = "#34495e"; // slate blue

/* ------------------------------------------------------------------ */
/*  Chart (dynamically imported)                                       */
/* ------------------------------------------------------------------ */

const RechartsChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        BarChart,
        Bar,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
        Cell,
      } = mod;

      return function ChartInner({
        data,
        dataKey,
      }: {
        data: FundReturn[];
        dataKey: "oneYear" | "twoYear";
      }) {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 10, left: 0, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EFF1F7" vertical={false} />
              <XAxis
                dataKey="short"
                tick={{ fontSize: 9, fill: "#828BB2" }}
                angle={-45}
                textAnchor="end"
                interval={0}
                height={80}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#828BB2" }}
                tickFormatter={(v: number) => `${v}%`}
                label={{
                  value: "Return (%)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "#828BB2" },
                }}
              />
              <Tooltip
                cursor={{ fill: "rgba(46, 204, 113, 0.08)" }}
                formatter={(v: any) => [
                  v == null ? "N/A" : `${Number(v).toFixed(1)}%`,
                  dataKey === "oneYear" ? "1-Year Return" : "2-Year Return",
                ]}
                labelFormatter={(label: any, payload: any) => {
                  const fund = payload?.[0]?.payload;
                  return fund?.name ?? label;
                }}
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid #e8ecef",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={entry.isEkush ? EKUSH_COLOR : PEER_COLOR}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  {
    loading: () => <div className="h-[300px] bg-page-bg animate-pulse rounded-[10px]" />,
    ssr: false,
  }
);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PeerComparisonChart() {
  const [period, setPeriod] = useState<"oneYear" | "twoYear">("oneYear");

  const defaultSelected = ALL_FUNDS.filter(
    (f) => f.isEkush || DEFAULT_PEER_NAMES.includes(f.name)
  ).map((f) => f.name);

  const [selectedNames, setSelectedNames] = useState<string[]>(defaultSelected);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [ekushOpen, setEkushOpen] = useState(false);
  const [peersOpen, setPeersOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  const toggleFund = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const removeFund = (name: string) => {
    setSelectedNames((prev) => prev.filter((n) => n !== name));
  };

  // Selected funds in the order they appear in ALL_FUNDS, filtered to only show ones with data for the selected period
  const chartData = ALL_FUNDS.filter(
    (f) => selectedNames.includes(f.name) && f[period] !== null
  );

  const filteredFunds = ALL_FUNDS.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-[10px] shadow-card p-6 h-full flex flex-col">
      {/* Title + period toggle */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div>
          <h3 className="text-[14px] font-semibold text-text-dark font-rajdhani leading-tight">
            Comparative Performance
          </h3>
          <p className="text-[11px] text-text-body mt-0.5">
            Ekush vs Market Peers (April 2026)
          </p>
        </div>
        <div className="flex rounded-lg bg-gray-100 p-0.5 shrink-0">
          <button
            onClick={() => setPeriod("oneYear")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
              period === "oneYear"
                ? "bg-white text-[#2ecc71] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            1 Year
          </button>
          <button
            onClick={() => setPeriod("twoYear")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
              period === "twoYear"
                ? "bg-white text-[#2ecc71] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            2 Year
          </button>
        </div>
      </div>

      {/* Grouped collapsible legend — click a group to see its funds */}
      <div className="relative mb-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Ekush Funds group */}
          {(() => {
            const ekushSelected = chartData.filter((f) => f.isEkush);
            return (
              <button
                onClick={() => {
                  setEkushOpen((o) => !o);
                  setPeersOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  ekushOpen
                    ? "bg-[#2ecc71]/10 border-[#2ecc71] text-[#1e8449]"
                    : "bg-white border-gray-200 text-gray-700 hover:border-[#2ecc71]"
                }`}
              >
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: EKUSH_COLOR }} />
                <span>Ekush Funds</span>
                <span className="text-[10px] opacity-70">({ekushSelected.length})</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${ekushOpen ? "rotate-180" : ""}`} />
              </button>
            );
          })()}

          {/* Market Peers group */}
          {(() => {
            const peerSelected = chartData.filter((f) => !f.isEkush);
            return (
              <button
                onClick={() => {
                  setPeersOpen((o) => !o);
                  setEkushOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  peersOpen
                    ? "bg-[#34495e]/10 border-[#34495e] text-[#2c3e50]"
                    : "bg-white border-gray-200 text-gray-700 hover:border-[#34495e]"
                }`}
              >
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PEER_COLOR }} />
                <span>Market Peers</span>
                <span className="text-[10px] opacity-70">({peerSelected.length})</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${peersOpen ? "rotate-180" : ""}`} />
              </button>
            );
          })()}

          <button
            onClick={() => {
              setPickerOpen((p) => !p);
              setEkushOpen(false);
              setPeersOpen(false);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-dashed border-gray-300 text-gray-500 hover:border-[#2ecc71] hover:text-[#2ecc71] transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add fund
          </button>
        </div>

        {/* Expanded Ekush funds chips */}
        {ekushOpen && (
          <div className="mt-2 p-2 bg-[#2ecc71]/5 rounded-lg border border-[#2ecc71]/20">
            <div className="flex flex-wrap gap-1.5">
              {chartData.filter((f) => f.isEkush).length === 0 ? (
                <span className="text-[10px] text-gray-400">No Ekush funds selected</span>
              ) : (
                chartData
                  .filter((f) => f.isEkush)
                  .map((f) => (
                    <span
                      key={f.name}
                      className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium bg-white border border-[#2ecc71]/30 text-[#1e8449]"
                    >
                      {f.short}
                      <button
                        onClick={() => removeFund(f.name)}
                        className="hover:bg-[#2ecc71]/10 rounded-full p-0.5 transition-colors"
                        title={`Remove ${f.short}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))
              )}
            </div>
          </div>
        )}

        {/* Expanded Market Peers chips */}
        {peersOpen && (
          <div className="mt-2 p-2 bg-[#34495e]/5 rounded-lg border border-[#34495e]/20">
            <div className="flex flex-wrap gap-1.5">
              {chartData.filter((f) => !f.isEkush).length === 0 ? (
                <span className="text-[10px] text-gray-400">No market peers selected</span>
              ) : (
                chartData
                  .filter((f) => !f.isEkush)
                  .map((f) => (
                    <span
                      key={f.name}
                      className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium bg-white border border-[#34495e]/30 text-[#2c3e50]"
                    >
                      {f.short}
                      <button
                        onClick={() => removeFund(f.name)}
                        className="hover:bg-[#34495e]/10 rounded-full p-0.5 transition-colors"
                        title={`Remove ${f.short}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))
              )}
            </div>
          </div>
        )}

        {/* Fund picker dropdown */}
        {pickerOpen && (
          <div
            ref={pickerRef}
            className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 flex flex-col"
          >
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search funds..."
                  className="w-full pl-7 pr-2 py-1.5 text-[11px] rounded border border-gray-200 focus:outline-none focus:border-[#2ecc71]"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredFunds.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-4">No funds found</p>
              ) : (
                filteredFunds.map((f) => {
                  const selected = selectedNames.includes(f.name);
                  return (
                    <button
                      key={f.name}
                      onClick={() => toggleFund(f.name)}
                      className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center justify-between hover:bg-gray-50 transition-colors ${
                        selected ? "bg-[#2ecc71]/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${
                            selected
                              ? "bg-[#2ecc71] border-[#2ecc71]"
                              : "border-gray-300"
                          }`}
                        >
                          {selected && (
                            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 10 10">
                              <path
                                d="M1 5l3 3 5-6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <span className={`truncate ${f.isEkush ? "font-semibold text-[#1e8449]" : "text-gray-700"}`}>
                          {f.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[10px] text-gray-500">
                        {f.oneYear != null && <span>1Y: {f.oneYear}%</span>}
                        {f.twoYear != null && <span>2Y: {f.twoYear}%</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="px-3 py-1.5 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
              <span>{selectedNames.length} selected</span>
              <button
                onClick={() => setPickerOpen(false)}
                className="text-[#2ecc71] font-medium hover:underline"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1">
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
            No funds selected. Click &quot;Add fund&quot; to start comparing.
          </div>
        ) : (
          <RechartsChart data={chartData} dataKey={period} />
        )}
      </div>

      <p className="text-[9px] text-text-muted mt-2 text-center">
        Source: UCB Weekly Mutual Fund Review, April 9, 2026
      </p>
    </div>
  );
}
