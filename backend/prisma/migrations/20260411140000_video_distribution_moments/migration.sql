-- Fil découverte (TikTok) vs fil social Moments
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "video_distribution" TEXT NOT NULL DEFAULT 'discovery';

CREATE INDEX IF NOT EXISTS "Video_video_distribution_created_at_idx" ON "Video" ("video_distribution", "created_at");
