-- AlterTable Video: trim + filter
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "trim_start_sec" INTEGER;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "trim_end_sec" INTEGER;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "filter_id" TEXT;

-- CreateTable VideoFilter
CREATE TABLE IF NOT EXISTS "VideoFilter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoFilter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VideoFilter_is_active_idx" ON "VideoFilter"("is_active");

-- CreateTable StickerPack
CREATE TABLE IF NOT EXISTS "StickerPack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StickerPack_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StickerPack_is_active_idx" ON "StickerPack"("is_active");

-- CreateTable Sticker
CREATE TABLE IF NOT EXISTS "Sticker" (
    "id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "emoji" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sticker_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Sticker_pack_id_idx" ON "Sticker"("pack_id");
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "StickerPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable GroupCall
CREATE TABLE IF NOT EXISTS "GroupCall" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "type" TEXT NOT NULL DEFAULT 'video',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupCall_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "GroupCall_room_id_key" ON "GroupCall"("room_id");
CREATE INDEX IF NOT EXISTS "GroupCall_creator_id_idx" ON "GroupCall"("creator_id");
CREATE INDEX IF NOT EXISTS "GroupCall_room_id_idx" ON "GroupCall"("room_id");
CREATE INDEX IF NOT EXISTS "GroupCall_status_idx" ON "GroupCall"("status");
ALTER TABLE "GroupCall" ADD CONSTRAINT "GroupCall_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable GroupCallParticipant
CREATE TABLE IF NOT EXISTS "GroupCallParticipant" (
    "id" TEXT NOT NULL,
    "call_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "role" TEXT NOT NULL DEFAULT 'participant',
    CONSTRAINT "GroupCallParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "GroupCallParticipant_call_id_user_id_key" ON "GroupCallParticipant"("call_id", "user_id");
CREATE INDEX IF NOT EXISTS "GroupCallParticipant_call_id_idx" ON "GroupCallParticipant"("call_id");
CREATE INDEX IF NOT EXISTS "GroupCallParticipant_user_id_idx" ON "GroupCallParticipant"("user_id");
ALTER TABLE "GroupCallParticipant" ADD CONSTRAINT "GroupCallParticipant_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "GroupCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupCallParticipant" ADD CONSTRAINT "GroupCallParticipant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable BrandDeal
CREATE TABLE IF NOT EXISTS "BrandDeal" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" DOUBLE PRECISION,
    "currency" TEXT,
    "campaign_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandDeal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BrandDeal_creator_id_idx" ON "BrandDeal"("creator_id");
CREATE INDEX IF NOT EXISTS "BrandDeal_status_idx" ON "BrandDeal"("status");
ALTER TABLE "BrandDeal" ADD CONSTRAINT "BrandDeal_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable UserSession
CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT,
    "user_agent" TEXT,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UserSession_user_id_idx" ON "UserSession"("user_id");
CREATE INDEX IF NOT EXISTS "UserSession_last_seen_idx" ON "UserSession"("last_seen");
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable PublicService
CREATE TABLE IF NOT EXISTS "PublicService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "link_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicService_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PublicService_slug_key" ON "PublicService"("slug");
CREATE INDEX IF NOT EXISTS "PublicService_slug_idx" ON "PublicService"("slug");
CREATE INDEX IF NOT EXISTS "PublicService_is_active_idx" ON "PublicService"("is_active");

-- Video.filter_id FK (after VideoFilter exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Video_filter_id_fkey'
  ) THEN
    ALTER TABLE "Video" ADD CONSTRAINT "Video_filter_id_fkey" FOREIGN KEY ("filter_id") REFERENCES "VideoFilter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Video_filter_id_idx" ON "Video"("filter_id");
