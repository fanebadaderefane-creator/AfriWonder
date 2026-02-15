-- AfriWonder: Complétion prompt monétisation
-- shadow_banned, algo_tier, QualifiedVideoView, ViralBonus, CreatorReferralReward

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "shadow_banned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "algo_tier" TEXT DEFAULT 'test';

CREATE TABLE IF NOT EXISTS "QualifiedVideoView" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "viewer_key" TEXT NOT NULL,
    "watch_seconds" INTEGER NOT NULL DEFAULT 0,
    "time_bucket" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QualifiedVideoView_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QualifiedVideoView_video_id_viewer_key_time_bucket_key" ON "QualifiedVideoView"("video_id", "viewer_key", "time_bucket");
CREATE INDEX IF NOT EXISTS "QualifiedVideoView_video_id_idx" ON "QualifiedVideoView"("video_id");

CREATE TABLE IF NOT EXISTS "ViralBonus" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "milestone" TEXT NOT NULL,
    "amount_fcfa" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ViralBonus_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ViralBonus_creator_id_idx" ON "ViralBonus"("creator_id");
CREATE INDEX IF NOT EXISTS "ViralBonus_video_id_idx" ON "ViralBonus"("video_id");

CREATE TABLE IF NOT EXISTS "CreatorReferralReward" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "invites_count" INTEGER NOT NULL,
    "reward_type" TEXT NOT NULL,
    "reward_value" TEXT,
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreatorReferralReward_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CreatorReferralReward_user_id_idx" ON "CreatorReferralReward"("user_id");
