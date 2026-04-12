-- Commentaires vidéo : pièce jointe audio (commentaire vocal)
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "audio_url" TEXT;
