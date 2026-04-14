"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, MessageSquare } from "lucide-react";

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
                        <Button size="sm" onClick={() => updateStatus(t.id, "RESOLVED")} disabled={actionLoading === t.id} className="bg-green-600 hover:bg-green-700 text-white">
                          Resolve
                        </Button>
                      )}
                      {t.status === "RESOLVED" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, "CLOSED")} disabled={actionLoading === t.id}>
                          Close
                        </Button>
                      )}
                    </div>
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
