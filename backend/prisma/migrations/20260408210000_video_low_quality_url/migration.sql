-- Rendu progressif léger (réseaux faibles) — consommé par la PWA (low_quality_playback_url).
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "low_quality_url" TEXT;
