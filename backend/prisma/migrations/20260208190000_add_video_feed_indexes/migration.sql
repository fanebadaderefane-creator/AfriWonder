-- Indexes feed vidéo et performance (schema actuel: creator_id, visibility, category)
CREATE INDEX IF NOT EXISTS "Video_creator_id_created_at_idx" ON "Video"("creator_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "Video_visibility_created_at_idx" ON "Video"("visibility", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "Video_category_idx" ON "Video"("category");
