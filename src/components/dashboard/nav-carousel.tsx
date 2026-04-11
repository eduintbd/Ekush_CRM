"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { NavTrendChart } from "./nav-trend-chart";

interface NavPoint {
  date: string;
  nav: number;
}

interface FundData {
  id: string;
  code: string;
  name: string;
  currentNav: number;
  data: NavPoint[];
}

interface Props {
  funds: FundData[];
}

const FUND_COLORS: Record<string, string> = {
  EFUF: "#1e40af", // blue
  EGF: "#059669",  // emerald green
  ESRF: "#7c3aed", // violet
};

export function NavCarousel({ funds }: Props) {
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay || funds.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % funds.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [autoPlay, funds.length]);

  if (funds.length === 0) {
    return (
      <div className="bg-white rounded-[10px] shadow-card p-6 h-full flex items-center justify-center">
        <p className="text-text-muted text-sm">No fund data available.</p>
      </div>
    );
  }

  const currentFund = funds[index];
  const color = FUND_COLORS[currentFund.code] ?? "#F27023";

  const prev = () => {
    setIndex((i) => (i - 1 + funds.length) % funds.length);
    setAutoPlay(false);
  };

  const next = () => {
    setIndex((i) => (i + 1) % funds.length);
    setAutoPlay(false);
  };

  return (
    <div className="relative h-full">
      <NavTrendChart
        key={currentFund.code}
        fundCode={currentFund.code}
        fundName={currentFund.name}
        currentNav={currentFund.currentNav}
        data={currentFund.data}
        color={color}
        height={260}
      />

      {/* Carousel controls */}
      <div className="absolute top-1/2 -translate-y-1/2 left-2">
        <button
          onClick={prev}
          className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Previous fund"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-2">
        <button
          onClick={next}
          className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Next fund"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Dots + play/pause */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
        <div className="flex items-center gap-1.5">
          {funds.map((f, i) => (
            <button
              key={f.code}
              onClick={() => {
                setIndex(i);
                setAutoPlay(false);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6" : "w-1.5 bg-gray-300"
              }`}
              style={i === index ? { backgroundColor: FUND_COLORS[f.code] ?? "#F27023" } : undefined}
              aria-label={`Go to ${f.code}`}
            />
          ))}
        </div>
        <button
          onClick={() => setAutoPlay((p) => !p)}
          className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label={autoPlay ? "Pause" : "Play"}
        >
          {autoPlay ? (
            <Pause className="w-3 h-3 text-gray-500" />
          ) : (
            <Play className="w-3 h-3 text-gray-500" />
          )}
        </button>
      </div>
    </div>
  );
}
