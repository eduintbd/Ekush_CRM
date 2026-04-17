"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";

interface PendingBankRowProps {
  id: string;
  investorName: string;
  investorCode: string;
  chequeLeafUrl: string | null;
  bankName: string;
  accountNumber: string;
  branchName: string | null;
  routingNumber: string | null;
  createdAt: string;
}

export function PendingBankRow(props: PendingBankRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    bankName: props.bankName === "Pending Review" ? "" : props.bankName,
    accountNumber: props.accountNumber === "Pending Review" ? "" : props.accountNumber,
    branchName: props.branchName ?? "",
    routingNumber: props.routingNumber ?? "",
  });
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);
  const [error, setError] = useState("");

  const submit = async (action: "approve" | "reject") => {
    setError("");
    if (action === "approve" && (!form.bankName.trim() || !form.accountNumber.trim())) {
      setError("Bank name and account number are required to approve.");
      return;
    }
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/bank-accounts/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...form }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Action failed");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <TableRow>
        <TableCell className="text-[12px]">
          {new Date(props.createdAt).toLocaleDateString()}
        </TableCell>
        <TableCell className="text-[12px]">
          <div className="font-medium text-text-dark">{props.investorName}</div>
          <div className="font-mono text-[10px] text-text-body">{props.investorCode}</div>
        </TableCell>
        <TableCell>
          {props.chequeLeafUrl ? (
            <a href={props.chequeLeafUrl} target="_blank" rel="noopener noreferrer">
              <img src={props.chequeLeafUrl} alt="Cheque" className="w-16 h-10 object-cover rounded border" />
            </a>
          ) : (
            <span className="text-[11px] text-text-muted">No cheque</span>
          )}
        </TableCell>
        <TableCell className="text-[12px]">
          <div>{form.bankName || <span className="text-amber-600 italic">needs admin input</span>}</div>
          <div className="text-text-body text-[11px]">A/C: {form.accountNumber || "—"}</div>
        </TableCell>
        <TableCell>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing((p) => !p)}
            className="text-[11px]"
          >
            {editing ? "Hide" : "Fill / Edit"}
          </Button>
        </TableCell>
      </TableRow>
      {editing && (
        <TableRow className="bg-amber-50/60">
          <TableCell colSpan={5}>
            <div className="space-y-2 p-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[12px]">
                <input
                  placeholder="Bank name *"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  className="h-9 px-2 rounded border border-input-border"
                />
                <input
                  placeholder="Account number *"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  className="h-9 px-2 rounded border border-input-border"
                />
                <input
                  placeholder="Branch"
                  value={form.branchName}
                  onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                  className="h-9 px-2 rounded border border-input-border"
                />
                <input
                  placeholder="Routing"
                  value={form.routingNumber}
                  onChange={(e) => setForm({ ...form, routingNumber: e.target.value })}
                  className="h-9 px-2 rounded border border-input-border"
                />
              </div>
              {error && <p className="text-red-500 text-[11px]">{error}</p>}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => submit("approve")}
                  disabled={busy !== null}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {busy === "approve" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                  Approve as Secondary
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => submit("reject")}
                  disabled={busy !== null}
                  className="border-red-400 text-red-600 hover:bg-red-50"
                >
                  {busy === "reject" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                  Reject
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
