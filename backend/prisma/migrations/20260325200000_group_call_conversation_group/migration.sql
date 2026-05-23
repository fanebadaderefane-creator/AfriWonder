-- Lien appel groupe ↔ conversation (socket group:call-ended / invites)
ALTER TABLE "GroupCall" ADD COLUMN "conversation_group_id" TEXT;

CREATE INDEX "GroupCall_conversation_group_id_idx" ON "GroupCall"("conversation_group_id");

ALTER TABLE "GroupCall" ADD CONSTRAINT "GroupCall_conversation_group_id_fkey" FOREIGN KEY ("conversation_group_id") REFERENCES "ConversationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
