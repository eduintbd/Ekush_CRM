"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="shadow-card rounded-[10px] border border-amber-300 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-amber-50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="w-5 h-5 text-ekush-orange" />
          ) : (
            <ChevronRight className="w-5 h-5 text-ekush-orange" />
          )}
          <span className="text-[15px] font-semibold font-rajdhani text-text-dark">{title}</span>
        </div>
        {subtitle && <span className="text-[12px] text-text-body">{subtitle}</span>}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
