-- CDC Phase 1: Système publicitaire complet
-- In-Feed Ads, campagnes, tarification FCFA, ciblage, dashboard annonceur

-- AdCampaign: campagne publicitaire
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "advertiser_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft', -- draft | pending_review | approved | active | paused | expired
    "ad_type" TEXT NOT NULL DEFAULT 'in_feed', -- in_feed | sponsored_video | business_campaign | story
    "duration_days" INTEGER NOT NULL, -- 1, 3, 7, 14, 30, 60, 90
    "price_fcfa" DOUBLE PRECISION NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "target_countries" TEXT[] DEFAULT '{}',
    "target_cities" TEXT[] DEFAULT '{}',
    "target_age_min" INTEGER,
    "target_age_max" INTEGER,
    "target_gender" TEXT, -- male | female | all
    "target_interests" TEXT[] DEFAULT '{}',
    "total_views" INTEGER NOT NULL DEFAULT 0,
    "total_clicks" INTEGER NOT NULL DEFAULT 0,
    "total_spent_fcfa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdCampaign_advertiser_id_idx" ON "AdCampaign"("advertiser_id");
CREATE INDEX "AdCampaign_status_idx" ON "AdCampaign"("status");
CREATE INDEX "AdCampaign_ends_at_idx" ON "AdCampaign"("ends_at");
CREATE INDEX "AdCampaign_status_ends_at_idx" ON "AdCampaign"("status", "ends_at");

-- AdCreative: contenu publicitaire (vidéo/image, CTA)
CREATE TABLE "AdCreative" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "media_type" TEXT NOT NULL, -- video | image
    "media_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "title" TEXT,
    "description" TEXT,
    "cta_type" TEXT NOT NULL DEFAULT 'visit', -- buy | visit | install
    "cta_url" TEXT,
    "cta_label" TEXT DEFAULT 'Découvrir',
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCreative_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdCreative_campaign_id_idx" ON "AdCreative"("campaign_id");
CREATE INDEX "AdCreative_is_approved_idx" ON "AdCreative"("is_approved");

-- AdImpression: suivi des vues
CREATE TABLE "AdImpression" (
    "id" TEXT NOT NULL,
    "creative_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "viewer_key" TEXT NOT NULL, -- "u:{userId}" ou "d:{deviceId}"
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdImpression_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdImpression_creative_id_idx" ON "AdImpression"("creative_id");
CREATE INDEX "AdImpression_campaign_id_idx" ON "AdImpression"("campaign_id");
CREATE INDEX "AdImpression_viewed_at_idx" ON "AdImpression"("viewed_at");

-- AdClick: suivi des clics
CREATE TABLE "AdClick" (
    "id" TEXT NOT NULL,
    "creative_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "viewer_key" TEXT NOT NULL,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdClick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdClick_creative_id_idx" ON "AdClick"("creative_id");
CREATE INDEX "AdClick_campaign_id_idx" ON "AdClick"("campaign_id");
CREATE INDEX "AdClick_clicked_at_idx" ON "AdClick"("clicked_at");

-- CreatorSubscription: abonnement Premium créateur (Basic 1000, Pro 3000 FCFA/mois)
CREATE TABLE "CreatorSubscription" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL, -- basic | pro
    "price_fcfa" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active', -- active | cancelled | expired
    "starts_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "payment_method" TEXT,
    "transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreatorSubscription_creator_id_idx" ON "CreatorSubscription"("creator_id");
CREATE INDEX "CreatorSubscription_status_expires_idx" ON "CreatorSubscription"("status", "expires_at");

-- CreatorSupport: soutien direct créateur (bouton Soutenir)
CREATE TABLE "CreatorSupport" (
    "id" TEXT NOT NULL,
    "supporter_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "amount_fcfa" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "payment_method" TEXT NOT NULL DEFAULT 'wallet',
    "transaction_id" TEXT,
    "creator_earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platform_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorSupport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreatorSupport_creator_id_idx" ON "CreatorSupport"("creator_id");
CREATE INDEX "CreatorSupport_supporter_id_idx" ON "CreatorSupport"("supporter_id");

-- PlatformRevenue: agrégation revenus plateforme (pub 100%, gifts 30%, marketplace commission)
CREATE TABLE "PlatformRevenue" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL, -- ads | gifts_tips | marketplace
    "amount_fcfa" DOUBLE PRECISION NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformRevenue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformRevenue_source_idx" ON "PlatformRevenue"("source");
CREATE INDEX "PlatformRevenue_recorded_at_idx" ON "PlatformRevenue"("recorded_at");

-- Foreign keys
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdImpression" ADD CONSTRAINT "AdImpression_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "AdCreative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdImpression" ADD CONSTRAINT "AdImpression_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdClick" ADD CONSTRAINT "AdClick_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "AdCreative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdClick" ADD CONSTRAINT "AdClick_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorSubscription" ADD CONSTRAINT "CreatorSubscription_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorSupport" ADD CONSTRAINT "CreatorSupport_supporter_id_fkey" FOREIGN KEY ("supporter_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorSupport" ADD CONSTRAINT "CreatorSupport_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
