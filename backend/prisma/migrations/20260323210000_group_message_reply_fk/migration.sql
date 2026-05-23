-- Réponses en fil de discussion (groupe) : FK reply_to_id → GroupMessage
ALTER TABLE "GroupMessage"
ADD CONSTRAINT "GroupMessage_reply_to_id_fkey"
FOREIGN KEY ("reply_to_id") REFERENCES "GroupMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "GroupMessage_reply_to_id_idx" ON "GroupMessage"("reply_to_id");
