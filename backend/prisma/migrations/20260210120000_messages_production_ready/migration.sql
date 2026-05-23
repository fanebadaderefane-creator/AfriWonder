-- Conversation: add last_message_id, last_message_text, unread_count_map, is_group, group_name, group_avatar
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "last_message_id" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "last_message_text" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "unread_count_map" JSONB;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "is_group" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "group_name" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "group_avatar" TEXT;

-- Message: add new columns (keep message_type and is_read for backfill then drop)
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'text';
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'sent';
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "media_url" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "is_edited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "read_by" JSONB;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "reply_to_message_id" TEXT;

-- Backfill Message: copy message_type -> type, is_read -> status (if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Message' AND column_name = 'message_type') THEN
    UPDATE "Message" SET "type" = COALESCE("message_type", 'text');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Message' AND column_name = 'is_read') THEN
    UPDATE "Message" SET "status" = CASE WHEN "is_read" = true THEN 'read' ELSE 'sent' END;
  END IF;
END $$;

-- Drop old Message columns if they exist
ALTER TABLE "Message" DROP COLUMN IF EXISTS "message_type";
ALTER TABLE "Message" DROP COLUMN IF EXISTS "is_read";

-- Rename content to keep; ensure content exists (it's already there). No change needed for "content".

-- Add reply_to_message_id FK (ignore if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_reply_to_message_id_fkey') THEN
    ALTER TABLE "Message" ADD CONSTRAINT "Message_reply_to_message_id_fkey"
      FOREIGN KEY ("reply_to_message_id") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Create UserPresence
CREATE TABLE IF NOT EXISTS "UserPresence" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "is_online" BOOLEAN NOT NULL DEFAULT false,
  "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPresence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserPresence_user_id_key" ON "UserPresence"("user_id");
CREATE INDEX IF NOT EXISTS "UserPresence_user_id_idx" ON "UserPresence"("user_id");
CREATE INDEX IF NOT EXISTS "UserPresence_is_online_idx" ON "UserPresence"("is_online");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserPresence_user_id_fkey') THEN
    ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create UserBlock
CREATE TABLE IF NOT EXISTS "UserBlock" (
  "id" TEXT NOT NULL,
  "blocker_id" TEXT NOT NULL,
  "blocked_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserBlock_blocker_id_blocked_id_key" ON "UserBlock"("blocker_id", "blocked_id");
CREATE INDEX IF NOT EXISTS "UserBlock_blocker_id_idx" ON "UserBlock"("blocker_id");
CREATE INDEX IF NOT EXISTS "UserBlock_blocked_id_idx" ON "UserBlock"("blocked_id");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserBlock_blocker_id_fkey') THEN
    ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserBlock_blocked_id_fkey') THEN
    ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create MessageReport
CREATE TABLE IF NOT EXISTS "MessageReport" (
  "id" TEXT NOT NULL,
  "reporter_id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MessageReport_reporter_id_idx" ON "MessageReport"("reporter_id");
CREATE INDEX IF NOT EXISTS "MessageReport_message_id_idx" ON "MessageReport"("message_id");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MessageReport_reporter_id_fkey') THEN
    ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MessageReport_message_id_fkey') THEN
    ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Conversation index for last_message_at
CREATE INDEX IF NOT EXISTS "Conversation_last_message_at_idx" ON "Conversation"("last_message_at");

-- Message index for status
CREATE INDEX IF NOT EXISTS "Message_status_idx" ON "Message"("status");
