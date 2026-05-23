-- AlterTable: Video.qualified_views_count (vues qualifiées ≥5 sec, pour monétisation)
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "qualified_views_count" INTEGER NOT NULL DEFAULT 0;
