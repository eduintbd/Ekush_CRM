"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, Clock, FileText } from "lucide-react";

interface Approval {
  id: string;
  entityType: string;
  entityId: string;
  makerId: string;
  checkerId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  details: any;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  const fetchApprovals = () => {
    setLoading(true);
    fetch("/api/admin/approvals")
      .then(r => r.json())
      .then(setApprovals)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchApprovals(); }, []);

  const handleAction = async (approvalId: string, action: "approve" | "reject") => {
    setActionLoading(approvalId);
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, action, notes: rejectNotes[approvalId] || "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Action failed");
      } else {
        fetchApprovals();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const pending = approvals.filter(a => a.status === "PENDING");
  const processed = approvals.filter(a => a.status !== "PENDING");

  const statusVariant = (s: string) => {
    if (s === "APPROVED") return "success" as const;
    if (s === "REJECTED") return "danger" as const;
    return "warning" as const;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Approval Queue</h1>
        <p className="text-[13px] text-text-body">Review and approve/reject pending requests (maker-checker)</p>
      </div>

      {/* Pending Approvals */}
      <Card className="shadow-card rounded-[10px]">
        <CardHeader>
          <CardTitle className="text-[16px] font-semibold font-rajdhani text-text-dark flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pending Approvals ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
          ) : pending.length === 0 ? (
            <p className="text-text-body text-sm text-center py-8">No pending approvals.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((a) => (
                <div key={a.id} className="border border-input-border rounded-[10px] p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="warning">PENDING</Badge>
                        <Badge variant="outline">{a.entityType}</Badge>
                      </div>
                      <p className="text-sm text-text-dark">{a.notes}</p>
                      {a.details && (
                        <div className="mt-2 text-xs text-text-body space-y-0.5">
                          <p>Investor: {a.details.investor?.name} ({a.details.investor?.investorCode})</p>
                          <p>Fund: {a.details.fund?.code} | Direction: {a.details.direction} | Amount: {Number(a.details.amount).toLocaleString("en-IN")}</p>
                          <p>Units: {Number(a.details.units).toFixed(4)} @ NAV {Number(a.details.nav).toFixed(4)}</p>
                          {a.details.paymentRef && (
                            <a
                              href={a.details.paymentRef}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1 text-ekush-orange hover:underline"
                            >
                              <FileText className="w-3 h-3" /> View payment slip
                            </a>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-text-muted mt-1">Submitted: {new Date(a.createdAt).toLocaleString("en-GB")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Rejection reason (optional)"
                      value={rejectNotes[a.id] || ""}
                      onChange={(e) => setRejectNotes({ ...rejectNotes, [a.id]: e.target.value })}
                      className="flex-1 h-8 rounded-[10px] border border-input-border bg-input-bg px-2 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAction(a.id, "approve")}
                      disabled={actionLoading === a.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {actionLoading === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(a.id, "reject")}
                      disabled={actionLoading === a.id}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed */}
      <Card className="shadow-card rounded-[10px]">
        <CardHeader>
          <CardTitle className="text-[16px] font-semibold font-rajdhani text-text-dark">Recently Processed</CardTitle>
        </CardHeader>
        <CardContent>
          {processed.length === 0 ? (
            <p className="text-text-body text-sm text-center py-6">No processed approvals yet.</p>
          ) : (
            <div className="space-y-2">
              {processed.slice(0, 20).map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-page-bg rounded-[10px]">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                      <span className="text-sm text-text-dark">{a.notes}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{new Date(a.createdAt).toLocaleString("en-GB")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
