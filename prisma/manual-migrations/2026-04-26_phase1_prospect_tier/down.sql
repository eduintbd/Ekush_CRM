-- Phase 1 ROLLBACK: Prospect Tier (Tier-1) schema additions
--
-- Reverses up.sql in reverse order. Safe at any point in time as long as
-- application code targeting these tables has been redeployed first
-- (otherwise live writes will 500 trying to INSERT into a dropped table).
--
-- Run via Supabase SQL editor. Then revert prisma/schema.prisma to the
-- pre-Phase-1 commit and run `npm run db:push` to re-sync.
--
-- WARNING: this discards every prospect record, every OTP, every TOTP
-- enrollment, and every login-attempt audit row. Take a backup first
-- if any production data has been written.

-- 1. Drop foreign keys first so the parent rows can be dropped without
-- violating constraints.
ALTER TABLE "investors"
  DROP CONSTRAINT IF EXISTS "investors_linkedProspectId_fkey";

ALTER TABLE "user_totp"
  DROP CONSTRAINT IF EXISTS "user_totp_userId_fkey";

-- 2. Drop the conversion-link column on investors.
ALTER TABLE "investors"
  DROP COLUMN IF EXISTS "linkedProspectId";

-- 3. Drop the four new tables. CASCADE removes their indexes too.
DROP TABLE IF EXISTS "login_attempts" CASCADE;
DROP TABLE IF EXISTS "user_totp"      CASCADE;
DROP TABLE IF EXISTS "otp_codes"      CASCADE;
DROP TABLE IF EXISTS "prospects"      CASCADE;
