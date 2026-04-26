-- Phase 1: Prospect Tier (Tier-1) schema additions
--
-- Apply with `npm run db:push` (preferred — uses the schema as source of
-- truth) or by running this file directly against the Supabase Postgres
-- via the SQL editor. Both are equivalent; this script is the diff Prisma
-- would emit, kept here for review and rollback.
--
-- Touches FOUR new tables and ONE new column on `investors`. No data
-- migration; everything is additive and nullable. Existing reads/writes
-- are untouched.

-- ──────────────────────────────────────────────────────────────────
-- 1. New column on `investors` (Tier-1 → Tier-2 conversion link)
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE "investors"
  ADD COLUMN "linkedProspectId" TEXT;

-- ──────────────────────────────────────────────────────────────────
-- 2. `prospects` — Tier 1 leads (no KYC, phone-keyed login)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE "prospects" (
    "id"                 TEXT NOT NULL,
    "phone"              TEXT NOT NULL,
    "phoneVerified"      BOOLEAN NOT NULL DEFAULT false,
    "supabaseId"         TEXT,
    "name"               TEXT NOT NULL,
    "email"              TEXT,
    "passwordHash"       TEXT NOT NULL,
    "interest"           TEXT NOT NULL,
    "source"             TEXT,
    "marketingConsent"   BOOLEAN NOT NULL DEFAULT false,
    "marketingConsentAt" TIMESTAMP(3),
    "kycSubmitted"       BOOLEAN NOT NULL DEFAULT false,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,
    "lastLoginAt"        TIMESTAMP(3),
    "deletedAt"          TIMESTAMP(3),

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- ──────────────────────────────────────────────────────────────────
-- 3. `otp_codes` — SMS one-time-passwords (hashed at rest)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE "otp_codes" (
    "id"          TEXT NOT NULL,
    "phone"       TEXT NOT NULL,
    "codeHash"    TEXT NOT NULL,
    "purpose"     TEXT NOT NULL DEFAULT 'PROSPECT_SIGNUP',
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "consumedAt"  TIMESTAMP(3),
    "attempts"    INTEGER NOT NULL DEFAULT 0,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- ──────────────────────────────────────────────────────────────────
-- 4. `user_totp` — admin 2FA (TOTP) secrets
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE "user_totp" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "secret"     TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_totp_pkey" PRIMARY KEY ("id")
);

-- ──────────────────────────────────────────────────────────────────
-- 5. `login_attempts` — rate-limit counter for both login realms
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE "login_attempts" (
    "id"         TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "ipAddress"  TEXT NOT NULL,
    "realm"      TEXT NOT NULL,
    "success"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- ──────────────────────────────────────────────────────────────────
-- 6. Indexes
-- ──────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "investors_linkedProspectId_key"
  ON "investors"("linkedProspectId");

CREATE UNIQUE INDEX "prospects_phone_key"
  ON "prospects"("phone");

CREATE UNIQUE INDEX "prospects_supabaseId_key"
  ON "prospects"("supabaseId");

CREATE INDEX "prospects_deletedAt_idx"
  ON "prospects"("deletedAt");

CREATE INDEX "prospects_createdAt_idx"
  ON "prospects"("createdAt");

CREATE INDEX "otp_codes_phone_purpose_idx"
  ON "otp_codes"("phone", "purpose");

CREATE INDEX "otp_codes_expiresAt_idx"
  ON "otp_codes"("expiresAt");

CREATE UNIQUE INDEX "user_totp_userId_key"
  ON "user_totp"("userId");

CREATE INDEX "login_attempts_identifier_ipAddress_realm_createdAt_idx"
  ON "login_attempts"("identifier", "ipAddress", "realm", "createdAt");

CREATE INDEX "login_attempts_createdAt_idx"
  ON "login_attempts"("createdAt");

-- ──────────────────────────────────────────────────────────────────
-- 7. Foreign keys
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE "investors"
  ADD CONSTRAINT "investors_linkedProspectId_fkey"
  FOREIGN KEY ("linkedProspectId")
  REFERENCES "prospects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_totp"
  ADD CONSTRAINT "user_totp_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
