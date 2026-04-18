"use client";

import { useState } from "react";
import { Upload, Repeat, Check } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type PaymentMethod = "MANUAL" | "DDI";

interface PaymentMethodDialogProps {
  open: boolean;
  amount: number;
  onCancel: () => void;
  onContinue: (method: PaymentMethod) => void;
}

export function PaymentMethodDialog({
  open,
  amount,
  onCancel,
  onContinue,
}: PaymentMethodDialogProps) {
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const formattedAmount = new Intl.NumberFormat("en-IN").format(amount);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onCancel()}
      ariaLabel="Choose payment method"
    >
      <DialogHeader>
        <DialogTitle>How would you like to pay?</DialogTitle>
        <p className="text-[13px] text-text-body mt-1">
          Choose a payment method for your investment of{" "}
          <strong className="text-text-dark">BDT {formattedAmount}</strong>.
        </p>
      </DialogHeader>

      <DialogBody>
        <div
          role="radiogroup"
          aria-label="Payment method"
          className="grid gap-3 md:grid-cols-2"
        >
          <MethodCard
            icon={<Upload className="w-5 h-5" />}
            title="Pay Manually"
            description="Transfer the amount yourself to our collection bank account and upload the deposit slip."
            meta="Best for one-time investments"
            subMeta="You'll need a bank transfer receipt or cheque deposit slip"
            selected={selected === "MANUAL"}
            onSelect={() => setSelected("MANUAL")}
          />
          <MethodCard
            icon={<Repeat className="w-5 h-5" />}
            title="Authorize Direct Debit (DDI)"
            description="Allow Ekush to auto-debit your registered bank account for this purchase."
            meta="No manual transfer needed"
            subMeta="Signature on file is used to authorize the debit"
            selected={selected === "DDI"}
            onSelect={() => setSelected("DDI")}
          />
        </div>
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!selected}
          onClick={() => selected && onContinue(selected)}
        >
          Continue
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

interface MethodCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  meta: string;
  subMeta: string;
  selected: boolean;
  onSelect: () => void;
}

function MethodCard({
  icon,
  title,
  description,
  meta,
  subMeta,
  selected,
  onSelect,
}: MethodCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={
        "relative text-left p-4 rounded-[10px] border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ekush-orange/40 " +
        (selected
          ? "border-ekush-orange bg-orange-50"
          : "border-gray-200 hover:border-gray-300 bg-white")
      }
    >
      {selected && (
        <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-ekush-orange text-white flex items-center justify-center">
          <Check className="w-3 h-3" />
        </span>
      )}
      <div className="w-9 h-9 rounded-[8px] bg-orange-100 text-ekush-orange flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-[14px] text-text-dark mb-1">{title}</h3>
      <p className="text-[12px] text-text-body mb-2 leading-relaxed">
        {description}
      </p>
      <p className="text-[11px] font-medium text-ekush-orange">{meta}</p>
      <p className="text-[11px] text-text-muted mt-0.5">{subMeta}</p>
    </button>
  );
}
