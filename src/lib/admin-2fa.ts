// Phase 9 — grace-period helpers for admin 2FA rollout.
//
// `ADMIN_2FA_LAUNCH` env var (YYYY-MM-DD) is the reference date.
// Within `ADMIN_2FA_GRACE_DAYS` of that date we warn but allow login;
// after the window closes, staff users without a confirmed UserTotp
// enrolment are blocked with a "contact a Super Admin" message.
//
// If the env var is absent we treat the feature as off — login flows
// for staff are identical to pre-Phase-9.

export const ADMIN_2FA_GRACE_DAYS = 30;

export function admin2faLaunchDate(): Date | null {
  const raw = process.env.ADMIN_2FA_LAUNCH;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function admin2faDeadline(): Date | null {
  const launch = admin2faLaunchDate();
  if (!launch) return null;
  return new Date(
    launch.getTime() + ADMIN_2FA_GRACE_DAYS * 24 * 60 * 60 * 1000,
  );
}

export type Admin2faState =
  // 2FA hasn't been enabled yet (no env var) — staff sign in
  // exactly as before Phase 9.
  | { status: "disabled" }
  // Within grace window. Block nothing; the login response carries
  // a deadline so the dashboard can render the warning banner.
  | {
      status: "grace";
      deadline: Date;
      daysRemaining: number;
    }
  // Past the grace window. Staff users without enrolledAt are
  // refused; the message tells them to contact a Super Admin.
  | { status: "enforce"; deadline: Date };

export function currentAdmin2faState(now: Date = new Date()): Admin2faState {
  const deadline = admin2faDeadline();
  if (!deadline) return { status: "disabled" };
  if (now >= deadline) return { status: "enforce", deadline };
  const daysRemaining = Math.max(
    0,
    Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
  );
  return { status: "grace", deadline, daysRemaining };
}
