-- Migration : Tontines digitales (épargne rotative africaine)
-- Créée le 2026-04-24 pour AfriWonder Vague 1

-- Table Tontine
CREATE TABLE IF NOT EXISTS "Tontine" (
  "id"                  TEXT PRIMARY KEY,
  "name"                TEXT NOT NULL,
  "description"         TEXT,
  "creator_id"          TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "currency"            TEXT NOT NULL DEFAULT 'XOF',
  "contribution_amount" DOUBLE PRECISION NOT NULL,
  "max_members"         INTEGER NOT NULL,
  "frequency"           TEXT NOT NULL DEFAULT 'monthly',
  "status"              TEXT NOT NULL DEFAULT 'draft',
  "starts_at"           TIMESTAMP(3),
  "ends_at"             TIMESTAMP(3),
  "payout_order_mode"   TEXT NOT NULL DEFAULT 'random',
  "invite_code"         TEXT UNIQUE NOT NULL,
  "rules"               JSONB,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Tontine_creator_id_idx" ON "Tontine"("creator_id");
CREATE INDEX IF NOT EXISTS "Tontine_status_idx" ON "Tontine"("status");
CREATE INDEX IF NOT EXISTS "Tontine_invite_code_idx" ON "Tontine"("invite_code");

-- Table TontineMember
CREATE TABLE IF NOT EXISTS "TontineMember" (
  "id"           TEXT PRIMARY KEY,
  "tontine_id"   TEXT NOT NULL REFERENCES "Tontine"("id") ON DELETE CASCADE,
  "user_id"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "payout_order" INTEGER NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'invited',
  "joined_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("tontine_id", "user_id")
);
CREATE INDEX IF NOT EXISTS "TontineMember_tontine_id_idx" ON "TontineMember"("tontine_id");
CREATE INDEX IF NOT EXISTS "TontineMember_user_id_idx" ON "TontineMember"("user_id");
CREATE INDEX IF NOT EXISTS "TontineMember_status_idx" ON "TontineMember"("status");

-- Table TontineCycle
CREATE TABLE IF NOT EXISTS "TontineCycle" (
  "id"                  TEXT PRIMARY KEY,
  "tontine_id"          TEXT NOT NULL REFERENCES "Tontine"("id") ON DELETE CASCADE,
  "cycle_number"        INTEGER NOT NULL,
  "beneficiary_user_id" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "total_amount"        DOUBLE PRECISION NOT NULL,
  "status"              TEXT NOT NULL DEFAULT 'pending',
  "opens_at"            TIMESTAMP(3) NOT NULL,
  "due_at"              TIMESTAMP(3) NOT NULL,
  "paid_at"             TIMESTAMP(3),
  "contributions"       JSONB,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("tontine_id", "cycle_number")
);
CREATE INDEX IF NOT EXISTS "TontineCycle_tontine_id_idx" ON "TontineCycle"("tontine_id");
CREATE INDEX IF NOT EXISTS "TontineCycle_beneficiary_user_id_idx" ON "TontineCycle"("beneficiary_user_id");
CREATE INDEX IF NOT EXISTS "TontineCycle_status_idx" ON "TontineCycle"("status");
CREATE INDEX IF NOT EXISTS "TontineCycle_due_at_idx" ON "TontineCycle"("due_at");
