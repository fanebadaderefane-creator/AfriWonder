-- CDC Live complet
ALTER TABLE "LiveLike" ADD COLUMN IF NOT EXISTS "reaction_type" TEXT NOT NULL DEFAULT 'like';

CREATE TABLE IF NOT EXISTS "LiveReplayChapter" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_seconds" INTEGER NOT NULL,
    "end_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveReplayChapter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LiveReplayChapter_live_id_idx" ON "LiveReplayChapter"("live_id");
DO $$ BEGIN
 ALTER TABLE "LiveReplayChapter" ADD CONSTRAINT "LiveReplayChapter_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "LiveCreatorSubscription" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "subscriber_id" TEXT NOT NULL,
    "amount_fcfa" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_billing_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveCreatorSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LiveCreatorSubscription_creator_id_subscriber_id_key" ON "LiveCreatorSubscription"("creator_id", "subscriber_id");
DO $$ BEGIN
 ALTER TABLE "LiveCreatorSubscription" ADD CONSTRAINT "LiveCreatorSubscription_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "LiveCreatorSubscription" ADD CONSTRAINT "LiveCreatorSubscription_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "replay_premium" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "data_saver_mode" BOOLEAN NOT NULL DEFAULT false;
