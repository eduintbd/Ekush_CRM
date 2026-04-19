// Central role + permission module.
//
// Four staff roles + one investor role. Everything that gates on role — from
// middleware to API handlers to UI visibility — should import from here, not
// inline the strings.
//
//   SUPER_ADMIN → full access, the only role that can manage team
//   MAKER       → creates & edits data (investors, NAV, content, etc.)
//   CHECKER     → approves maker-created requests and KYC registrations
//   VIEWER      → read-only: reports, statements, mail, tickets
//   INVESTOR    → end-user investor account (not staff)

export type StaffRole = "SUPER_ADMIN" | "MAKER" | "CHECKER" | "VIEWER";
export type UserRole = StaffRole | "INVESTOR";

// Widened to `readonly string[]` so ergonomic .includes(role) calls work
// with the arbitrary session-string role value.
export const STAFF_ROLES: readonly string[] = [
  "SUPER_ADMIN",
  "MAKER",
  "CHECKER",
  "VIEWER",
];

// Role groups used to gate API routes. Prefer can(role, ACTION) in new code;
// these sets exist for the middleware-level "can this role access /admin at
// all" check and the ubiquitous inline role-array pattern.
export const EDIT_ROLES: readonly string[] = ["SUPER_ADMIN", "MAKER"];
export const APPROVE_ROLES: readonly string[] = ["SUPER_ADMIN", "CHECKER"];
export const SUPER_ROLES: readonly string[] = ["SUPER_ADMIN"];

// Actions map — single source of truth for "who can do what". Keep flat: no
// role hierarchy, no per-resource ACLs — role alone determines access (per
// spec). Add a new entry here when you add a new protected operation.
export const ACTIONS = {
  VIEW_ADMIN_PANEL:    ["SUPER_ADMIN", "MAKER", "CHECKER", "VIEWER"],
  DOWNLOAD_REPORT:     ["SUPER_ADMIN", "MAKER", "CHECKER", "VIEWER"],
  VIEW_INVESTORS:      ["SUPER_ADMIN", "MAKER", "CHECKER", "VIEWER"],
  RESPOND_TICKET:      ["SUPER_ADMIN", "MAKER", "CHECKER", "VIEWER"],

  EDIT_INVESTOR:       ["SUPER_ADMIN", "MAKER"],
  EDIT_DATA_ENTRY:     ["SUPER_ADMIN", "MAKER"], // NAV insert, daily uploads, content CRUD
  SEND_MAIL:           ["SUPER_ADMIN", "MAKER"],
  UPLOAD_FUND_REPORT:  ["SUPER_ADMIN", "MAKER"],

  APPROVE_REQUEST:     ["SUPER_ADMIN", "CHECKER"], // maker-checker approvals
  APPROVE_KYC:         ["SUPER_ADMIN", "CHECKER"], // pending-investor approval
  APPROVE_BANK:        ["SUPER_ADMIN", "CHECKER"],

  VIEW_AUDIT_LOG:      ["SUPER_ADMIN", "CHECKER"],
  VIEW_OWN_AUDIT_LOG:  ["SUPER_ADMIN", "MAKER", "CHECKER"],

  MANAGE_TEAM:         ["SUPER_ADMIN"],
  DELETE_INVESTOR:     ["SUPER_ADMIN"],
  EDIT_NOTIFICATIONS:  ["SUPER_ADMIN"], // SMTP settings, notification windows
} as const;

export type Action = keyof typeof ACTIONS;

export function can(role: string | null | undefined, action: Action): boolean {
  if (!role) return false;
  return (ACTIONS[action] as readonly string[]).includes(role);
}

export function isStaff(role: string | null | undefined): boolean {
  if (!role) return false;
  return (STAFF_ROLES as readonly string[]).includes(role);
}

// Maker-checker separation of duties: a user cannot approve a request they
// themselves created, even if they hold both MAKER and CHECKER capabilities
// (e.g. Super Admin). Caller must supply the maker (creator) id.
export function canApproveRequest(
  role: string | null | undefined,
  userId: string | null | undefined,
  makerId: string | null | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (!can(role, "APPROVE_REQUEST")) {
    return { ok: false, reason: "Your role cannot approve requests." };
  }
  if (userId && makerId && userId === makerId) {
    return {
      ok: false,
      reason: "You cannot approve a request you created yourself (maker-checker rule).",
    };
  }
  return { ok: true };
}

// Human-readable labels for UI rendering.
export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  MAKER: "Maker",
  CHECKER: "Checker",
  VIEWER: "Viewer",
  INVESTOR: "Investor",
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  SUPER_ADMIN: "Full access. Only role that can invite teammates and change roles.",
  MAKER: "Creates and edits investor data, NAV entries, and content.",
  CHECKER: "Approves maker-created requests and new-investor KYC.",
  VIEWER: "Read-only: reports, statements, mail, tickets.",
};
