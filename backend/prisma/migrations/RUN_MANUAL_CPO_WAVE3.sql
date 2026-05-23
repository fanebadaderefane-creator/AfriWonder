-- Migration manuelle CPO Wave 3 (compléments alignement 300+)
-- Exécuter après RUN_MANUAL_CPO_WAVE2.sql
-- node scripts/run-cpo-wave3-migration.js  OU  psql $DATABASE_URL -f prisma/migrations/RUN_MANUAL_CPO_WAVE3.sql

-- 1) Video: comment_visibility (CPO 2.42)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Video' AND column_name = 'comment_visibility') THEN
    ALTER TABLE "Video" ADD COLUMN "comment_visibility" TEXT NOT NULL DEFAULT 'everyone';
  END IF;
END $$;

-- 2) Like: type (réactions multiples CPO 2.44)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Like' AND column_name = 'type') THEN
    ALTER TABLE "Like" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'like';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Like_video_id_type_idx" ON "Like"("video_id", "type");

-- 3) PostPoll + PostPollVote (sondages feed CPO 2.20)
CREATE TABLE IF NOT EXISTS "PostPoll" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "options" JSONB NOT NULL,
  "ends_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostPoll_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PostPoll_post_id_key" UNIQUE ("post_id"),
  CONSTRAINT "PostPoll_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PostPoll_post_id_idx" ON "PostPoll"("post_id");

CREATE TABLE IF NOT EXISTS "PostPollVote" (
  "id" TEXT NOT NULL,
  "poll_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "option_index" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostPollVote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PostPollVote_poll_id_user_id_key" UNIQUE ("poll_id", "user_id"),
  CONSTRAINT "PostPollVote_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "PostPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PostPollVote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PostPollVote_poll_id_idx" ON "PostPollVote"("poll_id");
CREATE INDEX IF NOT EXISTS "PostPollVote_user_id_idx" ON "PostPollVote"("user_id");

-- 4) User: preferred_categories (CPO 1.32)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'preferred_categories') THEN
    ALTER TABLE "User" ADD COLUMN "preferred_categories" JSONB;
  END IF;
END $$;

-- 5) Conversation: muted_user1, muted_user2 (CPO 4.39)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Conversation' AND column_name = 'muted_user1') THEN
    ALTER TABLE "Conversation" ADD COLUMN "muted_user1" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Conversation' AND column_name = 'muted_user2') THEN
    ALTER TABLE "Conversation" ADD COLUMN "muted_user2" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
