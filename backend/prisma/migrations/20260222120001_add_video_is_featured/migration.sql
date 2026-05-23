-- AlterTable
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Video_is_featured_idx" ON "Video"("is_featured");
