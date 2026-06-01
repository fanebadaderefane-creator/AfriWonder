-- Masquer un message « pour moi » (sync multi-appareils)
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "hidden_from_user_ids" JSONB;
ALTER TABLE "GroupMessage" ADD COLUMN IF NOT EXISTS "hidden_from_user_ids" JSONB;
