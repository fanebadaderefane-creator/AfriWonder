-- Migration: Live Phase 2 - Premium Features
-- Ajout des fonctionnalités: Polls, Co-Hosting, Q&A (is_question/is_answered)

-- 1. Ajouter les champs Q&A dans LiveChat
ALTER TABLE "LiveChat" ADD COLUMN IF NOT EXISTS "is_question" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LiveChat" ADD COLUMN IF NOT EXISTS "is_answered" BOOLEAN NOT NULL DEFAULT false;

-- Index pour les questions
CREATE INDEX IF NOT EXISTS "LiveChat_is_question_idx" ON "LiveChat"("is_question");

-- 2. Créer la table LivePoll
CREATE TABLE IF NOT EXISTS "LivePoll" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "total_votes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    CONSTRAINT "LivePoll_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LivePoll_live_id_idx" ON "LivePoll"("live_id");
CREATE INDEX IF NOT EXISTS "LivePoll_creator_id_idx" ON "LivePoll"("creator_id");
CREATE INDEX IF NOT EXISTS "LivePoll_status_idx" ON "LivePoll"("status");

-- Foreign keys pour LivePoll
DO $$ BEGIN
 ALTER TABLE "LivePoll" ADD CONSTRAINT "LivePoll_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "LivePoll" ADD CONSTRAINT "LivePoll_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Créer la table LivePollVote
CREATE TABLE IF NOT EXISTS "LivePollVote" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "option_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LivePollVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LivePollVote_poll_id_user_id_key" ON "LivePollVote"("poll_id", "user_id");
CREATE INDEX IF NOT EXISTS "LivePollVote_poll_id_idx" ON "LivePollVote"("poll_id");
CREATE INDEX IF NOT EXISTS "LivePollVote_live_id_idx" ON "LivePollVote"("live_id");
CREATE INDEX IF NOT EXISTS "LivePollVote_user_id_idx" ON "LivePollVote"("user_id");

-- Foreign keys pour LivePollVote
DO $$ BEGIN
 ALTER TABLE "LivePollVote" ADD CONSTRAINT "LivePollVote_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "LivePoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "LivePollVote" ADD CONSTRAINT "LivePollVote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 4. Créer la table LiveCoHost
CREATE TABLE IF NOT EXISTS "LiveCoHost" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "cohost_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "removed_at" TIMESTAMP(3),
    CONSTRAINT "LiveCoHost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiveCoHost_live_id_cohost_id_key" ON "LiveCoHost"("live_id", "cohost_id");
CREATE INDEX IF NOT EXISTS "LiveCoHost_live_id_idx" ON "LiveCoHost"("live_id");
CREATE INDEX IF NOT EXISTS "LiveCoHost_creator_id_idx" ON "LiveCoHost"("creator_id");
CREATE INDEX IF NOT EXISTS "LiveCoHost_cohost_id_idx" ON "LiveCoHost"("cohost_id");
CREATE INDEX IF NOT EXISTS "LiveCoHost_status_idx" ON "LiveCoHost"("status");

-- Foreign keys pour LiveCoHost
DO $$ BEGIN
 ALTER TABLE "LiveCoHost" ADD CONSTRAINT "LiveCoHost_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "LiveCoHost" ADD CONSTRAINT "LiveCoHost_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "LiveCoHost" ADD CONSTRAINT "LiveCoHost_cohost_id_fkey" FOREIGN KEY ("cohost_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
