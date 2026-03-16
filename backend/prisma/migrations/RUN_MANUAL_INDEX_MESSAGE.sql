-- À exécuter manuellement dans Supabase (SQL Editor) si prisma migrate dev
-- signale un drift et que vous ne voulez pas faire "migrate reset" (évite la perte de données).
-- Index pour la pagination des messages par conversation (optimisation messagerie).
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON "Message"(conversation_id, created_at DESC);
