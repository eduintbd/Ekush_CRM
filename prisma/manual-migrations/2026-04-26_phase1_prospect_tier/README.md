# Phase 1 — Prospect Tier schema additions

## What this changes

Adds four new tables and one new column. Nothing existing is modified or
deleted.

| Object | Type | Purpose |
|---|---|---|
| `prospects` | new table | Tier-1 leads (no KYC, phone-keyed login) |
| `otp_codes` | new table | SMS OTP codes (hashed at rest) |
| `user_totp` | new table | Admin 2FA TOTP secrets |
| `login_attempts` | new table | Rate-limit audit for both login realms |
| `investors.linkedProspectId` | new column (nullable) | Tier-1→Tier-2 attribution |

## How to apply (preferred)

```bash
cd Ekush_CRM
npm run db:push
```

`prisma db push` reads `prisma/schema.prisma`, computes the diff against
the live Supabase database, and applies it. The schema change is
purely additive (new tables, new nullable column) so no data loss risk.

## How to apply (manual)

If you want to review the SQL before running it, open
[`up.sql`](./up.sql) in the Supabase SQL editor and execute. The script
is idempotent-aware where possible (`IF NOT EXISTS` is not used on the
CREATE TABLEs since rerunning is not the intended path; the `down.sql`
covers cleanup).

## How to roll back

1. Redeploy application code to a commit that does not reference the new
   tables (any pre-Phase-1 commit). Skipping this step will cause live
   writes to 500 mid-rollback.
2. Run [`down.sql`](./down.sql) in the Supabase SQL editor.
3. Revert `prisma/schema.prisma` to the pre-Phase-1 state and run
   `npm run db:push` to re-sync the client.

## Notes

- The new tables carry no FK back into pre-existing tables except
  `user_totp.userId → users.id` (CASCADE on user delete), so dropping
  them does not affect any other table's data.
- `investors.linkedProspectId` uses `ON DELETE SET NULL`, so deleting a
  prospect later (or via the soft-delete purge cron in Phase 6)
  preserves the investor record and just nulls the attribution link.
