"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Ticket {
  id: string;
  type: string;
  status: string;
  description: string | null;
  trackingNumber: string;
  slaDeadline: string | null;
  createdAt: string;
  investor: { id: string; name: string; investorCode: string };
  comments: { id: string; content: string; createdAt: string }[];
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Bank verification resolve form
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({ bankName: "", accountNumber: "", branchName: "", routingNumber: "" });

  const fetchTickets = () => {
    setLoading(true);
    fetch("/api/support/tickets")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTickets(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, []);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/support/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchTickets();
    } finally {
      setActionLoading(null);
    }
  };

  const deleteTicket = async (id: string) => {
    if (!window.confirm("Delete this ticket permanently? This cannot be undone.")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/support/tickets/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTickets();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Delete failed.");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const statusVariant = (s: string) => {
    if (s === "OPEN") return "warning" as const;
    if (s === "IN_PROGRESS") return "default" as const;
    if (s === "RESOLVED") return "success" as const;
    return "outline" as const;
  };

  const open = tickets.filter(t => t.status === "OPEN");
  const inProgress = tickets.filter(t => t.status === "IN_PROGRESS");

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Service Request Management</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card className="shadow-card rounded-[10px]"><CardContent className="p-4"><p className="text-xs text-text-body">Open</p><p className="text-xl font-semibold font-rajdhani text-amber-600">{open.length}</p></CardContent></Card>
        <Card className="shadow-card rounded-[10px]"><CardContent className="p-4"><p className="text-xs text-text-body">In Progress</p><p className="text-xl font-semibold font-rajdhani text-ekush-orange">{inProgress.length}</p></CardContent></Card>
        <Card className="shadow-card rounded-[10px]"><CardContent className="p-4"><p className="text-xs text-text-body">Resolved</p><p className="text-xl font-semibold font-rajdhani text-green-600">{tickets.filter(t => t.status === "RESOLVED").length}</p></CardContent></Card>
        <Card className="shadow-card rounded-[10px]"><CardContent className="p-4"><p className="text-xs text-text-body">Total</p><p className="text-xl font-semibold font-rajdhani text-text-dark">{tickets.length}</p></CardContent></Card>
      </div>

      <Card className="shadow-card rounded-[10px]">
        <CardHeader><CardTitle className="text-[16px] font-semibold font-rajdhani text-text-dark">All Tickets</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
          ) : tickets.length === 0 ? (
            <p className="text-text-body text-sm text-center py-8">No tickets.</p>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} className="border border-input-border rounded-[10px] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                        <span className="text-sm font-medium text-text-dark">{t.type.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-xs text-text-body">
                        #{t.trackingNumber} | {t.investor.name} ({t.investor.investorCode}) | {new Date(t.createdAt).toLocaleDateString("en-GB")}
                      </p>
                      {t.description && <p className="text-xs text-text-body mt-1">{t.description}</p>}
                      {t.comments.length > 0 && (
                        <p className="text-xs text-ekush-orange mt-1 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> {t.comments.length} message{t.comments.length > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`/admin/investors/${t.investor.id}`}
                        className="px-3 py-1.5 text-[12px] bg-ekush-orange text-white rounded-[5px] hover:bg-ekush-orange-dark"
                      >
                        View Investor
                      </a>
                      {t.status === "OPEN" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, "IN_PROGRESS")} disabled={actionLoading === t.id}>
                          {actionLoading === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Start"}
                        </Button>
                      )}
                      {(t.status === "OPEN" || t.status === "IN_PROGRESS") && (
                        t.type === "BANK_VERIFICATION" ? (
                          <Button size="sm" onClick={() => { setResolvingTicketId(t.id); setBankForm({ bankName: "", accountNumber: "", branchName: "", routingNumber: "" }); }} disabled={actionLoading === t.id} className="bg-green-600 hover:bg-green-700 text-white">
                            Verify & Resolve
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => updateStatus(t.id, "RESOLVED")} disabled={actionLoading === t.id} className="bg-green-600 hover:bg-green-700 text-white">
                            Resolve
                          </Button>
                        )
                      )}
                      {t.status === "RESOLVED" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, "CLOSED")} disabled={actionLoading === t.id}>
                          Close
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTicket(t.id)}
                        disabled={actionLoading === t.id}
                        className="border-red-400 text-red-600 hover:bg-red-50"
                        aria-label="Delete ticket"
                      >
                        {actionLoading === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Verification Resolve Modal */}
      {resolvingTicketId && (() => {
        const ticket = tickets.find((t) => t.id === resolvingTicketId);
        if (!ticket) return null;
        // Extract cheque leaf URL from description (if the bank account has one)
        const bankIdMatch = ticket.description?.match(/Bank Account ID:\s*(\S+)/);

        const handleResolveWithBank = async () => {
          if (!bankForm.bankName || !bankForm.accountNumber) {
            alert("Bank Name and Account Number are required");
            return;
          }
          setActionLoading(resolvingTicketId);
          try {
            // Approve the bank account first — flips status PENDING_APPROVAL → ACTIVE
            // and fills in the bank details. Only after that do we mark the
            // ticket resolved, so the investor sees the secondary account
            // immediately on profile / SIP.
            if (bankIdMatch) {
              const res = await fetch(`/api/admin/bank-accounts/${bankIdMatch[1]}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "approve", ...bankForm }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "Could not approve bank account.");
                return;
              }
            }
            await fetch(`/api/support/tickets/${resolvingTicketId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "RESOLVED" }),
            });
            setResolvingTicketId(null);
            fetchTickets();
          } finally {
            setActionLoading(null);
          }
        };

        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setResolvingTicketId(null)} />
            <div className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] z-50 bg-white rounded-[10px] shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
              <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-semibold">Verify Bank Account</h2>
                  <p className="text-[12px] text-green-100">{ticket.investor.name} ({ticket.investor.investorCode})</p>
                </div>
                <button onClick={() => setResolvingTicketId(null)} className="p-1 hover:bg-white/20 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-6 space-y-4">
                {/* Cheque leaf preview */}
                {ticket.description?.includes("Cheque leaf") && (
                  <div className="bg-page-bg rounded-[10px] p-3">
                    <p className="text-[11px] text-text-body mb-2 font-medium">Cheque Leaf (uploaded by investor):</p>
                    <p className="text-[11px] text-text-muted mb-2">Review the cheque image and enter the bank details below</p>
                    {bankIdMatch && (
                      <a
                        href={`/admin/investors/${ticket.investor.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-ekush-orange hover:underline"
                      >
                        View cheque image in investor profile →
                      </a>
                    )}
                  </div>
                )}

                {/* Bank details form */}
                <div className="space-y-3">
                  <p className="text-[13px] font-semibold text-text-dark">Enter bank details from cheque:</p>
                  <Input label="Bank Name *" value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} placeholder="e.g., Dutch Bangla Bank" />
                  <Input label="Account Number *" value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} placeholder="Account number" />
                  <Input label="Branch Name" value={bankForm.branchName} onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })} placeholder="Branch name" />
                  <Input label="Routing Number" value={bankForm.routingNumber} onChange={(e) => setBankForm({ ...bankForm, routingNumber: e.target.value })} placeholder="Routing number" />
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setResolvingTicketId(null)}>Cancel</Button>
                <Button onClick={handleResolveWithBank} disabled={actionLoading === resolvingTicketId} className="bg-green-600 hover:bg-green-700 text-white">
                  {actionLoading === resolvingTicketId ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Save Details & Resolve
                </Button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
