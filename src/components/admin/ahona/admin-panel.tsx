"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Two-section admin for the Ahona chatbot:
 *   1. Settings — kill switches, greeting (en + bn), phone, WhatsApp,
 *      working-hours blurb.
 *   2. Quick replies — flat list grouped by parent. Add / edit / delete /
 *      reorder. Each row has en + bn label, en + bn response, surface
 *      filter, and an "isContactCard" toggle that turns the leaf into
 *      the phone + WhatsApp pair on the public render.
 *
 * No drag-and-drop tree library — admins move rows with ↑ / ↓ buttons
 * and pick the parent from a select. Keeps the surface area tiny and
 * forms readable.
 */

type Settings = {
  id: string;
  enabledOnWebsite: boolean;
  enabledOnPortal: boolean;
  greetingEn: string;
  greetingBn: string;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  workingHoursEn: string | null;
  workingHoursBn: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

type Reply = {
  id: string;
  parentId: string | null;
  displayOrder: number;
  surface: string;
  labelEn: string;
  labelBn: string;
  responseEn: string;
  responseBn: string;
  isContactCard: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ReplyDraft = Omit<Reply, "createdAt" | "updatedAt"> & {
  isNew?: boolean;
};

const SURFACES: { value: string; label: string }[] = [
  { value: "BOTH", label: "Both — website & portal" },
  { value: "PUBLIC", label: "Website only" },
  { value: "PORTAL", label: "Portal only" },
];

export function AhonaAdminPanel({
  initialSettings,
  initialReplies,
}: {
  initialSettings: Settings;
  initialReplies: Reply[];
}) {
  return (
    <div className="space-y-8">
      <SettingsCard initial={initialSettings} />
      <QuickRepliesCard initial={initialReplies} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Settings card
// ──────────────────────────────────────────────────────────
function SettingsCard({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    enabledOnWebsite: initial.enabledOnWebsite,
    enabledOnPortal: initial.enabledOnPortal,
    greetingEn: initial.greetingEn,
    greetingBn: initial.greetingBn,
    phoneNumber: initial.phoneNumber ?? "",
    whatsappNumber: initial.whatsappNumber ?? "",
    workingHoursEn: initial.workingHoursEn ?? "",
    workingHoursBn: initial.workingHoursBn ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  async function onSave() {
    setErr(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ahona/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(body?.error ?? "Save failed");
        return;
      }
      setSavedAt(Date.now());
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  const justSaved = savedAt && Date.now() - savedAt < 2500;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <header className="mb-4">
        <h2 className="text-[15px] font-semibold">Settings</h2>
        <p className="text-[12px] text-[#8A8A8A]">
          Kill switches, greeting, contact details. The kill switches take
          effect immediately on the next page load.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Toggle
          label="Show on ekushwml.com"
          checked={form.enabledOnWebsite}
          onChange={(v) => setForm((f) => ({ ...f, enabledOnWebsite: v }))}
          hint="Floating chat button on every public page."
        />
        <Toggle
          label="Show inside investor portal"
          checked={form.enabledOnPortal}
          onChange={(v) => setForm((f) => ({ ...f, enabledOnPortal: v }))}
          hint="Floating chat button on every authenticated dashboard page."
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Greeting (English)">
          <textarea
            rows={2}
            value={form.greetingEn}
            onChange={(e) =>
              setForm((f) => ({ ...f, greetingEn: e.target.value }))
            }
            className={inputClass}
          />
        </Field>
        <Field label="Greeting (Bangla)">
          <textarea
            rows={2}
            value={form.greetingBn}
            onChange={(e) =>
              setForm((f) => ({ ...f, greetingBn: e.target.value }))
            }
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Phone number"
          hint="International format, no leading +. Used for the Call button."
        >
          <input
            type="tel"
            value={form.phoneNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, phoneNumber: e.target.value }))
            }
            placeholder="8801713086101"
            className={inputClass}
          />
        </Field>
        <Field
          label="WhatsApp number"
          hint="Same format. Used for the WhatsApp button."
        >
          <input
            type="tel"
            value={form.whatsappNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, whatsappNumber: e.target.value }))
            }
            placeholder="8801713086101"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Working hours (English)" hint="Shown next to the Call button.">
          <input
            type="text"
            value={form.workingHoursEn}
            onChange={(e) =>
              setForm((f) => ({ ...f, workingHoursEn: e.target.value }))
            }
            placeholder="Sunday–Thursday, 9:00 am – 5:00 pm"
            className={inputClass}
          />
        </Field>
        <Field label="Working hours (Bangla)">
          <input
            type="text"
            value={form.workingHoursBn}
            onChange={(e) =>
              setForm((f) => ({ ...f, workingHoursBn: e.target.value }))
            }
            placeholder="রবিবার–বৃহস্পতিবার, সকাল ৯:০০ – বিকেল ৫:০০"
            className={inputClass}
          />
        </Field>
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-ekush-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : justSaved ? "Saved ✓" : "Save settings"}
        </button>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────
