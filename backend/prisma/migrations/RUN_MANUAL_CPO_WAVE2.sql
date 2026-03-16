-- Migration manuelle CPO Wave 2 (alignement liste 300+)
-- Exécuter manuellement si la base n'a pas encore ces objets :
-- psql $DATABASE_URL -f prisma/migrations/RUN_MANUAL_CPO_WAVE2.sql
-- Ou exécuter chaque bloc séparément selon l'état de la base.

-- 1) Table FollowRequest (demande de suivi compte privé)
CREATE TABLE IF NOT EXISTS "FollowRequest" (
  "id" TEXT NOT NULL,
  "requester_id" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responded_at" TIMESTAMP(3),
  CONSTRAINT "FollowRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FollowRequest_requester_id_target_id_key" UNIQUE ("requester_id", "target_id"),
  CONSTRAINT "FollowRequest_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FollowRequest_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "FollowRequest_requester_id_idx" ON "FollowRequest"("requester_id");
CREATE INDEX IF NOT EXISTS "FollowRequest_target_id_idx" ON "FollowRequest"("target_id");
CREATE INDEX IF NOT EXISTS "FollowRequest_status_idx" ON "FollowRequest"("status");

-- 2) Table BannedWord (mots interdits commentaires)
CREATE TABLE IF NOT EXISTS "BannedWord" (
  "id" TEXT NOT NULL,
  "word" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BannedWord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BannedWord_word_key" UNIQUE ("word")
);
CREATE INDEX IF NOT EXISTS "BannedWord_word_idx" ON "BannedWord"("word");
CREATE INDEX IF NOT EXISTS "BannedWord_is_active_idx" ON "BannedWord"("is_active");

-- 3) Video: comments_disabled, hide_likes, scheduled_at (si colonnes absentes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Video' AND column_name = 'comments_disabled') THEN
    ALTER TABLE "Video" ADD COLUMN "comments_disabled" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Video' AND column_name = 'hide_likes') THEN
    ALTER TABLE "Video" ADD COLUMN "hide_likes" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Video' AND column_name = 'scheduled_at') THEN
    ALTER TABLE "Video" ADD COLUMN "scheduled_at" TIMESTAMP(3);
  END IF;
END $$;

-- 4) Comment: is_pinned
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Comment' AND column_name = 'is_pinned') THEN
    ALTER TABLE "Comment" ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 5) Conversation: draft_content, is_archived_user1, is_archived_user2
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Conversation' AND column_name = 'draft_content') THEN
    ALTER TABLE "Conversation" ADD COLUMN "draft_content" JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Conversation' AND column_name = 'is_archived_user1') THEN
    ALTER TABLE "Conversation" ADD COLUMN "is_archived_user1" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Conversation' AND column_name = 'is_archived_user2') THEN
    ALTER TABLE "Conversation" ADD COLUMN "is_archived_user2" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 6) Message: scheduled_at + index
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Message' AND column_name = 'scheduled_at') THEN
    ALTER TABLE "Message" ADD COLUMN "scheduled_at" TIMESTAMP(3);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Message_scheduled_at_idx" ON "Message"("scheduled_at");
