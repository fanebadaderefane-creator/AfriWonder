-- Message épinglé en tête de groupe (équivalent 1:1)
ALTER TABLE "ConversationGroup" ADD COLUMN IF NOT EXISTS "pinned_message_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ConversationGroup_pinned_message_id_key" ON "ConversationGroup"("pinned_message_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ConversationGroup_pinned_message_id_fkey'
  ) THEN
    ALTER TABLE "ConversationGroup"
      ADD CONSTRAINT "ConversationGroup_pinned_message_id_fkey"
      FOREIGN KEY ("pinned_message_id") REFERENCES "GroupMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
