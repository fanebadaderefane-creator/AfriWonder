-- Enterprise 100: User suspension, Blacklist, AuditEvent, FeatureFlag, TransactionFlag (AML)

-- User: account suspension
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "account_suspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspended_reason" TEXT;

-- Blacklist
CREATE TABLE IF NOT EXISTS "blacklist_entries" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "created_by" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blacklist_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "blacklist_entries_type_value_idx" ON "blacklist_entries"("type", "value");
CREATE INDEX IF NOT EXISTS "blacklist_entries_expires_at_idx" ON "blacklist_entries"("expires_at");

-- Audit events
CREATE TABLE IF NOT EXISTS "audit_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "target_type" TEXT,
    "target_id" TEXT,
    "payload" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "audit_events_event_type_idx" ON "audit_events"("event_type");
CREATE INDEX IF NOT EXISTS "audit_events_actor_id_idx" ON "audit_events"("actor_id");
CREATE INDEX IF NOT EXISTS "audit_events_target_idx" ON "audit_events"("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "audit_events_created_at_idx" ON "audit_events"("created_at");

-- Feature flags
CREATE TABLE IF NOT EXISTS "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_key_key" ON "feature_flags"("key");

-- AML transaction flags
CREATE TABLE IF NOT EXISTS "transaction_flags" (
    "id" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    CONSTRAINT "transaction_flags_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "transaction_flags_user_id_idx" ON "transaction_flags"("user_id");
CREATE INDEX IF NOT EXISTS "transaction_flags_status_idx" ON "transaction_flags"("status");
CREATE INDEX IF NOT EXISTS "transaction_flags_created_at_idx" ON "transaction_flags"("created_at");
