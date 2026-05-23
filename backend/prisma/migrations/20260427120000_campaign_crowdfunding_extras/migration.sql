-- Enrichissement campagnes crowdfunding (catégorie, visuel, paliers JSON)
ALTER TABLE "Campaign" ADD COLUMN "category" TEXT,
ADD COLUMN "cover_image" TEXT,
ADD COLUMN "rewards_data" JSONB;

CREATE INDEX "Campaign_category_idx" ON "Campaign"("category");
