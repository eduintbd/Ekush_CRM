"use client";

import { Fragment, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatBDT, formatNumber } from "@/lib/utils";
import { Plus, Minus } from "lucide-react";

export interface HoldingRow {
  id: string;
  fundCode: string;
  fundName: string;
  totalCurrentUnits: number;
  sipCurrentUnits: number;
  avgCost: number;
  costValue: number;
  sipMarketValue: number;
  nav: number;
  marketValue: number;
  grossDividend: number;
  realizedGain: number;
  unrealizedGain: number;
  realizedGainTaxPeriod: number;
  annualizedReturn: number;
}

interface Props {
  holdings: HoldingRow[];
}

export function PortfolioStatementsTable({ holdings }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalCost = holdings.reduce((s, h) => s + h.costValue, 0);
  const totalMv = holdings.reduce((s, h) => s + h.marketValue, 0);
  const totalRealized = holdings.reduce((s, h) => s + h.realizedGain, 0);
  const totalUnrealized = holdings.reduce((s, h) => s + h.unrealizedGain, 0);

  const toggle = (id: string) => setExpanded((curr) => (curr === id ? null : id));

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-0 hover:bg-transparent">
          <TableHead>Fund</TableHead>
          <TableHead className="text-right">Cost Value</TableHead>
          <TableHead className="text-right">Market Value</TableHead>
          <TableHead className="text-right">Realized Gain</TableHead>
          <TableHead className="text-right">Unrealized Gain</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.map((h) => {
          const isOpen = expanded === h.id;
          return (
            <Fragment key={h.id}>
              <TableRow>
                <TableCell className="font-medium text-text-dark">{h.fundCode}</TableCell>
                <TableCell className="text-right">{formatBDT(h.costValue)}</TableCell>
                <TableCell className="text-right">{formatBDT(h.marketValue)}</TableCell>
                <TableCell className={`text-right ${h.realizedGain >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatBDT(h.realizedGain)}
                </TableCell>
                <TableCell className={`text-right ${h.unrealizedGain >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatBDT(h.unrealizedGain)}
                </TableCell>
                <TableCell className="text-center">
                  <button
                    type="button"
                    onClick={() => toggle(h.id)}
                    className="p-1 rounded hover:bg-page-bg transition-colors"
                    aria-label={isOpen ? "Collapse" : "Expand"}
                  >
                    {isOpen ? (
                      <Minus className="w-4 h-4 text-ekush-orange" />
                    ) : (
                      <Plus className="w-4 h-4 text-text-body hover:text-ekush-orange" />
                    )}
                  </button>
                </TableCell>
              </TableRow>

              {isOpen && (
                <TableRow className="bg-page-bg/40 hover:bg-page-bg/40">
                  <TableCell colSpan={6} className="p-0">
                    <div className="px-8 py-6">
                      <p className="text-[13px] font-semibold text-text-dark mb-3">{h.fundName}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 text-[13px]">
                        <DetailRow label="No of Units" value={formatNumber(h.totalCurrentUnits, 0)} />
                        <DetailRow label="Total Cost Value" value={formatBDT(h.costValue)} />
                        <DetailRow label="CIP Units" value={formatNumber(h.sipCurrentUnits, 0)} />
                        <DetailRow label="CIP Unit Value" value={formatBDT(h.sipMarketValue)} />
                        <DetailRow label="Unit Cost" value={h.avgCost.toFixed(2)} />
                        <DetailRow label="NAV" value={h.nav.toFixed(2)} />
                        <DetailRow label="Total Market Value" value={formatBDT(h.marketValue)} />
                        <DetailRow label="Dividend" value={formatBDT(h.grossDividend)} />
                        <DetailRow
                          label="Unrealized Gain"
                          value={formatBDT(h.unrealizedGain)}
                          valueClass={h.unrealizedGain >= 0 ? "text-green-500" : "text-red-500"}
                        />
                        <DetailRow
                          label="Realized Gain during this Tax Period"
                          value={formatBDT(h.realizedGainTaxPeriod)}
                          valueClass={h.realizedGainTaxPeriod >= 0 ? "text-green-500" : "text-red-500"}
                        />
                        <DetailRow
                          label="Annualized Return"
                          value={`${h.annualizedReturn.toFixed(1)}%`}
                          italic
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}

        <TableRow className="bg-page-bg">
          <TableCell className="font-semibold text-text-dark">Total</TableCell>
          <TableCell className="text-right font-semibold">{formatBDT(totalCost)}</TableCell>
          <TableCell className="text-right font-semibold">{formatBDT(totalMv)}</TableCell>
          <TableCell className={`text-right font-semibold ${totalRealized >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatBDT(totalRealized)}
          </TableCell>
          <TableCell className={`text-right font-semibold ${totalUnrealized >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatBDT(totalUnrealized)}
          </TableCell>
          <TableCell></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function DetailRow({
  label,
  value,
  bold,
  italic,
  valueClass,
}: {
  label: string;
  value: string;
  bold?: boolean;
  italic?: boolean;
  valueClass?: string;
}) {
  const labelCls = `${italic ? "italic " : ""}${bold ? "font-semibold text-text-dark" : "text-text-body"}`;
  const valCls = `text-right ${italic ? "italic " : ""}${bold ? "font-semibold text-text-dark" : "text-text-dark"} ${valueClass ?? ""}`;
  return (
    <div className="flex justify-between border-b border-text-body/10 py-1.5">
      <span className={labelCls}>{label}</span>
      <span className={valCls}>{value}</span>
    </div>
  );
}
