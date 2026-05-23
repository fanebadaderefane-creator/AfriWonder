-- Migration Super-app Vagues 5-8 : live commerce + épargne + factures utilitaires
-- AfriWonder 2026-04-24

-- ============ LIVE COMMERCE ============
CREATE TABLE IF NOT EXISTS "LivePinnedProduct" (
  "id"             TEXT PRIMARY KEY,
  "live_stream_id" TEXT NOT NULL REFERENCES "LiveStream"("id") ON DELETE CASCADE,
  "product_id"     TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "pinned_by"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "order_index"    INTEGER NOT NULL DEFAULT 0,
  "is_flash_deal"  BOOLEAN NOT NULL DEFAULT false,
  "flash_price"    DOUBLE PRECISION,
  "flash_ends_at"  TIMESTAMP(3),
  "clicks_count"   INTEGER NOT NULL DEFAULT 0,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("live_stream_id", "product_id")
);
CREATE INDEX IF NOT EXISTS "LivePinnedProduct_live_stream_id_idx" ON "LivePinnedProduct"("live_stream_id");
CREATE INDEX IF NOT EXISTS "LivePinnedProduct_pinned_by_idx" ON "LivePinnedProduct"("pinned_by");

-- ============ ÉPARGNE PROGRAMMÉE ============
CREATE TABLE IF NOT EXISTS "SavingsPlan" (
  "id"                   TEXT PRIMARY KEY,
  "user_id"              TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name"                 TEXT NOT NULL,
  "target_amount"        DOUBLE PRECISION,
  "target_date"          TIMESTAMP(3),
  "contribution_amount"  DOUBLE PRECISION NOT NULL,
  "frequency"            TEXT NOT NULL DEFAULT 'weekly',
  "next_debit_at"        TIMESTAMP(3) NOT NULL,
  "currency"             TEXT NOT NULL DEFAULT 'XOF',
  "balance"              DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status"               TEXT NOT NULL DEFAULT 'active',
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SavingsPlan_user_id_idx" ON "SavingsPlan"("user_id");
CREATE INDEX IF NOT EXISTS "SavingsPlan_status_idx" ON "SavingsPlan"("status");
CREATE INDEX IF NOT EXISTS "SavingsPlan_next_debit_at_idx" ON "SavingsPlan"("next_debit_at");

CREATE TABLE IF NOT EXISTS "SavingsPlanTransaction" (
  "id"         TEXT PRIMARY KEY,
  "plan_id"    TEXT NOT NULL REFERENCES "SavingsPlan"("id") ON DELETE CASCADE,
  "amount"     DOUBLE PRECISION NOT NULL,
  "kind"       TEXT NOT NULL DEFAULT 'contribution',
  "status"     TEXT NOT NULL DEFAULT 'completed',
  "note"       TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SavingsPlanTransaction_plan_id_idx" ON "SavingsPlanTransaction"("plan_id");
CREATE INDEX IF NOT EXISTS "SavingsPlanTransaction_kind_idx" ON "SavingsPlanTransaction"("kind");

-- ============ FACTURES UTILITAIRES (EDM, Somagep, Canal+, Orange TV, Malitel) ============
CREATE TABLE IF NOT EXISTS "UtilityBillProvider" (
  "id"              TEXT PRIMARY KEY,
  "slug"            TEXT UNIQUE NOT NULL,
  "name"            TEXT NOT NULL,
  "category"        TEXT NOT NULL,
  "logo_url"        TEXT,
  "country"         TEXT NOT NULL DEFAULT 'ML',
  "fields_schema"   JSONB NOT NULL,
  "is_active"       BOOLEAN NOT NULL DEFAULT true,
  "provider_config" JSONB,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "UtilityBillProvider_category_idx" ON "UtilityBillProvider"("category");
CREATE INDEX IF NOT EXISTS "UtilityBillProvider_is_active_idx" ON "UtilityBillProvider"("is_active");

CREATE TABLE IF NOT EXISTS "UtilityBillPayment" (
  "id"             TEXT PRIMARY KEY,
  "user_id"        TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "provider_id"    TEXT NOT NULL REFERENCES "UtilityBillProvider"("id") ON DELETE CASCADE,
  "account_ref"    TEXT NOT NULL,
  "amount_fcfa"    DOUBLE PRECISION NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "payment_method" TEXT,
  "reference"      TEXT UNIQUE NOT NULL,
  "metadata"       JSONB,
  "receipt_url"    TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "UtilityBillPayment_user_id_idx" ON "UtilityBillPayment"("user_id");
CREATE INDEX IF NOT EXISTS "UtilityBillPayment_provider_id_idx" ON "UtilityBillPayment"("provider_id");
CREATE INDEX IF NOT EXISTS "UtilityBillPayment_status_idx" ON "UtilityBillPayment"("status");

-- ============ SEED MINIMAL : providers utilitaires Mali ============
INSERT INTO "UtilityBillProvider" (id, slug, name, category, country, fields_schema, is_active)
VALUES
  (gen_random_uuid()::text, 'edm', 'EDM (Énergie du Mali)', 'electricity', 'ML',
    '{"fields":[{"name":"contract_number","label":"Numéro de contrat","type":"text","required":true}]}'::jsonb, true),
  (gen_random_uuid()::text, 'somagep', 'SOMAGEP (Eau du Mali)', 'water', 'ML',
    '{"fields":[{"name":"contract_number","label":"Numéro abonné","type":"text","required":true}]}'::jsonb, true),
  (gen_random_uuid()::text, 'canal-plus', 'Canal+ Mali', 'tv', 'ML',
    '{"fields":[{"name":"decoder_number","label":"Numéro décodeur","type":"text","required":true}]}'::jsonb, true),
  (gen_random_uuid()::text, 'orange-tv', 'Orange TV', 'tv', 'ML',
    '{"fields":[{"name":"contract_number","label":"Numéro contrat","type":"text","required":true}]}'::jsonb, true),
  (gen_random_uuid()::text, 'malitel-internet', 'Malitel Internet', 'internet', 'ML',
    '{"fields":[{"name":"line_number","label":"Numéro de ligne fixe","type":"text","required":true}]}'::jsonb, true),
  (gen_random_uuid()::text, 'orange-internet', 'Orange Internet', 'internet', 'ML',
    '{"fields":[{"name":"contract_number","label":"Numéro abonné","type":"text","required":true}]}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;
