"use client";

import { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { STAFF_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, type StaffRole } from "@/lib/roles";

export function InviteDialog({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("VIEWER");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFullName("");
    setEmail("");
    setRole("VIEWER");
    setNote("");
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!fullName.trim() || !email.trim()) {
      setError("Full name and email are required.");
      return;
    }
    if (!/@ekushwml\.com$/i.test(email.trim())) {
      setError("Email must be on the @ekushwml.com domain.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim().toLowerCase(), role, note: note.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invitation failed");
        return;
      }
      onSent();
      reset();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }} ariaLabel="Invite team member">
      <DialogHeader>
        <DialogTitle>Invite a team member</DialogTitle>
        <p className="text-[13px] text-text-body mt-1">
          They'll receive an email with a one-time link to set their password. The link expires in 24 hours.
        </p>
      </DialogHeader>
      <DialogBody>
        {error && (
          <div className="bg-red-50 text-red-600 text-[13px] p-3 rounded-md mb-4 border border-red-200">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Asif Rahman" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@ekushwml.com" />
          <div>
            <label className="text-[14px] font-medium text-text-label block mb-2">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {STAFF_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r as StaffRole)}
                  className={
                    "text-left p-3 rounded-md border-2 transition-colors " +
                    (role === r
                      ? "border-ekush-orange bg-orange-50"
                      : "border-input-border bg-white hover:border-ekush-orange/40")
                  }
                >
                  <p className="text-[13px] font-semibold text-text-dark">{ROLE_LABELS[r as StaffRole]}</p>
                  <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                    {ROLE_DESCRIPTIONS[r as StaffRole]}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[14px] font-medium text-text-label block mb-2">
              Note <span className="text-[11px] text-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Anything you'd like to tell them…"
              className="w-full rounded-[5px] border border-input-border bg-input-bg px-4 py-2 text-[14px] text-text-dark focus:border-ekush-orange focus:outline-none"
            />
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Send invitation
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
