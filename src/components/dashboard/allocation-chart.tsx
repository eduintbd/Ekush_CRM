"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Fund allocation card.
 *
 * Self-contained: owns its own white card chrome (border + radius +
 * padding) so the parent only needs `<AllocationChart funds={...}
 * asOfDate={...} />`. The header row sits inside the card with the
 * sentence-case title on the left and a muted "as of …" date pill
 * on the right.
 *
 * Renders a hand-rolled SVG donut with three slices, direct labels
 * attached by 1px leader lines (straight for the dominant slice,
 * bent for the smaller two), and a center "Total / N funds" stack.
 * Hovering a slice scales it slightly, dims the others to 30%, and
 * floats a tooltip near the cursor with the full fund name +
 * percentage + BDT amount.
 *
 * Below ~480px the SVG is hidden and a tight horizontal swatch row
 * (● EGF 87.4%   ● EFUF 8.9%   ● ESRF 3.7%) takes its place. The
 * caption hint flips between "Hover" and "Tap" depending on
 * (pointer: coarse).
 *
 * Recharts isn't a fit here — its Pie label / interaction model
 * doesn't get the leader-line + scale-and-dim spec without a lot
 * of custom render work. Plain SVG keeps the component lighter
 * and the layout exactly controllable.
 */

interface Fund {
  fundCode: string;
  fundName: string;
  marketValue: number;
  weight: number;
}

interface Props {
  funds: Fund[];
  asOfDate?: string | Date;
}

// Per-fund palette. Falls back through this list for any code that
// isn't named explicitly so future funds still render with distinct
// hues instead of all sharing one color.
const COLOR_BY_CODE: Record<string, string> = {
  EGF: "#639922",
  EFUF: "#E24B4A",
  ESRF: "#378ADD",
};
const FALLBACK_COLORS = ["#FB8C00", "#8E24AA", "#00897B", "#5E35B1"];

// Donut geometry — viewBox 360 wide × 240 tall, donut centered
// horizontally with room on either side for label columns.
const VB_W = 360;
const VB_H = 240;
const CX = 180;
const CY = 120;
const R_OUT = 80;
const R_IN = 52;

type Slice = {
  code: string;
  name: string;
  weight: number;
  value: number;
  color: string;
  start: number; // radians
  end: number;
  mid: number;
};

