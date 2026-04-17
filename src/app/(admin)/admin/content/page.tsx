"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Eye, EyeOff, Loader2, Save, Send, RefreshCw, FileText } from "lucide-react";
import { CollapsibleCard } from "@/components/admin/collapsible-card";
import { TEMPLATE_OPTIONS } from "@/lib/mail/templates";

// ───────────────────────── Content Management (existing CRUD) ──────────────────────────

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  publishedAt: string | null;
  createdAt: string;
}

const CATEGORIES = ["Market Update", "Fund Commentary", "Education", "Regulatory", "Announcement"];

function ContentManagement() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "", publish: true });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchArticles = () => {
    fetch("/api/admin/content").then(r => r.json()).then(setArticles).catch(() => {});
  };
  useEffect(() => { fetchArticles(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ title: "", content: "", category: "", publish: true });
        fetchArticles();
      }
    } finally { setLoading(false); }
  };

  const togglePublish = async (id: string, isPublished: boolean) => {
    setActionLoading(id);
    try {
      await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...(isPublished ? { unpublish: true } : { publish: true }) }),
      });
      fetchArticles();
    } finally { setActionLoading(null); }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    setActionLoading(id);
    try {
      await fetch(`/api/admin/content?id=${id}`, { method: "DELETE" });
      fetchArticles();
    } finally { setActionLoading(null); }
  };

  const published = articles.filter(a => a.publishedAt);
  const drafts = articles.filter(a => !a.publishedAt);

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-text-body">
          {articles.length} total · {published.length} published · {drafts.length} draft{drafts.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-4 h-4 mr-1" /> New Article
        </Button>
      </div>

      {showCreate && (
        <div className="border border-ekush-orange/30 rounded-[10px] p-4">
          <form onSubmit={handleCreate} className="space-y-3">
            <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Article title" required />
            <div>
              <label className="text-sm font-medium text-text-label block mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-9 rounded-[10px] border border-input-border bg-input-bg px-3 text-sm">
                <option value="">No category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-label block mb-1">Content</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full rounded-[10px] border border-input-border bg-input-bg px-3 py-2 text-sm min-h-[150px]" placeholder="Write your article content..." required />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.publish} onChange={(e) => setForm({ ...form, publish: e.target.checked })} className="w-4 h-4" />
              <span className="text-sm text-text-dark">Publish immediately</span>
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} size="sm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Create
              </Button>
              <Button type="button" onClick={() => setShowCreate(false)} variant="outline" size="sm">Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {articles.length === 0 ? (
          <p className="text-text-body text-sm text-center py-6">No articles yet.</p>
        ) : (
          articles.map((a) => (
            <div key={a.id} className="flex items-start justify-between p-3 bg-page-bg rounded-[10px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={a.publishedAt ? "success" : "warning"}>
                    {a.publishedAt ? "Published" : "Draft"}
                  </Badge>
                  {a.category && <Badge variant="outline" className="text-[10px]">{a.category}</Badge>}
                </div>
                <h4 className="font-medium text-text-dark text-sm">{a.title}</h4>
                <p className="text-xs text-text-body mt-0.5 line-clamp-1">{a.content}</p>
              </div>
              <div className="flex items-center gap-1 ml-4">
                <Button size="sm" variant="outline" onClick={() => togglePublish(a.id, !!a.publishedAt)} disabled={actionLoading === a.id}>
                  {actionLoading === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : a.publishedAt ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteArticle(a.id)} disabled={actionLoading === a.id}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Mail Settings (SMTP) ──────────────────────────

function MailSettings() {
  const [form, setForm] = useState({
    host: "mail.ekushwml.com",
    port: 465,
    secure: true,
    user: "",
    pass: "",
    fromEmail: "",
    fromName: "Ekush WML",
  });
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/mail/settings")
      .then(r => r.json())
      .then(d => {
        setConfigured(!!d.configured);
        if (d.configured) {
          setForm({
            host: d.host || "mail.ekushwml.com",
            port: d.port || 465,
            secure: d.secure,
            user: d.user || "",
            pass: "",
            fromEmail: d.fromEmail || "",
            fromName: d.fromName || "Ekush WML",
          });
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/mail/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setConfigured(true);
        setForm((f) => ({ ...f, pass: "" }));
        setMessage({ type: "success", text: "SMTP settings saved." });
      } else {
        setMessage({ type: "error", text: data.error || "Save failed." });
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="p-5 space-y-4">
      <p className="text-[12px] text-text-body">
        Configure the outgoing mail server. Matches the SSL/TLS settings typically
        provided by your hosting panel (e.g. cPanel). Leave the Password field blank to
        keep the previously saved password.
      </p>
      <div className="bg-page-bg rounded-[10px] p-3 text-[11.5px] text-text-body space-y-1">
        <p><strong>Outgoing Server:</strong> mail.ekushwml.com (SMTP port 465, SSL/TLS)</p>
        <p><strong>Incoming (reference only):</strong> IMAP 993, POP3 995 · mail.ekushwml.com</p>
        <p>Username should be the full email address (e.g. <code>info@ekushwml.com</code>).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="SMTP Host" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="mail.ekushwml.com" />
        <Input label="SMTP Port" type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} placeholder="465" />
        <div className="flex items-center gap-2 pt-6">
          <input id="smtp-secure" type="checkbox" checked={form.secure} onChange={(e) => setForm({ ...form, secure: e.target.checked })} />
          <label htmlFor="smtp-secure" className="text-[13px] text-text-dark">Use SSL/TLS (recommended for port 465)</label>
        </div>
        <div />
        <Input label="Username (email)" value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="info@ekushwml.com" />
        <Input label={`Password ${configured ? "(leave blank to keep existing)" : ""}`} type="password" value={form.pass} onChange={(e) => setForm({ ...form, pass: e.target.value })} placeholder="••••••••" />
        <Input label="From Email" value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} placeholder="info@ekushwml.com" />
        <Input label="From Name" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} placeholder="Ekush WML" />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={loading} size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          Save Settings
        </Button>
        {configured && <Badge variant="success">Configured</Badge>}
        {message && (
          <span className={`text-[12px] ${message.type === "success" ? "text-green-600" : "text-red-500"}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Mailing Center ──────────────────────────

interface MailRow {
  id: string;
  investorCode: string;
  name: string;
  email: string;
  phone: string;
  hasTaxCertificate: boolean;
  funds: Record<string, { units: number; nav: number; marketValue: number; hasPortfolio: boolean }>;
}

function MailingCenter({ onSent }: { onSent: () => void }) {
  const [rows, setRows] = useState<MailRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState("EFUF_PORTFOLIO");
  const [skipZero, setSkipZero] = useState(true);
  const [codeFilter, setCodeFilter] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    skipped: number;
    total: number;
    results?: Array<{ investorCode: string; status: string; error?: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const opt = TEMPLATE_OPTIONS.find((o) => o.id === template);
  const relevantFundCode = opt?.fundCode;

  const load = () => {
    setLoading(true);
    fetch("/api/admin/mail/investors")
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setRows(d) : setRows([]))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const eligible = rows.filter((r) => {
    // When a code filter is entered, show the matching investor regardless of
    // email/fund filters — admin wants to look up contact info by code.
    if (codeFilter) {
      return r.investorCode.toLowerCase().includes(codeFilter.toLowerCase());
    }
    if (!r.email) return false;
    if (template === "EFUF_PORTFOLIO") return !skipZero || r.funds.EFUF?.hasPortfolio;
    if (template === "EGF_PORTFOLIO") return !skipZero || r.funds.EGF?.hasPortfolio;
    if (template === "ESRF_PORTFOLIO") return !skipZero || r.funds.ESRF?.hasPortfolio;
    return true;
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };
  const toggleAll = () => {
    if (selected.size === eligible.length) setSelected(new Set());
    else setSelected(new Set(eligible.map(e => e.id)));
  };

  const send = async () => {
    if (selected.size === 0) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          investorIds: Array.from(selected),
          skipZeroMarketValue: skipZero,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          sent: data.sent,
          failed: data.failed,
          skipped: data.skipped,
          total: data.total,
          results: data.results,
        });
        setSelected(new Set());
        onSent();
      } else {
        alert(data.error || "Send failed");
      }
    } finally { setSending(false); }
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3 flex-wrap">
        <div>
          <label className="text-[12px] font-medium text-text-body block mb-1">Email Template</label>
          <select
            value={template}
            onChange={(e) => { setTemplate(e.target.value); setSelected(new Set()); setResult(null); }}
            className="h-9 rounded-[10px] border border-input-border bg-white px-3 text-sm"
          >
            {TEMPLATE_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[12px] font-medium text-text-body block mb-1">Filter by Code</label>
          <input
            type="text"
            placeholder="e.g., A00055"
            value={codeFilter}
            onChange={(e) => setCodeFilter(e.target.value)}
            className="h-9 rounded-[10px] border border-input-border bg-white px-3 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-[12px] pt-5">
          <input type="checkbox" checked={skipZero} onChange={(e) => setSkipZero(e.target.checked)} />
          Skip investors with zero market value in the selected fund
        </label>
        <div className="ml-auto pt-5 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={send} disabled={sending || selected.size === 0} className="bg-ekush-orange hover:bg-ekush-orange-dark text-white">
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
            Send to {selected.size} investor{selected.size === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      {result && (() => {
        const failures = (result.results || []).filter((r) => r.status === "FAILED");
        const hasFailures = failures.length > 0;
        return (
          <div
            className={`border rounded-[5px] p-3 text-[12px] ${
              hasFailures
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-green-50 border-green-200 text-green-800"
            }`}
          >
            Batch complete — <strong>Sent: {result.sent}</strong> · Failed: {result.failed} · Skipped: {result.skipped} (total {result.total})
            {hasFailures && (
              <ul className="mt-2 list-disc pl-5 space-y-0.5">
                {failures.map((f, i) => (
                  <li key={i}>
                    <span className="font-mono">{f.investorCode}</span>: {f.error || "unknown error"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })()}

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b bg-page-bg">
              <th className="p-2 text-left w-8">
                <input
                  type="checkbox"
                  checked={eligible.length > 0 && selected.size === eligible.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Name</th>
              {!["EFUF_PORTFOLIO", "EGF_PORTFOLIO", "ESRF_PORTFOLIO"].includes(template) && (
                <th className="p-2 text-center">Tax Cert.</th>
              )}
              {["EFUF_PORTFOLIO", "EGF_PORTFOLIO", "ESRF_PORTFOLIO"].includes(template) && (
                <th className="p-2 text-center">PDF</th>
              )}
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Phone</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-text-muted"><Loader2 className="w-4 h-4 animate-spin inline" /></td></tr>
            ) : eligible.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-text-muted">
                No investors match the current filter.
              </td></tr>
            ) : eligible.map((r) => {
              const inFund = relevantFundCode ? r.funds[relevantFundCode]?.hasPortfolio : true;
              return (
                <tr key={r.id} className={`border-b hover:bg-amber-50/40 ${!inFund ? "text-text-muted" : ""}`}>
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                  </td>
                  <td className="p-2 font-mono text-[11px]">{r.investorCode}</td>
                  <td className="p-2 font-medium text-text-dark">{r.name}</td>
                  {!["EFUF_PORTFOLIO", "EGF_PORTFOLIO", "ESRF_PORTFOLIO"].includes(template) && (
                    <td className="p-2 text-center">{r.hasTaxCertificate ? "✓" : "—"}</td>
                  )}
                  {["EFUF_PORTFOLIO", "EGF_PORTFOLIO", "ESRF_PORTFOLIO"].includes(template) && (
                    <td className="p-2 text-center">
                      <a
                        href={`/forms/portfolio-statement?investorCode=${r.investorCode}&fundCode=${relevantFundCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[11px] font-medium"
                      >
                        <FileText className="w-3.5 h-3.5" /> PDF
                      </a>
                    </td>
                  )}
                  <td className="p-2">{r.email || <span className="text-amber-600">(missing)</span>}</td>
                  <td className="p-2">{r.phone || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-body">
        Note: when a portfolio template is selected, only investors with a non-zero market value in that fund are listed
        (default behaviour). Uncheck the filter above to override.
      </p>
    </div>
  );
}

// ───────────────────────── Delivery Report ──────────────────────────

interface LogRow {
  id: string;
  toEmail: string;
  subject: string;
  template: string;
  status: string;
  errorMessage: string | null;
  openedAt: string | null;
  createdAt: string;
  investor: { name: string; investorCode: string } | null;
}

function DeliveryReport({ reloadKey }: { reloadKey: number }) {
  const [tab, setTab] = useState<"all" | "SENT" | "FAILED" | "OPENED">("all");
  const [data, setData] = useState<{ logs: LogRow[]; counts: Record<string, number> }>({ logs: [], counts: {} });
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const qs = tab === "all" ? "" : `?status=${tab}`;
    fetch(`/api/admin/mail/logs${qs}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, reloadKey]);

  const receivedNotOpened = (data.logs || []).filter((l) => l.status === "SENT" && !l.openedAt);

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "SENT", "FAILED", "OPENED"] as const).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={tab === k ? "default" : "outline"}
            onClick={() => setTab(k)}
          >
            {k === "all" ? "All" : k} {data.counts[k] !== undefined ? `(${data.counts[k]})` : ""}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={load} className="ml-auto">
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {tab === "SENT" && (
        <p className="text-[11px] text-text-body">
          Of these, {receivedNotOpened.length} were delivered but not opened. (Open tracking requires the
          tracking pixel endpoint — coming in phase 2.)
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b bg-page-bg">
              <th className="p-2 text-left">When</th>
              <th className="p-2 text-left">Investor</th>
              <th className="p-2 text-left">To</th>
              <th className="p-2 text-left">Template</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Error</th>
            </tr>
          </thead>
          <tbody>
            {(data.logs || []).length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-text-muted">No deliveries to show.</td></tr>
            ) : (data.logs || []).map((l) => (
              <tr key={l.id} className="border-b">
                <td className="p-2">{new Date(l.createdAt).toLocaleString("en-GB")}</td>
                <td className="p-2">
                  {l.investor ? (
                    <>
                      <span className="font-medium text-text-dark">{l.investor.name}</span>
                      <span className="font-mono text-[10px] text-text-body ml-1">{l.investor.investorCode}</span>
                    </>
                  ) : "—"}
                </td>
                <td className="p-2">{l.toEmail}</td>
                <td className="p-2">{l.template.replace(/_/g, " ")}</td>
                <td className="p-2">
                  <Badge variant={l.status === "SENT" || l.status === "OPENED" ? "success" : "danger"}>
                    {l.status}
                  </Badge>
                </td>
                <td className="p-2 text-[11px] text-red-500">{l.errorMessage || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────── Page ──────────────────────────

export default function AdminMailPage() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Mail &amp; Content</h1>
        <p className="text-[13px] text-text-body">Manage articles, SMTP settings, and investor mailings.</p>
      </div>

      <CollapsibleCard title="Content Management" subtitle="Create and publish articles" defaultOpen={false}>
        <ContentManagement />
      </CollapsibleCard>

      <CollapsibleCard title="Mail Settings" subtitle="SMTP server / SSL-TLS" defaultOpen={false}>
        <MailSettings />
      </CollapsibleCard>

      <CollapsibleCard title="Mailing Center" subtitle="Pick investors and send an email template" defaultOpen={true}>
        <MailingCenter onSent={() => setReloadKey((k) => k + 1)} />
      </CollapsibleCard>

      <CollapsibleCard title="Delivery Report" subtitle="Who received, who failed, open tracking (phase 2)" defaultOpen={false}>
        <DeliveryReport reloadKey={reloadKey} />
      </CollapsibleCard>
    </div>
  );
}
