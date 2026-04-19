"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Shield, MoreVertical, Mail, RefreshCw, Trash2, Key, UserX, UserCheck } from "lucide-react";
import {
  STAFF_ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  type StaffRole,
  type UserRole,
} from "@/lib/roles";
import { InviteDialog } from "@/components/admin/team/invite-dialog";

interface Member {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}
interface Invitation {
  id: string;
  email: string;
  fullName: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

const ROLE_CHIP: Record<StaffRole, { bg: string; fg: string }> = {
  SUPER_ADMIN: { bg: "#FAECE7", fg: "#993C1D" },
  MAKER:       { bg: "#E6F1FB", fg: "#185FA5" },
  CHECKER:     { bg: "#E1F5EE", fg: "#0F6E56" },
  VIEWER:      { bg: "#F1EFE8", fg: "#444441" },
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team/members");
      const data = res.ok ? await res.json() : { users: [], invitations: [] };
      setMembers(Array.isArray(data.users) ? data.users : []);
      setInvitations(Array.isArray(data.invitations) ? data.invitations : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);
  useEffect(() => {
    const onClick = () => setOpenMenuId(null);
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const changeRole = async (userId: string, role: StaffRole) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/team/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_role", role }),
      });
      if (res.ok) fetchMembers();
      else alert((await res.json()).error ?? "Failed");
    } finally {
      setActionLoading(null);
      setOpenMenuId(null);
    }
  };

  const setStatus = async (userId: string, status: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/team/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", status }),
      });
      if (res.ok) fetchMembers();
      else alert((await res.json()).error ?? "Failed");
    } finally {
      setActionLoading(null);
      setOpenMenuId(null);
    }
  };

  const resendInvite = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/team/invitations/${id}`, { method: "POST" });
      if (res.ok) { fetchMembers(); alert("Invitation re-sent."); }
      else alert((await res.json()).error ?? "Failed");
    } finally {
      setActionLoading(null);
      setOpenMenuId(null);
    }
  };

  const revokeInvite = async (id: string) => {
    if (!confirm("Revoke this invitation? The link will stop working immediately.")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/team/invitations/${id}`, { method: "DELETE" });
      if (res.ok) fetchMembers();
      else alert((await res.json()).error ?? "Failed");
    } finally {
      setActionLoading(null);
      setOpenMenuId(null);
    }
  };

  const sendReset = async (email: string) => {
    if (!email) return;
    setActionLoading(email);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      alert(`Reset link sent to ${email}.`);
    } finally {
      setActionLoading(null);
      setOpenMenuId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Team &amp; Permissions</h1>
          <p className="text-[13px] text-text-body">
            Assign a role to each team member. Roles control what they can see and do.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-ekush-orange hover:bg-ekush-orange-dark text-white">
          <UserPlus className="w-4 h-4 mr-2" /> Invite member
        </Button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {STAFF_ROLES.map((r) => {
          const chip = ROLE_CHIP[r as StaffRole];
          return (
            <div key={r} className="rounded-[10px] border border-input-border bg-white p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ background: chip.fg }} />
                <span className="text-[13px] font-semibold" style={{ color: chip.fg }}>
                  {ROLE_LABELS[r as StaffRole]}
                </span>
              </div>
              <p className="text-[12px] text-text-body leading-relaxed">{ROLE_DESCRIPTIONS[r as StaffRole]}</p>
            </div>
          );
        })}
      </div>

      {/* Members table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
            Team members ({members.length + invitations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
          ) : members.length === 0 && invitations.length === 0 ? (
            <p className="text-text-body text-sm text-center py-10">No team members yet. Invite someone to get started.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-amber-50 border-b border-amber-100 text-left">
                  <th className="p-3 font-semibold">Member</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Role</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold w-[60px]"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const chip = ROLE_CHIP[m.role as StaffRole] ?? ROLE_CHIP.VIEWER;
                  const isLocked = m.status === "LOCKED";
                  const isDeactivated = m.status === "DEACTIVATED";
                  return (
                    <tr key={m.id} className={`border-b last:border-0 ${isDeactivated ? "opacity-60" : ""}`}>
                      <td className="p-3">
                        <p className="font-medium text-text-dark">{m.fullName || "—"}</p>
                        {m.lastLoginAt && (
                          <p className="text-[11px] text-text-muted">
                            Last login {new Date(m.lastLoginAt).toLocaleString("en-GB")}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-text-body">{m.email || "—"}</td>
                      <td className="p-3">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: chip.bg, color: chip.fg }}
                        >
                          {ROLE_LABELS[m.role as UserRole] ?? m.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant={m.status === "ACTIVE" ? "active" : isLocked ? "danger" : "pending"}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="p-3 relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === m.id ? null : m.id); }}
                          className="p-1.5 rounded-md hover:bg-page-bg"
                          aria-label="Member actions"
                        >
                          {actionLoading === m.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-text-body" />
                          ) : (
                            <MoreVertical className="w-4 h-4 text-text-body" />
                          )}
                        </button>
                        {openMenuId === m.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-3 top-10 z-20 w-56 bg-white border border-input-border rounded-md shadow-[0_8px_24px_rgba(15,30,61,0.12)] overflow-hidden text-left"
                          >
                            <div className="px-3 py-2 border-b border-gray-100">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Change role</p>
                              <div className="mt-1 grid grid-cols-2 gap-1">
                                {STAFF_ROLES.map((r) => (
                                  <button
                                    key={r}
                                    disabled={r === m.role}
                                    onClick={() => changeRole(m.id, r as StaffRole)}
                                    className={
                                      "text-[11px] px-2 py-1 rounded " +
                                      (r === m.role
                                        ? "bg-page-bg text-text-muted cursor-default"
                                        : "hover:bg-page-bg text-text-dark")
                                    }
                                  >
                                    {ROLE_LABELS[r as StaffRole]}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => sendReset(m.email ?? "")}
                              disabled={!m.email}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-dark hover:bg-page-bg"
                            >
                              <Key className="w-3.5 h-3.5" /> Send password reset
                            </button>
                            {isLocked && (
                              <button
                                onClick={() => setStatus(m.id, "ACTIVE")}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-green-700 hover:bg-green-50"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Unlock
                              </button>
                            )}
                            {!isDeactivated ? (
                              <button
                                onClick={() => setStatus(m.id, "DEACTIVATED")}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50"
                              >
                                <UserX className="w-3.5 h-3.5" /> Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => setStatus(m.id, "ACTIVE")}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-green-700 hover:bg-green-50"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Reactivate
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {invitations.map((inv) => {
                  const chip = ROLE_CHIP[inv.role as StaffRole] ?? ROLE_CHIP.VIEWER;
                  return (
                    <tr key={inv.id} className="border-b last:border-0 bg-amber-50/30">
                      <td className="p-3">
                        <p className="font-medium text-text-dark">{inv.fullName}</p>
                        <p className="text-[11px] text-text-muted">
                          Expires {new Date(inv.expiresAt).toLocaleString("en-GB")}
                        </p>
                      </td>
                      <td className="p-3 text-text-body">{inv.email}</td>
                      <td className="p-3">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: chip.bg, color: chip.fg }}
                        >
                          {ROLE_LABELS[inv.role as UserRole] ?? inv.role}
                        </span>
                      </td>
                      <td className="p-3"><Badge variant="pending">INVITED</Badge></td>
                      <td className="p-3 relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === inv.id ? null : inv.id); }}
                          className="p-1.5 rounded-md hover:bg-page-bg"
                          aria-label="Invitation actions"
                        >
                          {actionLoading === inv.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-text-body" />
                          ) : (
                            <MoreVertical className="w-4 h-4 text-text-body" />
                          )}
                        </button>
                        {openMenuId === inv.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-3 top-10 z-20 w-52 bg-white border border-input-border rounded-md shadow-[0_8px_24px_rgba(15,30,61,0.12)] overflow-hidden text-left"
                          >
                            <button
                              onClick={() => resendInvite(inv.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-dark hover:bg-page-bg"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Resend invitation
                            </button>
                            <button
                              onClick={() => revokeInvite(inv.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Revoke invitation
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Permission matrix card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" /> Permission reference
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b bg-page-bg">
                <th className="p-3 text-left font-semibold">Capability</th>
                {STAFF_ROLES.map((r) => (
                  <th key={r} className="p-3 text-center font-semibold">{ROLE_LABELS[r as StaffRole]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERM_ROWS.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="p-3 text-text-dark">{row.label}</td>
                  {STAFF_ROLES.map((r) => (
                    <td key={r} className="p-3 text-center">
                      {row.roles.includes(r as StaffRole)
                        ? <span className="text-green-600">✓</span>
                        : row.partial?.includes(r as StaffRole)
                        ? <span className="text-amber-600 text-[10px]">own only</span>
                        : <span className="text-text-muted">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onSent={fetchMembers} />
    </div>
  );
}

const PERM_ROWS: Array<{ label: string; roles: StaffRole[]; partial?: StaffRole[] }> = [
  { label: "View dashboard, investors, statements, fund reports", roles: ["SUPER_ADMIN", "MAKER", "CHECKER", "VIEWER"] },
  { label: "Download reports / statements (PDF/Excel)",           roles: ["SUPER_ADMIN", "MAKER", "CHECKER", "VIEWER"] },
  { label: "Respond to tickets & mail",                           roles: ["SUPER_ADMIN", "MAKER", "CHECKER", "VIEWER"] },
  { label: "Create / edit investor data (maker actions)",          roles: ["SUPER_ADMIN", "MAKER"] },
  { label: "Approve or reject pending requests (maker-checker)",   roles: ["SUPER_ADMIN", "CHECKER"] },
  { label: "Approve KYC / new investor registration",              roles: ["SUPER_ADMIN", "CHECKER"] },
  { label: "Manage team members & assign roles",                   roles: ["SUPER_ADMIN"] },
  { label: "View full system audit log",                           roles: ["SUPER_ADMIN", "CHECKER"], partial: ["MAKER"] },
];
