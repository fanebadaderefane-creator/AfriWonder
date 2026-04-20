-- Phase 9 : CoinPackage, User.is_afriwonder_pro, AdCampaign CPM/budget, BrandDeal extensions

CREATE TABLE "CoinPackage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coins_amount" INTEGER NOT NULL,
    "price_fcfa" INTEGER NOT NULL,
    "price_usd" DOUBLE PRECISION,
    "bonus_coins" INTEGER NOT NULL DEFAULT 0,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoinPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoinPackage_slug_key" ON "CoinPackage"("slug");
CREATE INDEX "CoinPackage_is_active_sort_order_idx" ON "CoinPackage"("is_active", "sort_order");

ALTER TABLE "User" ADD COLUMN "is_afriwonder_pro" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AdCampaign" ADD COLUMN "billing_mode" TEXT NOT NULL DEFAULT 'legacy_package';
ALTER TABLE "AdCampaign" ADD COLUMN "cpm_fcfa" DOUBLE PRECISION NOT NULL DEFAULT 500;
ALTER TABLE "AdCampaign" ADD COLUMN "budget_remaining_fcfa" DOUBLE PRECISION;

UPDATE "AdCampaign" SET "billing_mode" = 'legacy_package' WHERE "billing_mode" IS NULL;

ALTER TABLE "BrandDeal" ADD COLUMN "deliverables" JSONB;
ALTER TABLE "BrandDeal" ADD COLUMN "brief_url" TEXT;
ALTER TABLE "BrandDeal" ADD COLUMN "brand_user_id" TEXT;
ALTER TABLE "BrandDeal" ADD COLUMN "platform_fee_pct" DOUBLE PRECISION NOT NULL DEFAULT 0.10;

CREATE INDEX "BrandDeal_brand_user_id_idx" ON "BrandDeal"("brand_user_id");
