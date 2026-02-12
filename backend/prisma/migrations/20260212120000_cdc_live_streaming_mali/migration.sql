-- CDC Live Streaming Mali
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "total_tips_amount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "age_restriction" TEXT NOT NULL DEFAULT 'all';
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "donations_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "private_mode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "goal_amount" DOUBLE PRECISION;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "goal_target" DOUBLE PRECISION;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "delay_seconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "max_quality" TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "replay_retention_days" INTEGER NOT NULL DEFAULT 14;

ALTER TABLE "LiveModerationSettings" ADD COLUMN IF NOT EXISTS "emoji_only" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "LiveTip" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "sender_id" TEXT,
    "sender_name" TEXT,
    "sender_avatar" TEXT,
    "creator_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "creator_earnings" DOUBLE PRECISION NOT NULL,
    "platform_commission" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveTip_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LiveTip_live_id_idx" ON "LiveTip"("live_id");
CREATE INDEX IF NOT EXISTS "LiveTip_sender_id_idx" ON "LiveTip"("sender_id");
CREATE INDEX IF NOT EXISTS "LiveTip_creator_id_idx" ON "LiveTip"("creator_id");

DO $$ BEGIN
 ALTER TABLE "LiveTip" ADD CONSTRAINT "LiveTip_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
