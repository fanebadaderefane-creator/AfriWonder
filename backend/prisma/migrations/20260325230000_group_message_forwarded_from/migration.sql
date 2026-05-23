ALTER TABLE "GroupMessage" ADD COLUMN IF NOT EXISTS "forwarded_from_message_id" TEXT;
CREATE INDEX IF NOT EXISTS "GroupMessage_sender_id_forwarded_from_message_id_idx" ON "GroupMessage"("sender_id", "forwarded_from_message_id");
