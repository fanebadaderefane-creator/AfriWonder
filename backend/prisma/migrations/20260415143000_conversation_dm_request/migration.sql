-- DM « demandes de messages » (style TikTok) : acceptation + limite 3 messages côté initiateur
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "dm_request_pending_for_user_id" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "dm_request_initiator_id" TEXT;

CREATE INDEX IF NOT EXISTS "Conversation_dm_request_pending_for_user_id_idx" ON "Conversation"("dm_request_pending_for_user_id");
