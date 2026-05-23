-- Effacer le contenu (pour moi) : filtre des messages par date côté utilisateur
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "cleared_before_at_user1" TIMESTAMP(3);
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "cleared_before_at_user2" TIMESTAMP(3);
