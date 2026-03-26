-- CDC messagerie : préférences modération stockées sur le profil
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "messaging_cdc_moderation" JSONB;
