-- Sondages dans les groupes (CDC messagerie)
ALTER TABLE "GroupMessage" ADD COLUMN IF NOT EXISTS "poll_options" JSONB;
ALTER TABLE "GroupMessage" ADD COLUMN IF NOT EXISTS "poll_votes" JSONB;