function arcPath(
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  start: number,
  end: number,
): string {
  // SVG arcs need start/end coordinates plus a large-arc flag. We
  // use sweep flag 1 for the outer arc (clockwise) and 0 for the
  // inner arc (counter-clockwise) so the donut hole renders right.
  const x1 = cx + rOut * Math.cos(start);
  const y1 = cy + rOut * Math.sin(start);
  const x2 = cx + rOut * Math.cos(end);
  const y2 = cy + rOut * Math.sin(end);
  const x3 = cx + rIn * Math.cos(end);
  const y3 = cy + rIn * Math.sin(end);
  const x4 = cx + rIn * Math.cos(start);
  const y4 = cy + rIn * Math.sin(start);
  const large = end - start > Math.PI ? 1 : 0;
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function fmtBdt(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

function fmtAsOf(value: string | Date | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AllocationChart({ funds, asOfDate }: Props) {
  const slices = useMemo<Slice[]>(() => {
    const filtered = funds.filter((f) => f.marketValue > 0);
    if (filtered.length === 0) return [];
    // Start at 6 o'clock (donut "upside down") so the small slices —
    // which always trail the dominant one in clockwise order —
    // land in the lower-right quadrant, right next to where their
    // labels sit on the right rail. Eliminates the long diagonal
    // leader that previously crossed the donut interior to reach
    // a bottom-left label.
    let cursor = Math.PI / 2;
    let fallbackIdx = 0;
    return filtered.map((f) => {
      const sweep = (f.weight / 100) * 2 * Math.PI;
      const start = cursor;
      const end = cursor + sweep;
      cursor = end;
      const color =
        COLOR_BY_CODE[f.fundCode] ??
        FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length];
      return {
        code: f.fundCode,
        name: f.fundName,
        weight: f.weight,
        value: f.marketValue,
        color,
        start,
        end,
        mid: (start + end) / 2,
      };
    });
  }, [funds]);

  // Indices sorted by weight desc — biggest slice claims the
  // straight-horizontal-right label slot; the rest stack on the
  // left side with bent leaders.
  const labelOrder = useMemo(
    () =>
      slices
        .map((s, i) => ({ i, w: s.weight }))
        .sort((a, b) => b.w - a.w)
        .map((x) => x.i),
    [slices],
  );

  // Hover / focus state. Single integer so hover and tap both flow
  // through one path. setActive(null) → idle.
  const [active, setActive] = useState<number | null>(null);
  // Cursor position for the floating tooltip (relative to the SVG
  // container). Updated on mousemove over a slice.
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Coarse-pointer detection. Drives the caption text and means
  // hover-only behaviour collapses to tap on touch devices.
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Tap-anywhere-to-deselect on touch devices.
  useEffect(() => {
    if (!isTouch || active === null) return;
    function onDocTap(e: MouseEvent) {
      if (
        containerRef.current &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        setActive(null);
        setTip(null);
      }
    }
    document.addEventListener("mousedown", onDocTap);
    return () => document.removeEventListener("mousedown", onDocTap);
  }, [isTouch, active]);

  if (slices.length === 0) {
    return (
      <div className="rounded-[12px] border border-gray-200 bg-white p-5">
        <p className="text-text-muted text-sm text-center py-10">
          No data available
        </p>
      </div>
    );
  }

  const totalValue = slices.reduce((s, x) => s + x.value, 0);
  const asOfLabel = fmtAsOf(asOfDate);

  function handleEnter(i: number, e: React.MouseEvent) {
    if (isTouch) return;
    setActive(i);
    updateTip(e);
  }
  function handleMove(e: React.MouseEvent) {
    if (isTouch) return;
    if (active === null) return;
    updateTip(e);
  }
  function handleLeave() {
    if (isTouch) return;
    setActive(null);
    setTip(null);
  }
  function handleTap(i: number, e: React.MouseEvent) {
    if (!isTouch) return;
    if (active === i) {
      setActive(null);
      setTip(null);
    } else {
      setActive(i);
      updateTip(e);
    }
  }
  function updateTip(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div className="rounded-[12px] border border-gray-200 bg-white p-4 px-5">
      {/* Header — sentence case title left, muted as-of date right */}
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-medium text-text-dark">
          Fund allocation
        </h3>
        {asOfLabel && (
          <p className="text-[12px] text-text-muted">as of {asOfLabel}</p>
        )}
      </div>

      {/* Donut + labels (≥ sm) — hidden on narrow viewports in favor
          of the swatch row below. */}
      <div
        ref={containerRef}
        className="relative mt-3 hidden sm:block"
        onMouseLeave={handleLeave}
      >
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Fund allocation donut"
        >
          {/* Slices */}
          {slices.map((s, i) => {
            const dimmed = active !== null && active !== i;
            return (
              <path
                key={s.code}
                d={arcPath(CX, CY, R_OUT, R_IN, s.start, s.end)}
                fill={s.color}
                style={{
                  opacity: dimmed ? 0.3 : 1,
                  transform: active === i ? "scale(1.03)" : "scale(1)",
                  transformOrigin: `${CX}px ${CY}px`,
                  transition: "opacity 0.15s ease-out, transform 0.15s ease-out",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => handleEnter(i, e)}
                onMouseMove={handleMove}
                onClick={(e) => handleTap(i, e)}
              />
            );
          })}

          {/* Center stack — small "Total" label on top, bolder count
              underneath. Pointer-events:none so cursor passes through
              to the slices below. */}
          <text
            x={CX}
            y={CY - 6}
            textAnchor="middle"
            className="fill-text-muted"
            style={{ fontSize: 10, pointerEvents: "none" }}
          >
            Total
          </text>
          <text
            x={CX}
            y={CY + 12}
            textAnchor="middle"
            className="fill-text-dark"
            style={{ fontSize: 14, fontWeight: 500, pointerEvents: "none" }}
          >
            {slices.length} funds
          </text>

          {/* Labels + leader lines. Largest slice gets a straight
              horizontal leader to the right at center y; remaining
              slices stack on the left with bent leaders. */}
          {labelOrder.map((i, rank) => {
            const s = slices[i];
            const dimmed = active !== null && active !== i;
            const isPrimary = rank === 0;

            // Leader anchor — straight rightward for primary, slice
            // mid-edge for the rest.
            let anchorX: number;
            let anchorY: number;
            let labelX: number;
            let labelY: number;
            let polyPoints: string;
            let textAnchor: "start" | "end";

            // Donut starts at 6 o'clock so the dominant slice covers
            // the entire left half + most of right; the two small
            // slices cluster in the lower-right quadrant. All three
            // labels live on the right rail at y-positions that
            // track each slice's actual position — leaders stay
            // short and never cross the donut interior.
            if (isPrimary) {
              anchorX = CX + R_OUT;
              anchorY = CY;
              labelX = VB_W - 8;
              labelY = CY;
              polyPoints = `${anchorX},${anchorY} ${labelX - 4},${labelY}`;
              textAnchor = "end";
            } else {
              anchorX = CX + R_OUT * Math.cos(s.mid);
              anchorY = CY + R_OUT * Math.sin(s.mid);
              const elbowX = anchorX + 14 * Math.cos(s.mid);
              const elbowY = anchorY + 14 * Math.sin(s.mid);
              // Slot Y tracks the slice mid; clamped so the label
              // box always stays inside the viewBox even if the
              // slice mid sits very close to top or bottom.
              const slotY = Math.max(40, Math.min(VB_H - 22, anchorY + 4));
              labelX = VB_W - 8;
              labelY = slotY;
              polyPoints = `${anchorX},${anchorY} ${elbowX},${elbowY} ${labelX - 60},${labelY}`;
              textAnchor = "end";
            }

            return (
              <g
                key={`${s.code}-label`}
                style={{
                  opacity: dimmed ? 0.3 : 1,
                  transition: "opacity 0.15s ease-out",
                }}
              >
                <polyline
                  points={polyPoints}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={1}
                />
                <text
                  x={labelX}
                  y={labelY - 4}
                  textAnchor={textAnchor}
                  className="fill-text-dark"
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  {s.code}
                </text>
                <text
                  x={labelX}
                  y={labelY + 12}
                  textAnchor={textAnchor}
                  className="fill-text-body"
                  style={{ fontSize: 12 }}
                >
                  {s.weight.toFixed(1)}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip — absolutely positioned over the SVG, follows cursor.
            Translated up-right of the cursor so it doesn't sit under it. */}
        {tip && active !== null && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-[12px] shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
            style={{
              left: tip.x + 12,
              top: tip.y - 10,
              transition: "opacity 0.15s ease-out",
              minWidth: 160,
            }}
          >
            <p className="font-medium text-text-dark">
              {slices[active].code}
              <span className="text-text-body font-normal">
                {" — "}
                {slices[active].name}
              </span>
            </p>
            <p className="mt-0.5 text-text-body">
              {slices[active].weight.toFixed(1)}% · BDT {fmtBdt(slices[active].value)}
            </p>
          </div>
        )}
      </div>

      {/* Mobile fallback — tight inline swatch row, no leader lines.
          Each entry is the slice color dot + ticker + percent. */}
      <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:hidden">
        {slices.map((s) => (
          <li key={s.code} className="flex items-center gap-1.5 text-[13px]">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-text-dark">{s.code}</span>
            <span className="text-text-body">{s.weight.toFixed(1)}%</span>
          </li>
        ))}
      </ul>

      {/* Caption hint — flips wording on touch */}
      <p className="mt-3 text-[11px] text-text-muted text-center">
        {isTouch ? "Tap" : "Hover"} a slice for details
      </p>
    </div>
  );
}
