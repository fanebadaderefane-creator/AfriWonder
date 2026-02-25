-- Add media_type to Video: "video" | "image" for feed display (photos without video UI)
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "media_type" TEXT DEFAULT 'video';