// Quick replies card
// ──────────────────────────────────────────────────────────
function QuickRepliesCard({ initial }: { initial: Reply[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Reply[]>(initial);
  const [editing, setEditing] = useState<ReplyDraft | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Group by parentId so we can render each tier as a sub-list under
  // its parent's row. Single pass; the API already orders by
  // (parentId, displayOrder).
  const childrenByParent = useMemo(() => {
    const m = new Map<string | null, Reply[]>();
    for (const r of rows) {
      if (!m.has(r.parentId)) m.set(r.parentId, []);
      m.get(r.parentId)!.push(r);
    }
    return m;
  }, [rows]);

  function startCreate(parentId: string | null) {
    setErr(null);
    setEditing({
      id: "",
      parentId,
      displayOrder:
        (childrenByParent.get(parentId)?.length ?? 0) * 10 + 10,
      surface: "BOTH",
      labelEn: "",
      labelBn: "",
      responseEn: "",
      responseBn: "",
      isContactCard: false,
      isPublished: true,
      isNew: true,
    });
  }

  function startEdit(row: Reply) {
    setErr(null);
    setEditing({ ...row, isNew: false });
  }

  async function save(draft: ReplyDraft) {
    setErr(null);
    const isNew = draft.isNew;
    const url = isNew
      ? "/api/admin/ahona/quick-replies"
      : `/api/admin/ahona/quick-replies/${draft.id}`;
    const method = isNew ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentId: draft.parentId,
        displayOrder: draft.displayOrder,
        surface: draft.surface,
        labelEn: draft.labelEn,
        labelBn: draft.labelBn,
        responseEn: draft.responseEn,
        responseBn: draft.responseBn,
        isContactCard: draft.isContactCard,
        isPublished: draft.isPublished,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      reply?: Reply;
    };
    if (!res.ok) {
      setErr(body?.error ?? "Save failed");
      return;
    }
    setEditing(null);
    startTransition(() => router.refresh());
    // Optimistic local state — replace until refresh lands.
    if (body.reply) {
      setRows((rs) => {
        if (isNew) return [...rs, body.reply!];
        return rs.map((r) => (r.id === body.reply!.id ? body.reply! : r));
      });
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this reply and all its children?")) return;
    const res = await fetch(`/api/admin/ahona/quick-replies/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setErr("Delete failed");
      return;
    }
    startTransition(() => router.refresh());
    // Drop locally + descendants until the refresh resolves.
    setRows((rs) => {
      const drop = new Set<string>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const r of rs) {
          if (r.parentId && drop.has(r.parentId) && !drop.has(r.id)) {
            drop.add(r.id);
            grew = true;
          }
        }
      }
      return rs.filter((r) => !drop.has(r.id));
    });
  }

  async function move(row: Reply, dir: -1 | 1) {
    const siblings = (childrenByParent.get(row.parentId) ?? []).slice();
    const idx = siblings.findIndex((s) => s.id === row.id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= siblings.length) return;
    const a = siblings[idx];
    const b = siblings[j];
    // Swap their displayOrder values via two PATCH calls.
    await Promise.all([
      fetch(`/api/admin/ahona/quick-replies/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...a, displayOrder: b.displayOrder }),
      }),
      fetch(`/api/admin/ahona/quick-replies/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...b, displayOrder: a.displayOrder }),
      }),
    ]);
    startTransition(() => router.refresh());
    setRows((rs) =>
      rs.map((r) => {
        if (r.id === a.id) return { ...r, displayOrder: b.displayOrder };
        if (r.id === b.id) return { ...r, displayOrder: a.displayOrder };
        return r;
      }),
    );
  }

  const topLevel = childrenByParent.get(null) ?? [];

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold">Quick replies</h2>
          <p className="text-[12px] text-[#8A8A8A]">
            Top-level entries are the buttons users see first. Nest replies
            under another to build a multi-step menu. Mark a leaf as a contact
            card to render the phone + WhatsApp pair instead of text.
          </p>
        </div>
        <button
          type="button"
          onClick={() => startCreate(null)}
          className="rounded-md border border-ekush-orange bg-[#FFF4EC] px-3 py-2 text-[12px] font-semibold text-ekush-orange hover:bg-[#FFE9D8]"
        >
          + Top-level button
        </button>
      </header>

      {err ? <p className="mb-3 text-sm text-red-600">{err}</p> : null}

      {topLevel.length === 0 ? (
        <p className="rounded border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-[12px] text-[#8A8A8A]">
          No quick replies yet. Add the first top-level button above.
        </p>
      ) : (
        <ul className="space-y-3">
          {topLevel.map((row, i) => (
            <ReplyRow
              key={row.id}
              row={row}
              depth={0}
              isFirst={i === 0}
              isLast={i === topLevel.length - 1}
              childrenByParent={childrenByParent}
              onMove={(dir) => move(row, dir)}
              onEdit={() => startEdit(row)}
              onRemove={() => remove(row.id)}
              onAddChild={() => startCreate(row.id)}
              onMoveChild={(child, dir) => move(child, dir)}
              onEditChild={(child) => startEdit(child)}
              onRemoveChild={(child) => remove(child.id)}
              onCreateGrandchild={(child) => startCreate(child.id)}
            />
          ))}
        </ul>
      )}

      {editing ? (
        <ReplyEditor
          draft={editing}
          allReplies={rows}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      ) : null}
    </section>
  );
}

function ReplyRow({
  row,
  depth,
  isFirst,
  isLast,
  childrenByParent,
  onMove,
  onEdit,
  onRemove,
  onAddChild,
  onMoveChild,
  onEditChild,
  onRemoveChild,
  onCreateGrandchild,
}: {
  row: Reply;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
  childrenByParent: Map<string | null, Reply[]>;
  onMove: (dir: -1 | 1) => void;
  onEdit: () => void;
  onRemove: () => void;
  onAddChild: () => void;
  onMoveChild: (child: Reply, dir: -1 | 1) => void;
  onEditChild: (child: Reply) => void;
  onRemoveChild: (child: Reply) => void;
  onCreateGrandchild: (child: Reply) => void;
}) {
  const kids = childrenByParent.get(row.id) ?? [];
  return (
    <li className="rounded-md border border-gray-200 bg-white">
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="font-mono text-[10px] text-[#8A8A8A]">
          {row.displayOrder}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-medium">{row.labelEn}</span>
            <span className="text-[11px] text-[#8A8A8A]">— {row.labelBn}</span>
            {row.isContactCard ? (
              <span className="rounded-full bg-[#FFF4EC] px-1.5 py-0.5 text-[10px] font-semibold text-ekush-orange">
                Contact card
              </span>
            ) : null}
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
              {row.surface}
            </span>
            {!row.isPublished ? (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                Hidden
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="rounded border border-gray-200 px-1.5 text-[11px] disabled:opacity-30"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={isLast}
            className="rounded border border-gray-200 px-1.5 text-[11px] disabled:opacity-30"
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded border border-red-200 bg-white px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50"
          >
            ✕
          </button>
        </div>
      </div>
      {/* Children — only one level shown nested visually; deeper levels
          still work via parent select but render flatter to keep the
          admin tree legible. */}
      {kids.length > 0 ? (
        <ul className="space-y-1 border-t border-gray-100 bg-gray-50 px-3 py-2">
          {kids.map((c, i) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded border border-gray-200 bg-white px-2 py-1"
            >
              <span className="font-mono text-[10px] text-[#8A8A8A]">
                {c.displayOrder}
              </span>
              <span className="flex-1 text-[12px]">
                <span className="font-medium">{c.labelEn}</span>
                <span className="ml-1 text-[10px] text-[#8A8A8A]">
                  — {c.labelBn}
                </span>
                {c.isContactCard ? (
                  <span className="ml-2 rounded-full bg-[#FFF4EC] px-1.5 py-0.5 text-[10px] font-semibold text-ekush-orange">
                    Contact
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => onMoveChild(c, -1)}
                disabled={i === 0}
                className="rounded border border-gray-200 px-1 text-[10px] disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onMoveChild(c, 1)}
                disabled={i === kids.length - 1}
                className="rounded border border-gray-200 px-1 text-[10px] disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onEditChild(c)}
                className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onCreateGrandchild(c)}
                className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] hover:bg-gray-50"
                title="Add child"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => onRemoveChild(c)}
                className="rounded border border-red-200 bg-white px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-50"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {depth === 0 ? (
        <div className="border-t border-gray-100 px-3 py-2">
          <button
            type="button"
            onClick={onAddChild}
            className="text-[11px] font-semibold text-ekush-orange hover:underline"
          >
            + Add a sub-button under &ldquo;{row.labelEn}&rdquo;
          </button>
        </div>
      ) : null}
    </li>
  );
}

// ──────────────────────────────────────────────────────────
// Edit modal
// ──────────────────────────────────────────────────────────
function ReplyEditor({
  draft,
  allReplies,
  onCancel,
  onSave,
}: {
  draft: ReplyDraft;
  allReplies: Reply[];
  onCancel: () => void;
  onSave: (draft: ReplyDraft) => Promise<void>;
}) {
  const [form, setForm] = useState<ReplyDraft>(draft);

  // Build a flat parent-picker list excluding self and any descendant
  // (cycles would make the cycle protector reject the save).
  const parentOptions = useMemo(() => {
    const banned = new Set<string>();
    if (form.id) {
      banned.add(form.id);
      let grew = true;
      while (grew) {
        grew = false;
        for (const r of allReplies) {
          if (r.parentId && banned.has(r.parentId) && !banned.has(r.id)) {
            banned.add(r.id);
            grew = true;
          }
        }
      }
    }
    return allReplies
      .filter((r) => !banned.has(r.id))
      .map((r) => ({ id: r.id, label: r.labelEn }));
  }, [allReplies, form.id]);

  return (
    <div
      role="dialog"
      aria-label="Edit quick reply"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
      >
        <header className="mb-3">
          <h3 className="text-[15px] font-semibold">
            {form.isNew ? "New quick reply" : "Edit quick reply"}
          </h3>
          <p className="text-[11px] text-[#8A8A8A]">
            Both English and Bangla are required so the chat works under either
            language toggle.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Label (English)">
            <input
              type="text"
              value={form.labelEn}
              onChange={(e) =>
                setForm((f) => ({ ...f, labelEn: e.target.value }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Label (Bangla)">
            <input
              type="text"
              value={form.labelBn}
              onChange={(e) =>
                setForm((f) => ({ ...f, labelBn: e.target.value }))
              }
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-3">
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 p-2 text-[12px]">
            <input
              type="checkbox"
              checked={form.isContactCard}
              onChange={(e) =>
                setForm((f) => ({ ...f, isContactCard: e.target.checked }))
              }
              className="mt-0.5 h-4 w-4 accent-ekush-orange"
            />
            <span>
              <span className="block font-medium">Contact card</span>
              <span className="text-[11px] text-[#8A8A8A]">
                Replaces the response below with a Call / WhatsApp button pair
                that uses the global phone + WhatsApp from Settings.
              </span>
            </span>
          </label>
        </div>

        {!form.isContactCard ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Response (English)">
              <textarea
                rows={5}
                value={form.responseEn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, responseEn: e.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Response (Bangla)">
              <textarea
                rows={5}
                value={form.responseBn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, responseBn: e.target.value }))
                }
                className={inputClass}
              />
            </Field>
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Surface">
            <select
              value={form.surface}
              onChange={(e) =>
                setForm((f) => ({ ...f, surface: e.target.value }))
              }
              className={inputClass}
            >
              {SURFACES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Parent button (optional)">
            <select
              value={form.parentId ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  parentId: e.target.value === "" ? null : e.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="">— top-level —</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Display order" hint="Lower number first.">
            <input
              type="number"
              step="1"
              value={form.displayOrder}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  displayOrder: Number(e.target.value) || 0,
                }))
              }
              className={inputClass}
            />
          </Field>
          <label className="flex cursor-pointer items-start gap-2 self-end rounded-md border border-gray-200 p-2 text-[12px]">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) =>
                setForm((f) => ({ ...f, isPublished: e.target.checked }))
              }
              className="mt-0.5 h-4 w-4 accent-ekush-orange"
            />
            <span>
              <span className="block font-medium">Published</span>
              <span className="text-[11px] text-[#8A8A8A]">
                Drafts stay invisible to public + portal users.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            className="rounded-md bg-ekush-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {form.isNew ? "Create" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Inputs
// ──────────────────────────────────────────────────────────
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-text-body">
        {label}
      </span>
      <span className="mt-1 block">{children}</span>
      {hint ? (
        <span className="mt-1 block text-[11px] text-[#8A8A8A]">{hint}</span>
      ) : null}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-ekush-orange"
      />
      <span>
        <span className="block text-[13px] font-medium">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] text-[#8A8A8A]">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-ekush-orange focus:outline-none";
