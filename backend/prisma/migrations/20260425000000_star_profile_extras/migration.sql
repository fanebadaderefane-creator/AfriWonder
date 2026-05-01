-- Star profile extras : ID public unique, catégorie, pays, tier, featured
-- Migration purement additive, aucun champ existant n'est modifié.

ALTER TABLE "StarProfile"
  ADD COLUMN IF NOT EXISTS "display_id"  INTEGER,
  ADD COLUMN IF NOT EXISTS "category"    VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "country"     VARCHAR(2),
  ADD COLUMN IF NOT EXISTS "tier"        VARCHAR(20) NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN     NOT NULL DEFAULT false;

-- Unicité du display_id quand il est renseigné
CREATE UNIQUE INDEX IF NOT EXISTS "StarProfile_display_id_key"
  ON "StarProfile"("display_id");

-- Index pour la discovery
CREATE INDEX IF NOT EXISTS "StarProfile_category_idx"    ON "StarProfile"("category");
CREATE INDEX IF NOT EXISTS "StarProfile_tier_idx"        ON "StarProfile"("tier");
CREATE INDEX IF NOT EXISTS "StarProfile_is_featured_idx" ON "StarProfile"("is_featured");
