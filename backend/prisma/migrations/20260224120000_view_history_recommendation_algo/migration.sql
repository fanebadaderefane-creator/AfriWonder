-- AlterTable: ViewHistory - champs pour l'algo de recommandation type TikTok (rétention par user)
ALTER TABLE "ViewHistory" ADD COLUMN IF NOT EXISTS "watch_seconds" INTEGER;
ALTER TABLE "ViewHistory" ADD COLUMN IF NOT EXISTS "watch_percent" DOUBLE PRECISION;
ALTER TABLE "ViewHistory" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "ViewHistory_user_id_updated_at_idx" ON "ViewHistory"("user_id", "updated_at");
