-- Revert split discovery / moments : une seule grille vidéo pour le feed et la découverte.
DROP INDEX IF EXISTS "Video_video_distribution_created_at_idx";
ALTER TABLE "Video" DROP COLUMN IF EXISTS "video_distribution";
